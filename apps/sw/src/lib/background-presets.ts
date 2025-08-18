export interface BackgroundPreset {
  id: string;
  name: string;
  imagePath: string;
  overlayColor: string;
  overlayOpacity: number;
  blurAmount: string;
  glass3d: {
    filterBlur: string;
    filterBrightness: number;
    filterSaturate: number;
    backgroundColor: string;
    shadowIntensity: number;
  };
}

export type PresetId =
  | "blue"
  | "green"
  | "light-blue"
  | "multi"
  | "orange"
  | "purple";

export const backgroundPresets = {
  blue: {
    id: "blue",
    name: "Ocean Blue",
    imagePath: "/color-bg/blue.png",
    overlayColor: "bg-blue-500/20",
    overlayOpacity: 0.3,
    blurAmount: "backdrop-blur-3xl",
    glass3d: {
      filterBlur: "58px",
      filterBrightness: 0.8,
      filterSaturate: 4,
      backgroundColor: "hsl(210 100% 95% / 0.9)",
      shadowIntensity: 1,
    },
  },
  green: {
    id: "green",
    name: "Forest Green",
    imagePath: "/color-bg/green.png",
    overlayColor: "bg-green-500/15",
    overlayOpacity: 0.25,
    blurAmount: "backdrop-blur-2xl",
    glass3d: {
      filterBlur: "45px",
      filterBrightness: 0.75,
      filterSaturate: 6,
      backgroundColor: "hsl(120 60% 90% / 0.85)",
      shadowIntensity: 0.8,
    },
  },
  "light-blue": {
    id: "light-blue",
    name: "Sky Light",
    imagePath: "/color-bg/light-blue.png",
    overlayColor: "bg-sky-300/10",
    overlayOpacity: 0.2,
    blurAmount: "backdrop-blur-xl",
    glass3d: {
      filterBlur: "40px",
      filterBrightness: 0.9,
      filterSaturate: 3,
      backgroundColor: "hsl(200 100% 98% / 0.95)",
      shadowIntensity: 0.6,
    },
  },
  multi: {
    id: "multi",
    name: "Prismatic",
    imagePath: "/color-bg/multi.png",
    overlayColor: "bg-purple-400/15",
    overlayOpacity: 0.35,
    blurAmount: "backdrop-blur-3xl",
    glass3d: {
      filterBlur: "65px",
      filterBrightness: 0.7,
      filterSaturate: 8,
      backgroundColor: "hsl(280 50% 95% / 0.8)",
      shadowIntensity: 1.2,
    },
  },
  orange: {
    id: "orange",
    name: "Sunset Orange",
    imagePath: "/color-bg/orange.png",
    overlayColor: "bg-orange-400/20",
    overlayOpacity: 0.3,
    blurAmount: "backdrop-blur-3xl",
    glass3d: {
      filterBlur: "58px",
      filterBrightness: 0.75,
      filterSaturate: 5,
      backgroundColor: "hsl(30 100% 95% / 0.85)",
      shadowIntensity: 1,
    },
  },
  purple: {
    id: "purple",
    name: "Royal Purple",
    imagePath: "/color-bg/purple.png",
    overlayColor: "bg-purple-500/25",
    overlayOpacity: 0.35,
    blurAmount: "backdrop-blur-3xl",
    glass3d: {
      filterBlur: "60px",
      filterBrightness: 0.7,
      filterSaturate: 7,
      backgroundColor: "hsl(270 80% 95% / 0.8)",
      shadowIntensity: 1.1,
    },
  },
} as const satisfies Record<PresetId, BackgroundPreset>;

export const presetIds = Object.keys(backgroundPresets) as PresetId[];
export const presetArray = Object.values(backgroundPresets);

export const defaultPresetId: PresetId = "orange";

export function isValidPresetId(id: string): id is PresetId {
  return id in backgroundPresets;
}
