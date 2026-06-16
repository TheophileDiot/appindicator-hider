UUID = appindicator-hider@theophilediot.github.io
SCHEMA = org.gnome.shell.extensions.appindicator-hider
SCHEMA_FILE = schemas/$(SCHEMA).gschema.xml
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
DIST_DIR = dist
ZIP = $(DIST_DIR)/$(UUID).shell-extension.zip

.PHONY: all schemas install uninstall pack release-check clean

all: schemas

schemas:
	glib-compile-schemas --strict schemas

install: schemas
	mkdir -p "$(INSTALL_DIR)"
	cp -r extension.js prefs.js metadata.json schemas "$(INSTALL_DIR)/"

uninstall:
	rm -rf "$(INSTALL_DIR)"

pack: schemas
	mkdir -p "$(DIST_DIR)"
	gnome-extensions pack --force --out-dir "$(DIST_DIR)" --schema "$(SCHEMA_FILE)" .

release-check:
	$(MAKE) pack
	test "$$(jq -r '.uuid' metadata.json)" = "$(UUID)"
	jq -e 'has("version") | not' metadata.json >/dev/null
	test -s VERSION
	unzip -l "$(ZIP)"

clean:
	rm -rf "$(DIST_DIR)" schemas/gschemas.compiled
