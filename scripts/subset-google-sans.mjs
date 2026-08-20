// One-off: subset the Google Sans variable font to Latin and write woff2.
//
// Regenerate the system font from the raw TTF (kept out of git) with:
//   npm i -D subset-font
//   node scripts/subset-google-sans.mjs
//   npm uninstall subset-font
import fs from "node:fs";
import subsetFont from "subset-font";

const input = "Google_Sans/GoogleSans-VariableFont_GRAD,opsz,wght.ttf";
const output = "public/fonts/google-sans-flex.woff2";

// Latin letters, digits, punctuation, and common Latin-1 accented characters.
const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
  " .,:;!?'\"()[]{}@#$%&*-+=/\\|<>~`^_…–—’‘“”•·" +
  "áàâäãåæéèêëíìîïóòôöõøúùûüñçýÿœ" +
  "ÁÀÂÄÃÅÆÉÈÊËÍÌÎÏÓÒÔÖÕØÚÙÛÜÑÇÝŸŒ";

const buf = fs.readFileSync(input);
const out = await subsetFont(buf, chars, { targetFormat: "woff2" });
fs.mkdirSync("public/fonts", { recursive: true });
fs.writeFileSync(output, out);
console.log(`Wrote ${output} (${(out.length / 1024).toFixed(1)} KB)`);
