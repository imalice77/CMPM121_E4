import Phaser from "phaser";
import {
  type Actor,
  type Arena,
  Bullet,
  Enemy,
  type EnemyKind,
  Player,
  ShmupBoss,
  ShmupPowerUp,
  WIDTH,
} from "../actors.ts";
import { hud } from "../hud.ts";
import { AutoPilot, KeyboardPilot, type Pilot } from "../pilots.ts";
import { Rng } from "../rng.ts";
import { play } from "../sounds.ts";
import { TINTS } from "../textures.ts";
import { SECTORS, type Wave } from "../route.ts";
import { Backdrop } from "./backdrop.ts";
import type { CutsceneData, PlaySceneData, RunData } from "./data.ts";
import { fadeTo } from "./fade.ts";

const TICK_MS = 1000 / 60;
const START_LIVES = 3;
const BOSS_WARNING_TICKS = 200;
const VICTORY_TICKS = 180;

export class PlayScene extends Phaser.Scene implements Arena {
  rng!: Rng;
  player!: Player;
  now = 0;

  private run!: RunData;
  private pilot!: Pilot;
  private backdrop!: Backdrop;

  private enemies: Enemy[] = [];
  private shots: Bullet[] = [];
  private bullets: Bullet[] = [];
  private pickups: ShmupPowerUp[] = [];

  private sector = -1;
  private sectorStart = 0;
  private boss: ShmupBoss | null = null;
  private bossDueAt = 0;
  private victoryAt = 0;
  private gameOver = false;
  private carry = 0;

  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  private autoplay = false;
  private speed = 1;
  private seed = 121;
  private options!: PlaySceneData["options"];
  private leaving = false;

  constructor() {
    super("play");
  }

  init(data: PlaySceneData): void {
    this.autoplay = data.autoplay;
    this.speed = data.speed;
    this.seed = data.seed;
    this.options = data.options;

    this.leaving = false;

    // Reset all per-run state because Phaser reuses Scene instances.
    this.rng = new Rng(this.seed);
    this.now = 0;
    this.carry = 0;

    this.run = {
      score: 0,
      lives: START_LIVES,
      kills: 0,
      hits: 0,
      continues: 0,
      bossDefeated: false,
    };

    this.enemies = [];
    this.shots = [];
    this.bullets = [];
    this.pickups = [];

    this.sector = -1;
    this.sectorStart = 0;
    this.boss = null;
    this.bossDueAt = 0;
    this.victoryAt = 0;
    this.gameOver = false;
  }

  create(): void {
    this.backdrop = new Backdrop(this);

    this.input.keyboard?.on("keydown-SPACE", () => this.onSpace());

    this.player = new Player(this);
    this.player.enableFilters();
    this.player.filters?.internal.addGlow(TINTS.player, 4, 0, 1);

    this.add.particles(0, 0, "spark", {
      speedY: { min: 80, max: 160 },
      speedX: { min: -20, max: 20 },
      lifespan: 260,
      scale: { start: 0.9, end: 0 },
      tint: TINTS.player,
      blendMode: "ADD",
      frequency: 30,
    }).startFollow(this.player, 0, 18);

    this.sparks = this.add.particles(0, 0, "spark", {
      speed: { min: 60, max: 260 },
      lifespan: { min: 250, max: 600 },
      scale: { start: 1.4, end: 0 },
      blendMode: "ADD",
      emitting: false,
    });

    this.pilot = this.autoplay
      ? new AutoPilot()
      : new KeyboardPilot(this.input.keyboard!);

    hud.setMode(this.autoplay ? "attract" : "play");

    this.cameras.main.fadeIn(400, 4, 2, 12);

    this.startSector(0);
  }

  override update(_time: number, delta: number): void {
    this.backdrop.scroll(delta);

    if (this.leaving) return;

    const speed = this.autoplay ? this.speed : 1;

    this.carry += Math.min(delta, 250) * speed;

    while (this.carry >= TICK_MS && this.scene.isActive()) {
      this.carry -= TICK_MS;
      this.tick();
    }
  }

  private onSpace(): void {
    if (!this.autoplay || this.leaving) return;

    // Any key during the self-play demo returns to the title.
    this.leaving = true;
    fadeTo(this, "title", this.options);
  }

  // Arena: what actors may ask of the scene.

  fire(
    x: number,
    y: number,
    angle: number,
    speed: number,
    heavy = false,
  ): void {
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.bullets.push(
      heavy
        ? new Bullet(this, x, y, "heavy", 8, vx, vy)
        : new Bullet(this, x, y, "bullet", 5, vx, vy),
    );
  }

  summon(kind: EnemyKind, x: number, y: number): void {
    const enemy = new Enemy(
      this,
      x,
      y,
      kind,
      x,
      x < WIDTH / 2 ? 1 : -1,
    );

    this.enemies.push(enemy);
  }

  // One tick of gameplay.

  private tick(): void {
    this.now++;

    this.advanceRoute();
    this.updateProgression();

    if (!this.gameOver) this.flyPlayer();

    for (const enemy of this.enemies) {
      enemy.step(this);
    }

    for (const actor of [...this.shots, ...this.bullets, ...this.pickups]) {
      actor.step();
    }

    this.resolveHits();
    this.cull();
    this.refreshHud();
  }

