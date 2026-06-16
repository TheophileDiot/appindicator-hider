# AppIndicator Hider

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-46--50-4A86CF.svg)](metadata.json)

Hide the tray icons that keep shouting. Keep the ones that matter.

AppIndicator Hider is a small GNOME Shell extension that lets you hide selected AppIndicator and KStatusNotifier tray icons without disabling tray support entirely.

Use it when apps like NetBird, Proton VPN, or cloud sync tools still need tray support, but noisy indicators like Livepatch, launchers, chat apps, or background utilities do not deserve space in the top bar.

## Highlights

- Pick exactly which tray icons disappear
- Keep every other AppIndicator visible
- Toggle currently running indicators from preferences
- Add text or field-based matchers for apps that are not running yet
- Start clean: no bundled hidden icons, no opinionated defaults
- Configure from the GNOME Extensions settings button

## Install From Source

```bash
make install
```

Restart GNOME Shell:

- X11: press `Alt` + `F2`, type `r`, press `Enter`
- Wayland: log out and back in

Enable the extension:

```bash
gnome-extensions enable appindicator-hider@theophilediot.github.io
```

## Configure

Open GNOME Extensions and click the settings button for AppIndicator Hider.

You can also open preferences from the terminal:

```bash
gnome-extensions prefs appindicator-hider@theophilediot.github.io
```

Preferences can:

- show currently registered AppIndicator/KStatusNotifier items
- hide or show a live item with a switch
- add and remove custom matchers
- enable debug logging

AppIndicator Hider ships with an empty hidden list. Nothing disappears until you choose it.

## Matchers

Most users can use the preferences switches. For manual rules, matchers support these prefixes:

- `id:` AppIndicator ID
- `title:` AppIndicator title
- `unique:` computed unique ID
- `bus:` D-Bus bus name
- `path:` D-Bus object path
- `key:` GNOME Shell status area key
- `status:` AppIndicator status
- `command:` command line if exposed by the tray provider
- `wmclass:` legacy tray WM class
- `text:` any known field

Example:

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/appindicator-hider@theophilediot.github.io/schemas \
  set org.gnome.shell.extensions.appindicator-hider hidden-indicators \
  "['id:livepatch', 'title:Discord']"
```

Read current matchers:

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/appindicator-hider@theophilediot.github.io/schemas \
  get org.gnome.shell.extensions.appindicator-hider hidden-indicators
```

## Inspect Live Indicators

List registered StatusNotifier items:

```bash
busctl --user get-property org.kde.StatusNotifierWatcher \
  /StatusNotifierWatcher org.kde.StatusNotifierWatcher RegisteredStatusNotifierItems
```

Inspect a specific item:

```bash
busctl --user get-property :1.161 /org/ayatana/NotificationItem/livepatch org.kde.StatusNotifierItem Id
busctl --user get-property :1.161 /org/ayatana/NotificationItem/livepatch org.kde.StatusNotifierItem Title
```

## Package

```bash
make pack
```

The archive is written to:

```text
dist/appindicator-hider@theophilediot.github.io.shell-extension.zip
```

## Release

Source releases are tracked in [`VERSION`](VERSION) and Git tags such as `v0.1.0`. The GNOME Extensions website assigns its own internal version, so `metadata.json` intentionally does not contain a `version` key.

Use `dev` for regular integration work and `main` for release tags.

Run the release checks before tagging:

```bash
make release-check
```

See [`RELEASE.md`](RELEASE.md) for the full workflow and GNOME upload steps.

## License

MIT
