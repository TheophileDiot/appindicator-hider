# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GNOME Shell extension (GJS / ES modules) that selectively hides AppIndicator / KStatusNotifier
tray icons while leaving the rest of the top bar visible. Supports GNOME Shell 46–50. There is
**no test framework and no lint/format config** — `make release-check` is the validation gate.

## Commands

```bash
make install        # compile schemas + copy to ~/.local/share/gnome-shell/extensions/appindicator-hider@theophilediot.github.io/
make uninstall      # remove the installed extension
make pack           # build dist/appindicator-hider@theophilediot.github.io.shell-extension.zip via `gnome-extensions pack`
make schemas        # glib-compile-schemas --strict schemas
make release-check  # pack, then assert UUID matches, no `version` key in metadata.json, VERSION non-empty, and `unzip -l` the zip
make clean          # remove dist/ and schemas/gschemas.compiled
```

Enable and open preferences:

```bash
gnome-extensions enable appindicator-hider@theophilediot.github.io
gnome-extensions prefs  appindicator-hider@theophilediot.github.io
```

Reload the shell to test a change: X11 → `Alt+F2`, type `r`, Enter. Wayland → log out and back in.

Inspect currently-running tray indicators over D-Bus:

```bash
busctl --user get-property org.kde.StatusNotifierWatcher \
  /StatusNotifierWatcher org.kde.StatusNotifierWatcher RegisteredStatusNotifierItems
```

## Architecture

The extension runs as **two separate processes with a hard boundary**, communicating only
through GSettings:

- **`extension.js`** runs inside the GNOME Shell process. St / Clutter / Meta / Shell are
  available; **never** import GTK, Gdk, or Adw here.
- **`prefs.js`** runs in a separate GTK4 process. Gtk / Adw are available; **never** import
  Shell, St, Clutter, or Meta here.

**GSettings is the shared contract** (`schemas/org.gnome.shell.extensions.appindicator-hider.gschema.xml`):

- `hidden-indicators` (`as`, default `[]`) — array of matcher strings.
- `debug-logging` (`b`, default `false`) — gates diagnostic logging in the shell.

**Matcher language** — each entry in `hidden-indicators` is a prefixed string:
`id:`, `title:`, `unique:`, `bus:`, `path:`, `key:`, `status:`, `command:`, `wmclass:`, `text:`
(bare `text:` searches all known fields).

**`extension.js` flow**: `enable()` monkey-patches the panel's add-to-status-area to intercept
new indicators, connects settings listeners, then runs `_sync()`. `_sync()` scans the status
area, `_collectFacts()` per indicator, checks `_matchesHiddenIndicator()` against the list, and
calls `_hideActor()` / `_showActor()`. State is tracked in `_hiddenActors`, `_actorSignals`, and
`_timeoutIds`. `disable()` must undo everything `enable()` created: restore the patch, disconnect
signals, clear timers, and unhide actors.

**`prefs.js` flow**: builds an Adwaita preferences window — queries D-Bus
(`org.kde.StatusNotifierWatcher`) to list running indicators as live toggle rows, plus groups
for saved matchers, manual add, and the debug toggle.

**Critical duplication**: `_matchesHiddenIndicator()` and the matcher field set are implemented
identically in `extension.js` and `prefs.js`. Changing matcher semantics means editing **both**
files plus the schema `<description>`.

## Release & versioning

- `metadata.json` intentionally has **no `version` key** — extensions.gnome.org owns it. The
  source version lives in `VERSION` (currently `0.1.1`); git tags use `v$(cat VERSION)`.
- Branch model: `dev` = integration, `main` = release. Tags are cut from reviewed `main`.
- `.github/workflows/release.yml`: package (every push/PR) → GitHub Release (on tags) → GNOME
  upload (on tags, opt-in via `GNOME_EXTENSIONS_UPLOAD_ENABLED=true` + a protected
  `GNOME_EXTENSIONS_TOKEN` environment secret).
- Never commit generated artifacts: `schemas/gschemas.compiled` and `dist/`.
- Standing repo rule: leave changes staged/unstaged — do not commit on the maintainer's behalf.

## More detail

See `AGENTS.md` for the full agent rules and GNOME extension best practices, and
`CONTRIBUTING.md`, `SECURITY.md`, and `RELEASE.md` for contribution and release workflow detail.