  private flyPlayer(): void {
    const controls = this.pilot.read({
      player: this.player,
      enemies: this.enemies,
      threats: [...this.bullets, ...this.enemies],
      pickups: this.pickups,
    });

    for (const shot of this.player.step(controls)) {
      this.shots.push(
        new Bullet(this, shot.x, shot.y, "shot", 6, shot.vx, -11),
      );

      if (this.now % 2 === 0) play(this, "shoot", 0.25);
    }
  }

  private advanceRoute(): void {
    if (this.gameOver) return;

    if (this.victoryAt > 0) {
      if (this.now === this.victoryAt) {
        const data: CutsceneData = {
          run: { ...this.run },
          afterDemo: this.autoplay,
          options: this.options,
        };

        fadeTo(this, "cutscene", data);
      }

      return;
    }

    if (this.bossDueAt > 0) {
      if (this.now === this.bossDueAt) this.startBoss();
      return;
    }

    if (this.boss) return;

    const t = this.now - this.sectorStart;
    const currentSector = SECTORS[this.sector];

    if (
      currentSector &&
      this.sector < SECTORS.length - 1 &&
      t >= currentSector.length - 240 &&
      (this.enemies.length === 0 || t >= currentSector.length)
    ) {
      this.startSector(this.sector + 1);
    }
  }

  private startSector(index: number): void {
    this.sector = index;
    hud.setSector(index);
    this.sectorStart = this.now;

    const sector = SECTORS[index];

    if (index < SECTORS.length - 1) {
      hud.announce(
        `Sector ${index + 1}: ${sector.name}`,
        sector.subtitle,
      );
    } else {
      hud.announce("WARNING", sector.subtitle);
      hud.shudder(true);
      play(this, "warn", 0.6);
      this.bossDueAt = this.now + BOSS_WARNING_TICKS;
    }
  }

  /**
   * Spawn one enemy using the parameters from a wave in route.ts.
   * Each formation keeps the original wave's timing and spawn order.
   */
  private spawnWave(wave: Wave, t: number): void {
    const middle = (wave.count - 1) / 2;

    for (let i = 0; i < wave.count; i++) {
      let spawnAt: number;
      let x: number;
      let y = -30;

      switch (wave.formation) {
        case "line":
          spawnAt = wave.start;
          x = (wave.center ?? WIDTH / 2) + (i - middle) * 64;
          break;

        case "vee":
          spawnAt = wave.start + Math.abs(i - middle) * 10;
          x = (wave.center ?? WIDTH / 2) + (i - middle) * 44;
          break;

        case "column":
          spawnAt = wave.start + i * 24;
          x = wave.x ?? WIDTH / 2;
          break;

        case "pincer":
          spawnAt = wave.start + Math.floor(i / 2) * 30;
          x = i % 2 === 0 ? -30 : 510;
          y = 70 + Math.floor(i / 2) * 50;
          break;
      }

      if (t !== spawnAt) continue;

      const enemy = new Enemy(
        this,
        x,
        y,
        wave.kind,
        x,
        i % 2 === 0 ? 1 : -1,
      );

      this.enemies.push(enemy);
    }
  }

  private updateProgression(): void {
    const t = this.now - this.sectorStart;
    const currentSector = SECTORS[this.sector];

    if (!currentSector) return;

    for (const wave of currentSector.waves) {
      this.spawnWave(wave, t);
    }
  }

  private startBoss(): void {
    this.bossDueAt = 0;

    this.boss = new ShmupBoss(this);
    this.boss.enableFilters();
    this.boss.filters?.internal.addGlow(TINTS.boss, 4, 0, 1);

    this.enemies.push(this.boss);
    hud.setBoss(1);
  }

  private resolveHits(): void {
    for (const shot of this.shots) {
      const enemy = this.enemies.find((e) => e.active && e.touches(shot));

      if (!enemy) continue;

      shot.setActive(false);
      this.burst(shot.x, shot.y, 3, TINTS.spark);

      if (enemy.takeDamage(shot.damage)) {
        this.destroyEnemy(enemy);
      } else {
        play(this, "hit", 0.3);
      }
    }

    for (const bullet of this.bullets) {
      if (bullet.active && bullet.touches(this.player)) {
        bullet.setActive(false);
        this.hurtPlayer();
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.active || !enemy.touches(this.player)) continue;

      this.hurtPlayer();

      if (enemy !== this.boss && enemy.takeDamage(3)) {
        this.destroyEnemy(enemy);
      }
    }

    for (const pickup of this.pickups) {
      if (pickup.active && pickup.touches(this.player)) {
        pickup.setActive(false);
        this.player.collect(pickup.kind);
        play(this, "pickup", 0.6);
        this.burst(pickup.x, pickup.y, 14, TINTS.player);
      }
    }
  }

