# Note Protection

Password-protect individual notes in your Obsidian vault. Unlike folder-level protection plugins, Note Protection lets you lock specific files — right-click any markdown file to protect it.

## Features

- **Per-file protection** — Right-click any markdown file to lock/unlock it. Only protected files require password verification.
- **Password security** — Passwords are stored as SHA-256 hashes using the Web Crypto API. No plaintext is ever saved.
- **Idle auto-lock** — Configurable timeout (in minutes) that automatically re-locks files after inactivity. Each file has its own independent timer.
- **Auto-lock on file switch** — Optionally re-lock the previous file when you navigate to a different note.
- **Tab close detection** — Closing a tab automatically revokes access to that file.
- **Cross-platform** — Works on both desktop and mobile using only Obsidian API and Web standard APIs.

## How to use

1. Open **Settings → Note Protection** and set your password.
2. Right-click any markdown file → **Encrypt** to protect it.
3. Opening a protected file will prompt for your password.
4. To permanently remove protection, right-click → **Decrypt** and enter your password.

## Settings

| Setting | Description |
|---------|-------------|
| Password | Set or change your global password |
| Idle auto-lock | Minutes of inactivity before files are re-locked (0 to disable) |
| Auto-encrypt on close | Re-lock the previous file when switching to another note |

## How it works

- Protection status is stored in each file's frontmatter (`protected: 'encrypted'`).
- Access is tracked in memory per session — restarting Obsidian requires re-verification.
- The plugin does **not** encrypt file contents. It prevents access through Obsidian's UI. Files remain readable via the filesystem.

## Development

```bash
npm install
npm run build
```

To run tests:

```bash
npm run test
```
