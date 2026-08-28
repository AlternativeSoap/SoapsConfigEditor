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

## GitHub Pages

The live site is at https://editor.soapsuniverse.com/ (also https://www.editor.soapsuniverse.com/ once DNS is set).

In the repo **Settings → Pages**, set **Source** to **GitHub Actions**. Keep it on Actions (not “Deploy from a branch” from the repo root). The root `index.html` is for local Vite only and will break on Pages if published as-is.

Under **Custom domain**, enter `editor.soapsuniverse.com`. GitHub allows one domain in the repo `CNAME` file; point `www.editor.soapsuniverse.com` at GitHub Pages in your DNS provider as well (see below).

Pushes to `main` build the site and publish it automatically.

### DNS (SoapsUniverse)

At your DNS host for `soapsuniverse.com`:

| Host | Type | Value |
|------|------|-------|
| `editor` | A | `185.199.108.153` |
| `editor` | A | `185.199.109.153` |
| `editor` | A | `185.199.110.153` |
| `editor` | A | `185.199.111.153` |
| `www.editor` | CNAME | `alternativesoap.github.io` |

After DNS propagates, enable **Enforce HTTPS** on the Pages settings page.

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
