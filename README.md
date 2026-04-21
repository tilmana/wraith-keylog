# wraith-keylog

> **Authorized use only.** This module is part of [Wraith](https://github.com), an educational security research tool. Do not use against systems without explicit permission. See the [LICENSE](../../LICENSE) for details.

Keyboard logger module for Wraith.

## What it does

- Captures `keydown`, `keyup`, and `blur` events from the hooked page
- Tracks currently pressed keys, total stroke count, and per-key frequency
- Records modifier state (alt, ctrl, shift, meta) and input target element
- Reconstructs typed text from keystroke sequences (handles Backspace, Enter, Tab)

## UI

- **Panel**: live keyboard visualization showing currently held keys, total stroke count, and recent key sequence
- **View**: frequency heatmap on a keyboard layout, reconstructed text with copy button, keystroke log table (time, key, code, modifiers, target), timeline replay with rAF-driven playback, and CSV/JSON export

## Capture

| Type | Event | Persist | Description |
|------|-------|---------|-------------|
| event | `keydown` | yes | `key`, `code`, `alt`, `ctrl`, `shift`, `meta`, `repeat`, `tag` (target element), `itype` (input type), `t` timestamp |
| event | `keyup` | yes | `code`, `t` timestamp |
| event | `blur` | no | `t` timestamp — clears pressed keys when focus leaves the page (ephemeral, live-only) |

## Commands

None.

## Install

Register in `server/src/index.ts` and `ui/src/main.tsx`. See the main Wraith README for details.
