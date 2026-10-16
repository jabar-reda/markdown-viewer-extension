# Markdown Viewer

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.0-green.svg)](manifest.json)
[![Chrome](https://img.shields.io/badge/Chrome-120%2B-orange.svg)](https://www.google.com/chrome/)
[![Manifest](https://img.shields.io/badge/Manifest-V3-lightgrey.svg)](https://developer.chrome.com/docs/extensions/develop/manifest)

**View local Markdown files in Chrome, beautifully. Fully offline.**

Chrome shows `.md` files opened via `file:///` as raw text. This extension renders them as formatted pages instead — headings, tables, code, dark/light mode — and fixes malformed Windows paths like `C://Users/...`. No server, no network, no dependencies.

## Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Usage](#usage)
- [Features](#features)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

- Google Chrome 120 or newer (desktop)
- Permission to enable Developer mode in `chrome://extensions` (work laptops with locked-down IT policies may block this)

## Install

1. Clone or download this repository:
   ```sh
   git clone https://github.com/jabar-reda/markdown-viewer-extension.git
   ```
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the repository folder
5. On the extension details page, enable **Allow access to file URLs**

Verify: open any local file such as `file:///C:/notes/todo.md` — it should render formatted instead of raw text.

## Usage

**Render a file.** Open any `.md`, `.markdown`, `.mdown`, or `.mkd` file directly via `file:///`. You get a header bar (filename, theme toggle, live-reload toggle, raw/rendered toggle) plus an auto-built table of contents from the headings.

**Live reload.** The page re-checks the file every 2 seconds and re-renders on change — edit in your editor and watch the tab update, scroll position kept. Pause it from the `Live: On` button; polling stops automatically while the tab is hidden.

**Copy code.** Every code block has a **Copy** button (top right, on hover) with a `Copied` confirmation.

**Fix a bad path.** Click the extension icon in the toolbar, paste a path, and convert it:

| You paste | You get |
|---|---|
| `C://Users/jabar/notes.md` | `file:///C:/Users/jabar/notes.md` |
| `C:\Users\jabar\notes.md` | `file:///C:/Users/jabar/notes.md` |

Then **Open** it in a tab or **Copy** the fixed link. Paths inside rendered files are converted automatically too.

## Features

- Formatted rendering: headings, tables, lists, checkboxes, fenced code (including indented fences inside lists), quotes, frontmatter stripping
- Dark / light mode, follows your OS setting, one-click toggle, persisted
- Live reload (2s poll, pausable, pauses in hidden tabs)
- Copy button on every code block
- `C://` and `C:\` path fixing, in pages and in the popup
- Zero dependencies and zero network calls — safe for sensitive local files

## Project Structure

```
manifest.json        Extension manifest (MV3)
src/
  content.js         Markdown parser + page renderer
  styles.css         Dark/light theme (injected on .md pages only)
  popup.html/js      Toolbar popup: C:// path converter
icons/               Toolbar icons, 16/32/48/128 PNG (Chrome needs raster)
assets/logo.svg      Logo source (8-unit grid master)
```

> [!NOTE]
> `src/styles.css` is injected at runtime, never via the manifest — global CSS would break Chrome's `file:///` directory-listing pages.

## Troubleshooting

**File still shows raw text.** The #1 cause: **Allow access to file URLs** is off. Go to `chrome://extensions` → Details on this extension → enable it → reload the file tab.

**Folder pages look wrong.** The extension only activates on Markdown files and pages shaped like raw-text files. If a directory listing ever looks broken, reload it — no extension CSS applies there.

**`file:///` link won't open from a website.** That is Chrome protecting you, not a bug: web pages (`http/https`) are blocked from opening local files. Open the file directly instead.

**Work laptop blocks Developer mode.** Sideloading needs it. Alternative without any extension: open the file in VS Code and press `Ctrl+Shift+V` for preview.

## Contributing

Issues and pull requests are welcome. There is no build step — edit, then verify with:

```sh
node --check src/content.js && node --check src/popup.js
```

and reload the extension to test on a real `.md` file **and** a directory listing.

## License

MIT — see [LICENSE](LICENSE).
