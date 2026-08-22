# Soaps Config Editor

A YAML editor that runs in Chrome or Edge. Open a folder on your computer, edit `.yml` files, and save them back to disk. MythicMobs packs are the first workflow.

This is a local web app. You do not need Visual Studio, Rust, or an installer to use it.

## How to run it

Works in Chrome, Edge, Brave, and Firefox.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`) in Chrome, Edge, Brave, or Firefox. Do not use Cursor's built-in preview if folder picking fails. Open the URL in a real browser.

1. Click **Open Folder**.
2. Choose your MythicMobs `Packs` folder, or any folder of YAML files.
3. Allow edit access when the browser asks.
4. Select a file, edit it, then click **Save File**.

## What it does

- Loads `.yml` and `.yaml` files from the folder you pick.
- Groups MythicMobs files by pack and category (mobs, items, skills, drop tables, random spawns, menus).
- Shows YAML parse errors with line numbers before you save.
- Creates a timestamped `.bak` copy next to the file when you save.
- Searches paths, IDs, and file text.
- Builds a starter mob or item YAML snippet, with a duplicate-ID check.
- Lists mobs that point at skill IDs that are not in the loaded files.
- Remembers light or dark theme.

## Tests

```bash
npm test
```

## Brand assets

- `assets/branding/logo-dark.svg`
- `assets/branding/logo-light.svg`
- `public/favicon.svg`
