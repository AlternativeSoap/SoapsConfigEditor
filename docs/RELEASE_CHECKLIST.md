# Soaps Config Editor release notes

## How to test this version

1. Install Node.js if needed.
2. In the project folder, run `npm install` then `npm run dev`.
3. Open the app in Chrome or Edge.
4. Click Open Folder and select `plugins/MythicMobs/Packs`.
5. Edit a file, save it, and confirm a `.bak.<timestamp>` file appears beside it.
6. Create a mob and an item with the generators, then save.

## Checks

- `npm test`
- `npm run build`
- `npm run lint`
- Dark and light theme both stay readable.
- YAML with a broken indent shows a line number.
- Saving a file with parse errors asks for confirmation first.

## Limits

- Folder picking needs Chrome or Edge.
- This version is a local web app, not a Windows installer.
- A native desktop build can come later if we want a downloadable `.exe`.
