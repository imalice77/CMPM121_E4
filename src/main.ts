import Phaser from "phaser";
import { HEIGHT, WIDTH } from "./actors.ts";
import { BootScene } from "./scenes/boot.ts";
import { CutsceneScene } from "./scenes/cutscene.ts";
import { PlayScene } from "./scenes/play.ts";
import { TitleScene } from "./scenes/title.ts";
import "./style.css";

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#04020c",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    TitleScene,
    PlayScene,
    CutsceneScene,
  ],
});
