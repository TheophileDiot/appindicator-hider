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
const MATCHER_FIELD_LABELS = {
    id: 'App ID',
    title: 'Title',
    unique: 'Unique ID',
    bus: 'D-Bus name',
    path: 'D-Bus path',
    key: 'Panel key',
    status: 'Status',
    command: 'Command',
    wmclass: 'Window class',
    text: 'Any text',
};
const ABBREVIATIONS = new Set(['dbus', 'gtk', 'id', 'kde', 'ui', 'vpn']);

export default class AppIndicatorHiderPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();
        this._matcherRows = [];
        this._liveRows = [];

        window.set_default_size(760, 680);
        window.set_search_enabled(true);

        const page = new Adw.PreferencesPage({
            title: 'Indicators',
            icon_name: 'view-grid-symbolic',
        });
        window.add(page);

        this._liveGroup = new Adw.PreferencesGroup({
            title: 'Hide Running Icons',
            description: 'Turn a switch on to hide that tray icon. Turn it off to show it again.',
        });
        page.add(this._liveGroup);

        this._matchersGroup = new Adw.PreferencesGroup({
            title: 'Hidden Icons',
            description: 'Saved rules keep matching tray icons hidden, even after apps restart.',
        });
        page.add(this._matchersGroup);

        const addGroup = new Adw.PreferencesGroup({
            title: 'Add Hidden Icon',
            description: 'Add a rule for an app that is not currently listed above.',
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
            title: 'Matcher',
            subtitle: 'Use an app name like discord, or a precise rule like id:livepatch.',
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            valign: Gtk.Align.CENTER,
        });

        const entry = new Gtk.Entry({
            placeholder_text: 'discord or id:livepatch',
            hexpand: true,
            width_chars: 22,
        });
        const button = new Gtk.Button({
            label: 'Add',
            css_classes: ['suggested-action'],
            sensitive: false,
            valign: Gtk.Align.CENTER,
        });
        button.tooltip_text = 'Add hidden icon rule';

        const addMatcher = () => {
            const matcher = entry.text.trim();
            if (!matcher)
                return;

            this._addMatcher(matcher);
            entry.text = '';
        };

        entry.connect('activate', addMatcher);
        entry.connect('notify::text', () => {
            button.sensitive = entry.text.trim().length > 0;
        });
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
            title: 'Refresh icons',
            subtitle: 'Use after opening or closing apps with tray icons.',
        });
        const refreshButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
        });
        refreshButton.tooltip_text = 'Refresh running tray icons';
        refreshButton.connect('clicked', () => this._renderLiveIndicators());
        refreshRow.add_suffix(refreshButton);
        refreshRow.activatable_widget = refreshButton;
        this._addLiveRow(refreshRow);

        let indicators = [];
        try {
            indicators = this._getRegisteredIndicators();
        } catch (e) {
            this._addLiveRow(new Adw.ActionRow({
                title: 'Cannot read running tray icons',
                subtitle: e.message ?? String(e),
            }));
            return;
        }

        if (!indicators.length) {
            this._addLiveRow(new Adw.ActionRow({
                title: 'No running tray icons found',
                subtitle: 'Open an app with a tray icon, then refresh.',
            }));
            return;
        }

        for (const indicator of this._sortIndicators(indicators))
            this._addLiveRow(this._buildIndicatorRow(indicator));
    }

    _buildIndicatorRow(indicator) {
        const hidden = this._matchesHiddenIndicator(indicator.facts);
        const row = new Adw.ActionRow({
            title: this._indicatorTitle(indicator),
            subtitle: this._indicatorSubtitle(indicator, hidden),
        });

        const toggle = new Gtk.Switch({
            active: hidden,
            valign: Gtk.Align.CENTER,
        });
        toggle.tooltip_text = hidden ? 'This icon is hidden' : 'Hide this icon';

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
                title: 'All tray icons are shown',
                subtitle: 'Turn on a switch above or add a matcher below to hide one.',
            }));
            return;
        }

        this._addMatcherRow(this._buildClearMatchersRow(matchers.length));

        for (const matcher of matchers) {
            const row = new Adw.ActionRow({
                title: this._matcherTitle(matcher),
                subtitle: `Rule: ${matcher}`,
            });
            const removeButton = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                css_classes: ['flat'],
                valign: Gtk.Align.CENTER,
            });
            removeButton.tooltip_text = 'Remove this hidden icon rule';
            removeButton.connect('clicked', () => this._removeMatcher(matcher));
            row.add_suffix(removeButton);
            row.activatable_widget = removeButton;
            this._addMatcherRow(row);
        }
    }

    _buildClearMatchersRow(count) {
        const row = new Adw.ActionRow({
            title: 'Show all tray icons',
            subtitle: `Remove ${count} ${count === 1 ? 'hidden icon rule' : 'hidden icon rules'}.`,
        });
        const button = new Gtk.Button({
            label: 'Show All',
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });
        button.tooltip_text = 'Remove all hidden icon rules';
        button.connect('clicked', () => this._setMatchers([]));
        row.add_suffix(button);
        row.activatable_widget = button;

        return row;
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

    _sortIndicators(indicators) {
        return indicators.sort((a, b) => {
            const hiddenA = this._matchesHiddenIndicator(a.facts);
            const hiddenB = this._matchesHiddenIndicator(b.facts);

            if (hiddenA !== hiddenB)
                return hiddenA ? -1 : 1;

            return this._indicatorTitle(a).localeCompare(this._indicatorTitle(b), undefined, {
                sensitivity: 'base',
            });
        });
    }

    _indicatorTitle(indicator) {
        const title = this._humanizeToken(indicator.title);
        const id = this._humanizeToken(indicator.id);

        if (title && id && title.toLowerCase() !== id.toLowerCase())
            return `${title} (${id})`;

        return title || id || this._humanizeToken(indicator.item) || 'Unknown tray icon';
    }

    _indicatorSubtitle(indicator, hidden) {
        if (indicator.error)
            return `Cannot inspect details; ${indicator.error}`;

        const parts = [
            hidden ? 'Hidden' : 'Shown',
            this._statusLabel(indicator.status),
            indicator.id ? `ID: ${indicator.id}` : '',
            !indicator.id && indicator.path ? `Path: ${indicator.path}` : '',
        ].filter(Boolean);

        return parts.join('; ');
    }

    _statusLabel(status) {
        switch (status) {
        case 'Active':
            return 'Running';
        case 'Passive':
            return 'Idle';
        case 'NeedsAttention':
            return 'Needs attention';
        default:
            return status || '';
        }
    }

    _matcherTitle(matcher) {
        const separator = matcher.indexOf(':');
        if (separator <= 0)
            return `Any text: ${matcher}`;

        const field = matcher.slice(0, separator).toLowerCase();
        const value = matcher.slice(separator + 1);
        const label = MATCHER_FIELD_LABELS[field] ?? this._humanizeToken(field);

        return `${label}: ${value}`;
    }

    _humanizeToken(value) {
        const text = String(value ?? '').trim();
        if (!text)
            return '';

        return text
            .replace(/[._-]+/g, ' ')
            .split(/\s+/)
            .map(word => this._humanizeWord(word))
            .join(' ');
    }

    _humanizeWord(word) {
        const lower = word.toLowerCase();

        if (ABBREVIATIONS.has(lower))
            return lower.toUpperCase();

        if (/^\d+$/.test(word))
            return word;

        return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
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