  private destroyEnemy(enemy: Enemy): void {
    enemy.setActive(false);

    this.run.score += enemy.score;
    this.run.kills++;

    if (enemy === this.boss) {
      this.defeatBoss(this.boss);
      return;
    }

    this.explode(enemy.x, enemy.y, 1);

    if (this.rng.chance(enemy.dropChance)) {
      const kind = this.player.power < 3 && this.rng.chance(0.5)
        ? "spread"
        : "shield";

      this.pickups.push(new ShmupPowerUp(this, enemy.x, enemy.y, kind));
    }
  }

  private hurtPlayer(): void {
    // After the Warden falls, nothing can hurt the ship during the victory lap.
    if (
      this.run.bossDefeated ||
      this.gameOver ||
      !this.player.vulnerable
    ) {
      return;
    }

    this.run.hits++;

    const lostLife = this.player.takeHit();

    hud.shudder(lostLife);
    this.cameras.main.shake(
      lostLife ? 260 : 120,
      lostLife ? 0.012 : 0.005,
    );

    play(this, "hurt", 0.7);
    this.burst(this.player.x, this.player.y, 24, TINTS.player);

    if (!lostLife) return;

    this.run.lives--;

    this.cameras.main.flash(180, 255, 80, 120);

    if (this.run.lives > 0) return;

    if (this.autoplay) {
      // The demo never ends early: self-play buys another ship and keeps going.
      this.run.continues++;
      this.run.lives = START_LIVES;
      return;
    }

    hud.announce("GAME OVER", "The lanes stay closed");

    this.gameOver = true;
    this.player.setVisible(false);
    this.player.bubble.setVisible(false);

    this.explode(this.player.x, this.player.y, 2);

    this.time.delayedCall(1800, () => {
      if (this.leaving) return;

      this.leaving = true;
      fadeTo(this, "title", this.options);
    });
  }

  private defeatBoss(boss: ShmupBoss): void {
    this.run.bossDefeated = true;
    this.victoryAt = this.now + VICTORY_TICKS;

    hud.setBoss(0);
    hud.announce("WARDEN DOWN", "The lanes are open");

    // The Warden's fall takes its bullets and escorts with it (no score).
    for (const bullet of this.bullets) {
      this.burst(bullet.x, bullet.y, 2, TINTS.spark);
      bullet.setActive(false);
    }

    for (const escort of this.enemies) {
      if (escort === boss || !escort.active) continue;

      this.explode(escort.x, escort.y, 1);
      escort.setActive(false);
    }

    console.info(
      `[self-play] seed=${this.seed} ticks=${this.now} score=${this.run.score}` +
        ` kills=${this.run.kills} hits=${this.run.hits} continues=${this.run.continues}`,
    );

    // A chain of blasts across the hull, then the big one.
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 140, () => {
        this.explode(
          boss.x + Phaser.Math.Between(-80, 80),
          boss.y + Phaser.Math.Between(-40, 40),
          1,
        );
      });
    }

    this.time.delayedCall(1200, () => {
      this.explode(boss.x, boss.y, 3);
      this.cameras.main.flash(400, 255, 230, 160);
      hud.shudder(true);
      play(this, "bigboom", 0.9);

      boss.setVisible(false);
      boss.core.setVisible(false);
    });
  }

  private explode(x: number, y: number, size: number): void {
    this.burst(
      x,
      y,
      18 * size,
      size > 1 ? TINTS.bossCore : TINTS.spark,
    );

    const ring = this.add.image(x, y, "ring").setBlendMode(
      Phaser.BlendModes.ADD,
    );

    ring.setScale(0.2 * size);

    this.tweens.add({
      targets: ring,
      scale: 1.2 * size,
      alpha: 0,
      duration: 380 + 120 * size,
      ease: "Cubic.out",
      onComplete: () => ring.destroy(),
    });

    this.cameras.main.shake(90 * size, 0.004 * size);

    play(this, size > 1 ? "bigboom" : "boom", 0.5);
  }

  private burst(x: number, y: number, count: number, tint: number): void {
    this.sparks.particleTint = tint;
    this.sparks.explode(count, x, y);
  }

  /** Destroys spent and offscreen actors. */
  private cull(): void {
    const spent = (actor: Actor) => !actor.active || actor.isOffscreen();

    this.shots = sweep(this.shots, spent);
    this.bullets = sweep(this.bullets, spent);
    this.pickups = sweep(this.pickups, spent);

    // The defeated Warden stays on screen for its finale: drop it undestroyed.
    this.enemies = this.enemies.filter((e) => e.active || e !== this.boss);

    this.enemies = sweep(
      this.enemies,
      (e) => !e.active || (e.age > 30 && e.isOffscreen()),
    );
  }

  private refreshHud(): void {
    hud.setScore(this.run.score);
    hud.setLives(this.run.lives);
    hud.setPower(this.player.power);

    if (this.boss && !this.run.bossDefeated) {
      hud.setBoss(this.boss.fraction);
    }
  }
}

function sweep<T extends Actor>(
  actors: T[],
  gone: (actor: Actor) => boolean,
): T[] {
  return actors.filter((actor) => {
    if (!gone(actor)) return true;

    actor.destroy();
    return false;
  });
}
