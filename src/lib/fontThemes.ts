import type { FontThemeId } from "./types";

/**
 * Per-party display font "personalities". Each maps to a CSS variable defined by
 * the fonts loaded in the root layout (self-hosted at build via next/font).
 * `cssVar: null` means the clean system font (Google Sans → Geist) with no
 * override. Used by the Stage and the setup picker.
 */
export interface FontTheme {
  id: FontThemeId;
  label: string;
  description: string;
  cssVar: string | null;
}

export const FONT_THEMES: FontTheme[] = [
  {
    id: "system",
    label: "Clean",
    description: "Google Sans — crisp and modern.",
    cssVar: null,
  },
  {
    id: "playful",
    label: "Playful",
    description: "DynaPuff — bouncy and fun.",
    cssVar: "var(--font-playful)",
  },
  {
    id: "bold",
    label: "Bold",
    description: "Righteous — game-show energy.",
    cssVar: "var(--font-bold-display)",
  },
  {
    id: "elegant",
    label: "Elegant",
    description: "Playfair Display — classic celebration.",
    cssVar: "var(--font-elegant)",
  },
  {
    id: "handwritten",
    label: "Handwritten",
    description: "Pacifico — festive script.",
    cssVar: "var(--font-handwritten)",
  },
];

export function getFontTheme(id: FontThemeId | undefined): FontTheme {
  return FONT_THEMES.find((t) => t.id === (id ?? "system")) ?? FONT_THEMES[0];
}

/** CSS font-family value for a party's display text, or undefined for system. */
export function displayFontFamily(id: FontThemeId | undefined): string | undefined {
  return getFontTheme(id).cssVar ?? undefined;
}
