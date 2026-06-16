# AGENTS.md

Guidance for coding agents working in this repository.

## Project

This is a GNOME Shell extension for hiding selected AppIndicator/KStatusNotifier tray icons while leaving other tray icons visible.

## Repository Rules

- Never commit on behalf of the maintainer. Leave changes staged or unstaged for the maintainer to commit and sign.
- Keep changes tightly scoped to the extension, preferences UI, metadata, schemas, packaging, or documentation needed for the requested task.
- Prefer simple, readable GJS over broad abstractions.
- Do not add generated artifacts to source control. In particular, `schemas/gschemas.compiled` and extension ZIPs are build outputs.

## GNOME Extension Best Practices

- Follow the current GNOME Shell extension review guidance from the GJS guide.
- Keep `metadata.json` minimal and accurate. Do not set the `version` field manually; extensions.gnome.org owns it.
- The extension UUID must be globally unique, and the install directory must match that UUID exactly.
- Use the conventional schema namespace: `org.gnome.shell.extensions.*` with paths under `/org/gnome/shell/extensions/`.
- Track the schema XML source file. Compile schemas locally with `glib-compile-schemas` for install and packaging.
- Keep `extension.js` compatible with GNOME Shell 45+ ES modules.
- In `extension.js`, only create Shell-side state, signals, monkey patches, or GLib sources from `enable()`.
- In `disable()`, undo everything created in `enable()`: restore patched functions, disconnect signals, remove GLib sources, clear references, and restore hidden actors.
- Do not import GTK, Gdk, or Adwaita in `extension.js`; it runs inside the GNOME Shell process.
- Do not import Shell, St, Clutter, or Meta in `prefs.js`; preferences run in a separate GTK process.
- Use GTK4 and Adwaita for preferences, with imports such as `gi://Gtk?version=4.0` and `gi://Adw`.
- Avoid excessive logging. Gate diagnostic logs behind a setting.
- Do not include unrelated build scripts, generated files, unused media, or local-only files in the extension package.

## Validation

Before calling the project release-ready, run the relevant checks:

```bash
rtk glib-compile-schemas --strict schemas
rtk make pack
rtk unzip -l dist/appindicator-hider@theophilediot.github.io.shell-extension.zip
```

Confirm the package contains only extension runtime files such as:

- `extension.js`
- `prefs.js`
- `metadata.json`
- `schemas/org.gnome.shell.extensions.appindicator-hider.gschema.xml`

`gnome-extensions pack --schema` includes the schema XML in the ZIP. `schemas/gschemas.compiled` is a local generated file and should stay out of source control and release ZIPs.
