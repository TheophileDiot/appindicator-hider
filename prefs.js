// Copyright (C) 2026 TheophileDiot
// SPDX-License-Identifier: MIT

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SETTING_HIDDEN_INDICATORS = 'hidden-indicators';
const SETTING_DEBUG_LOGGING = 'debug-logging';
const STATUS_NOTIFIER_WATCHER = 'org.kde.StatusNotifierWatcher';
const STATUS_NOTIFIER_WATCHER_PATH = '/StatusNotifierWatcher';
const STATUS_NOTIFIER_ITEM = 'org.kde.StatusNotifierItem';

export default class AppIndicatorHiderPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();
        this._matcherRows = [];
        this._liveRows = [];

        window.set_default_size(720, 620);
        window.set_search_enabled(true);

        const page = new Adw.PreferencesPage({
            title: 'Indicators',
            icon_name: 'view-grid-symbolic',
        });
        window.add(page);

        this._liveGroup = new Adw.PreferencesGroup({
            title: 'Live Indicators',
            description: 'Toggle currently registered StatusNotifier/AppIndicator items.',
        });
        page.add(this._liveGroup);

        this._matchersGroup = new Adw.PreferencesGroup({
            title: 'Hidden Matchers',
            description: 'Rules used by the extension. Matching indicators are hidden immediately.',
        });
        page.add(this._matchersGroup);

        const addGroup = new Adw.PreferencesGroup({
            title: 'Add Matcher',
        });
        page.add(addGroup);
        addGroup.add(this._buildAddMatcherRow());

        const advancedGroup = new Adw.PreferencesGroup({
            title: 'Advanced',
        });
        page.add(advancedGroup);
        advancedGroup.add(this._buildDebugRow());

        this._settingsChangedId = this._settings.connect(`changed::${SETTING_HIDDEN_INDICATORS}`, () => this._render());
        window.connect('close-request', () => {
            this._dispose();
            return false;
        });
        this._render();
    }

    _dispose() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        this._matcherRows = [];
        this._liveRows = [];
        this._settings = null;
    }

    _render() {
        this._renderLiveIndicators();
        this._renderMatchers();
    }

    _buildAddMatcherRow() {
        const row = new Adw.ActionRow({
            title: 'Custom matcher',
            subtitle: 'Use id:, title:, unique:, bus:, path:, key:, status:, command:, wmclass:, or text:.',
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            valign: Gtk.Align.CENTER,
        });

        const entry = new Gtk.Entry({
            placeholder_text: 'id:example',
            hexpand: true,
            width_chars: 24,
        });
        const button = new Gtk.Button({
            label: 'Add',
            valign: Gtk.Align.CENTER,
        });

        const addMatcher = () => {
            const matcher = entry.text.trim();
            if (!matcher)
                return;

            this._addMatcher(matcher);
            entry.text = '';
        };

        entry.connect('activate', addMatcher);
        button.connect('clicked', addMatcher);
        box.append(entry);
        box.append(button);
        row.add_suffix(box);

        return row;
    }

    _buildDebugRow() {
        const row = new Adw.ActionRow({
            title: 'Debug logging',
            subtitle: 'Write hide/show decisions to the GNOME Shell log.',
        });
        const toggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
        this._settings.bind(
            SETTING_DEBUG_LOGGING,
            toggle,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        row.add_suffix(toggle);
        row.activatable_widget = toggle;

        return row;
    }

    _renderLiveIndicators() {
        this._clearRows(this._liveGroup, this._liveRows);

        const refreshRow = new Adw.ActionRow({
            title: 'Refresh detected indicators',
            subtitle: 'The list is read from org.kde.StatusNotifierWatcher.',
        });
        const refreshButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
        });
        refreshButton.connect('clicked', () => this._renderLiveIndicators());
        refreshRow.add_suffix(refreshButton);
        refreshRow.activatable_widget = refreshButton;
        this._addLiveRow(refreshRow);

        let indicators = [];
        try {
            indicators = this._getRegisteredIndicators();
        } catch (e) {
            this._addLiveRow(new Adw.ActionRow({
                title: 'Could not read live indicators',
                subtitle: e.message ?? String(e),
            }));
            return;
        }

        if (!indicators.length) {
            this._addLiveRow(new Adw.ActionRow({
                title: 'No live indicators found',
                subtitle: 'Open the apps that create tray icons, then refresh.',
            }));
            return;
        }

        for (const indicator of indicators)
            this._addLiveRow(this._buildIndicatorRow(indicator));
    }

    _buildIndicatorRow(indicator) {
        const title = this._indicatorTitle(indicator);
        const row = new Adw.ActionRow({
            title,
            subtitle: this._indicatorSubtitle(indicator),
        });

        const toggle = new Gtk.Switch({
            active: this._matchesHiddenIndicator(indicator.facts),
            valign: Gtk.Align.CENTER,
        });

        toggle.connect('notify::active', () => {
            if (toggle.active)
                this._addMatcher(this._preferredMatcher(indicator));
            else
                this._removeMatchingIndicatorMatchers(indicator.facts);
        });

        row.add_suffix(toggle);
        row.activatable_widget = toggle;

        return row;
    }

    _renderMatchers() {
        this._clearRows(this._matchersGroup, this._matcherRows);

        const matchers = this._getMatchers();
        if (!matchers.length) {
            this._addMatcherRow(new Adw.ActionRow({
                title: 'No hidden matchers',
                subtitle: 'All AppIndicator icons are currently allowed to show.',
            }));
            return;
        }

        for (const matcher of matchers) {
            const row = new Adw.ActionRow({title: matcher});
            const removeButton = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                css_classes: ['flat'],
                valign: Gtk.Align.CENTER,
            });
            removeButton.connect('clicked', () => this._removeMatcher(matcher));
            row.add_suffix(removeButton);
            row.activatable_widget = removeButton;
            this._addMatcherRow(row);
        }
    }

    _getRegisteredIndicators() {
        const items = this._getRegisteredStatusNotifierItems();

        const indicators = [];

        for (const item of items) {
            const [bus, path] = this._splitRegisteredItem(item);
            const unique = this._uniqueId(item, bus, path);

            try {
                const props = this._getItemProperties(bus, path);
                const id = this._property(props, 'Id');
                const title = this._property(props, 'Title');
                const status = this._property(props, 'Status');

                indicators.push(this._buildIndicator(item, bus, path, unique, id, title, status));
            } catch (e) {
                indicators.push(this._buildIndicator(
                    item,
                    bus,
                    path,
                    unique,
                    '',
                    '',
                    '',
                    e.message ?? String(e)
                ));
            }
        }

        return indicators;
    }

    _buildIndicator(item, bus, path, unique, id, title, status, error = '') {
        return {
            item,
            bus,
            path,
            unique,
            id,
            title,
            status,
            error,
            facts: this._normalizeFacts({
                key: `appindicator-${unique}`,
                unique,
                id,
                title,
                status,
                bus,
                path,
                error,
                text: `${item} ${bus} ${path} ${id} ${title} ${status} ${error}`,
            }),
        };
    }

    _getRegisteredStatusNotifierItems() {
        const result = Gio.DBus.session.call_sync(
            STATUS_NOTIFIER_WATCHER,
            STATUS_NOTIFIER_WATCHER_PATH,
            'org.freedesktop.DBus.Properties',
            'Get',
            new GLib.Variant('(ss)', [
                STATUS_NOTIFIER_WATCHER,
                'RegisteredStatusNotifierItems',
            ]),
            new GLib.VariantType('(v)'),
            Gio.DBusCallFlags.NONE,
            1000,
            null
        );

        const [items] = result.deep_unpack();
        return this._variantValue(items) ?? [];
    }

    _getItemProperties(bus, path) {
        const result = Gio.DBus.session.call_sync(
            bus,
            path,
            'org.freedesktop.DBus.Properties',
            'GetAll',
            new GLib.Variant('(s)', [STATUS_NOTIFIER_ITEM]),
            new GLib.VariantType('(a{sv})'),
            Gio.DBusCallFlags.NONE,
            1000,
            null
        );

        const [properties] = result.deep_unpack();
        return properties ?? {};
    }

    _splitRegisteredItem(item) {
        const separator = item.indexOf('@');
        if (separator === -1)
            return [item, '/StatusNotifierItem'];

        return [item.slice(0, separator), item.slice(separator + 1)];
    }

    _uniqueId(item, bus, path) {
        if (item !== `${bus}@${path}`)
            return item;

        return `${bus}@${path}`;
    }

    _property(properties, name) {
        return String(this._variantValue(properties[name]) ?? '');
    }

    _variantValue(value) {
        return value?.deep_unpack ? value.deep_unpack() : value;
    }

    _indicatorTitle(indicator) {
        if (indicator.title && indicator.id && indicator.title !== indicator.id)
            return `${indicator.title} (${indicator.id})`;

        return indicator.id || indicator.title || indicator.item;
    }

    _indicatorSubtitle(indicator) {
        const parts = [
            indicator.error ? `error:${indicator.error}` : '',
            indicator.status ? `status:${indicator.status}` : '',
            indicator.id ? `id:${indicator.id}` : '',
            `path:${indicator.path}`,
        ].filter(Boolean);

        return parts.join('   ');
    }

    _preferredMatcher(indicator) {
        if (indicator.id)
            return `id:${indicator.id}`;

        if (indicator.unique)
            return `unique:${indicator.unique}`;

        return `path:${indicator.path}`;
    }

    _getMatchers() {
        return this._settings.get_strv(SETTING_HIDDEN_INDICATORS)
            .map(matcher => matcher.trim())
            .filter(Boolean);
    }

    _setMatchers(matchers) {
        const unique = [];
        const seen = new Set();

        for (const matcher of matchers) {
            const clean = matcher.trim();
            const key = clean.toLowerCase();

            if (!clean || seen.has(key))
                continue;

            seen.add(key);
            unique.push(clean);
        }

        this._settings.set_strv(SETTING_HIDDEN_INDICATORS, unique);
    }

    _addMatcher(matcher) {
        this._setMatchers([...this._getMatchers(), matcher]);
    }

    _removeMatcher(matcher) {
        const needle = matcher.toLowerCase();
        this._setMatchers(this._getMatchers().filter(item => item.toLowerCase() !== needle));
    }

    _removeMatchingIndicatorMatchers(facts) {
        this._setMatchers(this._getMatchers()
            .filter(matcher => !this._matchesToken(matcher.toLowerCase(), facts)));
    }

    _matchesHiddenIndicator(facts) {
        return this._getMatchers()
            .some(matcher => this._matchesToken(matcher.toLowerCase(), facts));
    }

    _matchesToken(token, facts) {
        const separator = token.indexOf(':');

        if (separator > 0) {
            const field = token.slice(0, separator);
            const value = token.slice(separator + 1);

            if (field === 'text')
                return Object.values(facts).some(fact => fact.includes(value));

            if (!(field in facts))
                return false;

            return facts[field].includes(value);
        }

        return Object.values(facts).some(fact => fact.includes(token));
    }

    _normalizeFacts(facts) {
        return Object.fromEntries(
            Object.entries(facts).map(([key, value]) => [key, String(value).toLowerCase()])
        );
    }

    _addLiveRow(row) {
        this._liveGroup.add(row);
        this._liveRows.push(row);
    }

    _addMatcherRow(row) {
        this._matchersGroup.add(row);
        this._matcherRows.push(row);
    }

    _clearRows(group, rows) {
        for (const row of rows)
            group.remove(row);

        rows.length = 0;
    }
}
