export interface LaunchOptions {
  attract: boolean;
  speed: number;
  seed: number;
}

export interface RunData {
  score: number;
  lives: number;
  kills: number;
  hits: number;
  continues: number;
  bossDefeated: boolean;
}

export interface PlaySceneData {
  autoplay: boolean;
  speed: number;
  seed: number;
  options: LaunchOptions;
}

export interface CutsceneData {
  run: RunData;
  afterDemo: boolean;
  options: LaunchOptions;
}

/** Read the optional self-play settings from the URL. */
export function readLaunchOptions(): LaunchOptions {
  const params = new URLSearchParams(location.search);

  return {
    attract: params.has("attract"),
    speed: Math.min(
      8,
      Math.max(1, Number(params.get("speed") ?? 1) || 1),
    ),
    seed: Number(params.get("seed") ?? 121) || 121,
  };
}
