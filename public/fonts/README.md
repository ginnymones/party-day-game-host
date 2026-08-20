# Fonts

## Google Sans Flex (system font)

The app's system/UI font is **Google Sans Flex**. It's self-hosted for offline
use. To enable it:

1. Download the family from Google Fonts:
   https://fonts.google.com/specimen/Google+Sans (use the "Get font" / download
   button). Google open-sourced it in November 2025 under the SIL Open Font
   License.
2. Convert/export a variable **woff2** if needed, and save it in this folder as:

   ```
   public/fonts/google-sans-flex.woff2
   ```

That's it — no code change needed. The `@font-face` in `globals.css` already
points here, and the app falls back to Geist until the file is present.

The playful/bold/elegant/handwritten display fonts (DynaPuff, Righteous, Playfair
Display, Pacifico) are self-hosted automatically at build time via `next/font`,
so nothing needs to be added for those.
