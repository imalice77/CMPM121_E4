import Phaser from "phaser";
import { HEIGHT, WIDTH } from "../actors.ts";
import { hud } from "../hud.ts";
import { Backdrop } from "./backdrop.ts";
import type { LaunchOptions, PlaySceneData } from "./data.ts";
import { fadeTo } from "./fade.ts";
import { SECTORS } from "../route.ts";

const IDLE_SECONDS = 8;

export class TitleScene extends Phaser.Scene {
  private options!: LaunchOptions;
  private backdrop!: Backdrop;
  private countdown!: Phaser.GameObjects.Text;
  private idle = 0;
  private leaving = false;

  constructor() {
    super("title");
  }

  init(data: LaunchOptions): void {
    this.options = data;
    this.idle = 0;
    this.leaving = false;
  }

  create(): void {
    this.backdrop = new Backdrop(this);

    hud.setMode("title");
    hud.setRoute(SECTORS.map((sector) => sector.name));
    hud.setSector(-1);
    hud.setBoss(null);
    hud.say("");

    const title = this.add.text(
      WIDTH / 2,
      HEIGHT * 0.34,
      "NEON\nWARDEN",
      {
        fontFamily: "Orbitron, Trebuchet MS, sans-serif",
        fontSize: "64px",
        fontStyle: "bold",
        align: "center",
        color: "#e8fdff",
      },
    ).setOrigin(0.5).setLineSpacing(-6);

    title.enableFilters();
    title.filters?.internal.addGlow(0x5ef2ff, 6, 0, 1);

    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.add.text(WIDTH / 2, HEIGHT * 0.62, "SPACE  launch", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ffe066",
    }).setOrigin(0.5);

    this.countdown = this.add.text(
      WIDTH / 2,
      HEIGHT * 0.68,
      "",
      {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8aa4c8",
      },
    ).setOrigin(0.5);

    this.input.keyboard?.on("keydown-SPACE", () => this.launch(false));

    this.cameras.main.fadeIn(400, 4, 2, 12);

    if (this.options.attract) {
      this.launch(true);
    }
  }

  override update(_time: number, delta: number): void {
    this.backdrop.scroll(delta);

    if (this.leaving) return;

    this.idle += delta / 1000;

    const left = Math.ceil(IDLE_SECONDS - this.idle);
    this.countdown.setText(`self-play demo in ${left}`);

    if (left <= 0) {
      this.launch(true);
    }
  }

  private launch(autoplay: boolean): void {
    if (this.leaving) return;

    this.leaving = true;

    const data: PlaySceneData = {
      autoplay,
      speed: this.options.speed,
      seed: this.options.seed,
      options: this.options,
    };

    fadeTo(this, "play", data);
  }
}
