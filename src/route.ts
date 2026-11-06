export type Formation = "line" | "vee" | "column" | "pincer";

export interface Wave {
  start: number;
  kind: "drone" | "dart" | "turret" | "lancer";
  count: number;
  formation: Formation;
  center?: number;
  x?: number;
}

export interface Sector {
  name: string;
  subtitle: string;
  length: number;
  waves: Wave[];
}

export const SECTORS: Sector[] = [
  {
    name: "Outer Drift",
    subtitle: "Scouts ahead",
    length: 1800,
    waves: [
      { start: 60, kind: "drone", count: 4, formation: "line", center: 240 },
      { start: 360, kind: "drone", count: 5, formation: "vee", center: 168 },
      { start: 660, kind: "drone", count: 5, formation: "vee", center: 312 },
      { start: 960, kind: "drone", count: 6, formation: "line", center: 240 },
      { start: 1200, kind: "drone", count: 4, formation: "column", x: 120 },
      { start: 1260, kind: "drone", count: 4, formation: "column", x: 360 },
    ],
  },
  {
    name: "Shatter Belt",
    subtitle: "Divers incoming",
    length: 2040,
    waves: [
      { start: 60, kind: "drone", count: 6, formation: "vee", center: 240 },
      { start: 300, kind: "dart", count: 4, formation: "line", center: 240 },
      { start: 600, kind: "dart", count: 5, formation: "column", x: 144 },
      { start: 720, kind: "dart", count: 5, formation: "column", x: 336 },
      { start: 1020, kind: "drone", count: 7, formation: "line", center: 240 },
      { start: 1140, kind: "dart", count: 5, formation: "vee", center: 240 },
      { start: 1440, kind: "dart", count: 6, formation: "line", center: 240 },
    ],
  },
  {
    name: "Gun Lanes",
    subtitle: "Turrets online",
    length: 2160,
    waves: [
      { start: 60, kind: "turret", count: 1, formation: "line", center: 240 },
      { start: 240, kind: "drone", count: 6, formation: "vee", center: 240 },
      { start: 540, kind: "turret", count: 2, formation: "line", center: 240 },
      { start: 840, kind: "dart", count: 6, formation: "column", x: 240 },
      { start: 1080, kind: "turret", count: 2, formation: "line", center: 240 },
      { start: 1140, kind: "drone", count: 6, formation: "line", center: 240 },
      { start: 1500, kind: "turret", count: 3, formation: "line", center: 240 },
    ],
  },
  {
    name: "Lancer Gate",
    subtitle: "Crossfire",
    length: 2160,
    waves: [
      { start: 60, kind: "lancer", count: 4, formation: "pincer" },
      { start: 360, kind: "dart", count: 6, formation: "vee", center: 240 },
      { start: 600, kind: "lancer", count: 6, formation: "pincer" },
      { start: 780, kind: "turret", count: 2, formation: "line", center: 240 },
      { start: 1140, kind: "lancer", count: 6, formation: "pincer" },
      { start: 1260, kind: "drone", count: 8, formation: "vee", center: 240 },
      { start: 1560, kind: "dart", count: 8, formation: "line", center: 240 },
    ],
  },
  {
    name: "Last Approach",
    subtitle: "Everything they have",
    length: 2280,
    waves: [
      { start: 60, kind: "turret", count: 3, formation: "line", center: 240 },
      { start: 180, kind: "lancer", count: 6, formation: "pincer" },
      { start: 540, kind: "dart", count: 6, formation: "column", x: 120 },
      { start: 540, kind: "dart", count: 6, formation: "column", x: 360 },
      { start: 900, kind: "drone", count: 9, formation: "vee", center: 240 },
      { start: 1020, kind: "turret", count: 2, formation: "line", center: 240 },
      { start: 1320, kind: "lancer", count: 8, formation: "pincer" },
      { start: 1560, kind: "dart", count: 8, formation: "vee", center: 240 },
    ],
  },
  {
    name: "The Warden",
    subtitle: "The Warden approaches",
    length: 0,
    waves: [],
  },
];
