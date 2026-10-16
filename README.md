# Markdown Viewer (Local File) — Chrome compatible

## Install (no store, suitable for a work environment)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** ← select this folder
4. On the extension details page enable **Allow access to file URLs** (required for `file:///` files)
5. Open any file like `file:///C:/path/to/file.md` — it renders formatted

## Path fixer
- Any `C://Users/...` text inside a file is automatically converted to `file:///C:/Users/...`
- From the extension icon (popup) paste a bad path → convert → open/copy

## Project files
- `manifest.json` — MV3
- `content.js` — lightweight dependency-free Markdown parser (works offline on `file://`)
- `styles.css` — dark/light + tables + code
- `popup.html/js` — `C://` converter
- `logo.svg` + `icons/` — logo and toolbar icons
- `test-sample.md` — test file

## Test
Open `test-sample.md` via `file:///` after installing.
