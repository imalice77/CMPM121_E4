import Phaser from "phaser";

const fadingScenes = new WeakSet<Phaser.Scene>();

/** Fade out once, then start another scene with its data. */
export function fadeTo(
  scene: Phaser.Scene,
  target: string,
  data: object = {},
): void {
  if (fadingScenes.has(scene)) return;

  fadingScenes.add(scene);

  scene.cameras.main.fadeOut(450, 4, 2, 12);

  scene.cameras.main.once("camerafadeoutcomplete", () => {
    fadingScenes.delete(scene);
    scene.scene.start(target, data);
  });
}
