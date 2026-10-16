# Markdown Viewer

View local Markdown files in Chrome, beautifully. Fully offline.

Open any `file:///C:/path/to/file.md` and it renders as a formatted page instead of raw text. Bad Windows paths like `C://Users/...` are converted to working `file:///` links automatically.

## Features

- Formatted rendering: headings, tables, lists, checkboxes, code blocks, quotes
- Dark / light mode with one click (follows your system by default)
- Table of contents + raw/rendered toggle
- `C://` path fixer, built into pages and the toolbar popup
- Zero dependencies, zero network — everything runs locally

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder
4. On the extension details page, enable **Allow access to file URLs**
5. Open a `.md` file via `file:///` — done

> Chrome blocks `file:///` links from `http(s)` pages by design. This extension only renders files you open directly — nothing is uploaded or shared.

## Project structure

```
manifest.json        Extension manifest (MV3)
src/
  content.js         Markdown parser + page renderer
  styles.css         Dark/light theme (injected on .md pages only)
  popup.html/js      Toolbar popup: C:// path converter
icons/               Toolbar icons (16/32/48/128 PNG)
assets/logo.svg      Logo source
```

## Test

After installing, open `test-sample.md` (kept local, not committed) via `file:///`.

## License

MIT — see [LICENSE](LICENSE).
