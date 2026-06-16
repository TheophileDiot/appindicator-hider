# AppIndicator Hider

GNOME Shell extension that hides selected AppIndicator/KStatusNotifier icons while leaving other tray icons visible.

Author: TheophileDiot
License: MIT
Repository: https://github.com/TheophileDiot/appindicator-hider

This is useful when Ubuntu AppIndicators must stay enabled for apps like NetBird or Proton VPN, but noisy indicators like Livepatch, Ulauncher, or Discord should stay hidden.

## Install From Source

```bash
make install
```

Then restart GNOME Shell on X11:

```text
Alt+F2, r, Enter
```

On Wayland, log out and back in.

Enable:

```bash
gnome-extensions enable appindicator-hider@theophilediot.github.io
```

## Package

```bash
make pack
```

The distributable archive is written to:

```text
dist/appindicator-hider@theophilediot.github.io.shell-extension.zip
```

## Configure

Open the preferences dialog from the settings icon in the GNOME Extensions app, or run:

```bash
gnome-extensions prefs appindicator-hider@theophilediot.github.io
```

The preferences dialog can:

- show the currently registered AppIndicator/StatusNotifier items
- hide or show a live item with a switch
- add or remove custom matchers
- enable debug logging

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/appindicator-hider@theophilediot.github.io/schemas \
  get org.gnome.shell.extensions.appindicator-hider hidden-indicators
```

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/appindicator-hider@theophilediot.github.io/schemas \
  set org.gnome.shell.extensions.appindicator-hider hidden-indicators \
  "['id:livepatch', 'title:Discord']"
```

Supported matcher prefixes:

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

## Inspect Live Indicator IDs

```bash
busctl --user get-property org.kde.StatusNotifierWatcher \
  /StatusNotifierWatcher org.kde.StatusNotifierWatcher RegisteredStatusNotifierItems
```

Then inspect a specific item:

```bash
busctl --user get-property :1.161 /org/ayatana/NotificationItem/livepatch org.kde.StatusNotifierItem Id
busctl --user get-property :1.161 /org/ayatana/NotificationItem/livepatch org.kde.StatusNotifierItem Title
```
