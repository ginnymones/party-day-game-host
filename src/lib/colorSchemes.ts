import type { ColorSchemeId } from "./types";

/**
 * Color schemes the game master can pick per party. Each provides CSS custom
 * property overrides that are applied to a scoped container, so switching is
 * instant and does not touch global theme tokens.
 *
 * Values are space-separated RGB triplets to match the `rgb(var(--x))` pattern
 * used across the app.
 */
export interface Scheme {
  id: ColorSchemeId;
  label: string;
  /** Small swatch colors for the picker UI. */
  swatch: [string, string, string];
  vars: Record<string, string>;
}

export const COLOR_SCHEMES: Scheme[] = [
  {
    id: "primary",
    label: "Signature",
    swatch: ["#3E47E7", "#6970EB", "#FAF9F7"],
    vars: {
      "--accent": "105 112 235",
      "--button": "62 71 231",
      "--stage-from": "237 238 253",
      "--stage-to": "250 249 247",
      "--stage-ink": "17 17 17",
    },
  },
  {
    id: "pastel",
    label: "Pastel",
    swatch: ["#F4A8C4", "#A8D8F4", "#FFF7FB"],
    vars: {
      "--accent": "225 130 170",
      "--button": "196 92 140",
      "--stage-from": "255 240 247",
      "--stage-to": "236 246 255",
      "--stage-ink": "60 40 55",
    },
  },
  {
    id: "autumn",
    label: "Autumn",
    swatch: ["#E47927", "#B4431F", "#FBF3EA"],
    vars: {
      "--accent": "204 96 40",
      "--button": "168 64 28",
      "--stage-from": "251 238 224",
      "--stage-to": "245 224 205",
      "--stage-ink": "58 34 20",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    swatch: ["#0E7C86", "#14B8C4", "#EAFBFC"],
    vars: {
      "--accent": "20 160 175",
      "--button": "14 110 122",
      "--stage-from": "224 248 250",
      "--stage-to": "210 240 244",
      "--stage-ink": "10 46 52",
    },
  },
  {
    id: "berry",
    label: "Berry",
    swatch: ["#8B2C6B", "#C13B8E", "#FBEEF6"],
    vars: {
      "--accent": "180 60 130",
      "--button": "139 44 107",
      "--stage-from": "250 232 244",
      "--stage-to": "244 216 236",
      "--stage-ink": "56 20 46",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    swatch: ["#5C65F0", "#8A90F5", "#0F1020"],
    vars: {
      "--accent": "138 144 245",
      "--button": "92 101 240",
      "--stage-from": "26 28 51",
      "--stage-to": "15 16 32",
      "--stage-ink": "240 241 250",
    },
  },
];

export function getScheme(id: ColorSchemeId): Scheme {
  return COLOR_SCHEMES.find((s) => s.id === id) ?? COLOR_SCHEMES[0];
}

/** Turn a scheme's vars into an inline style object for a scoped container. */
export function schemeStyle(id: ColorSchemeId): React.CSSProperties {
  return getScheme(id).vars as React.CSSProperties;
}
