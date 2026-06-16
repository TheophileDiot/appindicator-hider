// Copyright (C) 2026 TheophileDiot
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SETTING_HIDDEN_INDICATORS = 'hidden-indicators';
const SETTING_DEBUG_LOGGING = 'debug-logging';
const APPINDICATOR_PREFIX = 'appindicator-';

export default class AppIndicatorHiderExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._hiddenActors = new Map();
        this._actorSignals = new Map();
        this._timeoutIds = new Set();
        this._syncSourceId = 0;

        this._settingsChangedIds = [
            this._settings.connect(`changed::${SETTING_HIDDEN_INDICATORS}`, () => this._queueSync()),
            this._settings.connect(`changed::${SETTING_DEBUG_LOGGING}`, () => this._queueSync()),
        ];

        this._patchPanelAddToStatusArea();
        this._queueSync();
        this._queueDelayedSync(1000);
        this._queueDelayedSync(3000);
    }

    disable() {
        this._restorePanelAddToStatusArea();

        if (this._syncSourceId) {
            GLib.Source.remove(this._syncSourceId);
            this._syncSourceId = 0;
        }

        for (const timeoutId of this._timeoutIds)
            GLib.Source.remove(timeoutId);
        this._timeoutIds.clear();

        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];

        for (const [actor, ids] of this._actorSignals)
            this._disconnectActorSignals(actor, ids);
        this._actorSignals.clear();

        for (const actor of this._hiddenActors.keys())
            this._showActor(actor);
        this._hiddenActors.clear();

        this._settings = null;
    }

    _patchPanelAddToStatusArea() {
        this._originalAddToStatusArea = Main.panel.addToStatusArea;

        this._patchedAddToStatusArea = (...args) => {
            const result = this._originalAddToStatusArea.apply(Main.panel, args);
            this._queueSync();
            this._queueDelayedSync(500);
            return result;
        };

        Main.panel.addToStatusArea = this._patchedAddToStatusArea;
    }

    _restorePanelAddToStatusArea() {
        if (Main.panel.addToStatusArea === this._patchedAddToStatusArea && this._originalAddToStatusArea)
            Main.panel.addToStatusArea = this._originalAddToStatusArea;

        this._originalAddToStatusArea = null;
        this._patchedAddToStatusArea = null;
    }

    _queueDelayedSync(delayMs) {
        const timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._timeoutIds.delete(timeoutId);
            this._queueSync();
            return GLib.SOURCE_REMOVE;
        });
        this._timeoutIds.add(timeoutId);
    }

    _queueSync() {
        if (this._syncSourceId)
            return;

        this._syncSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._syncSourceId = 0;
            this._sync();
            return GLib.SOURCE_REMOVE;
        });
    }

    _sync() {
        const seenActors = new Set();

        for (const [key, actor] of Object.entries(Main.panel.statusArea)) {
            if (!this._isCandidate(key, actor))
                continue;

            seenActors.add(actor);
            this._ensureActorSignals(actor);

            const facts = this._collectFacts(key, actor);
            const shouldHide = this._matchesHiddenIndicator(facts);

            if (shouldHide)
                this._hideActor(actor, facts);
            else if (this._hiddenActors.has(actor))
                this._showActor(actor);
        }

        for (const actor of [...this._hiddenActors.keys()]) {
            if (!seenActors.has(actor))
                this._hiddenActors.delete(actor);
        }
    }

    _isCandidate(key, actor) {
        return key.startsWith(APPINDICATOR_PREFIX) && actor;
    }

    _ensureActorSignals(actor) {
        if (this._actorSignals.has(actor))
            return;

        const ids = [];

        ids.push(actor.connect('destroy', () => {
            const signalIds = this._actorSignals.get(actor) ?? ids;
            this._disconnectActorSignals(actor, signalIds);
            this._hiddenActors.delete(actor);
            this._actorSignals.delete(actor);
            this._queueSync();
        }));

        ids.push(actor.connect('notify::visible', () => this._queueSync()));

        if (actor._indicator?.connect) {
            ids.push([actor._indicator, actor._indicator.connect('ready', () => this._queueSync())]);
            ids.push([actor._indicator, actor._indicator.connect('status', () => this._queueSync())]);
            ids.push([actor._indicator, actor._indicator.connect('accessible-name', () => this._queueSync())]);
            ids.push([actor._indicator, actor._indicator.connect('reset', () => this._queueSync())]);
        }

        this._actorSignals.set(actor, ids);
    }

    _disconnectActorSignals(actor, ids) {
        for (const signal of ids) {
            try {
                const [source, id] = Array.isArray(signal) ? signal : [actor, signal];
                if (source?.disconnect && id)
                    source.disconnect(id);
            } catch (e) {
                // Actor or indicator may already be destroyed.
            }
        }
    }

    _collectFacts(key, actor) {
        const indicator = actor._indicator;
        const icon = actor._icon ?? actor.icon;
        const proxy = indicator?._proxy;

        return {
            key,
            unique: actor.uniqueId ?? '',
            id: indicator?.id ?? '',
            title: indicator?.title ?? '',
            status: indicator?.status ?? '',
            accessible: indicator?.accessibleName ?? '',
            bus: indicator?.busName ?? '',
            nameOwner: proxy?.gNameOwner ?? '',
            path: proxy?.gObjectPath ?? '',
            menu: indicator?.menuPath ?? '',
            command: indicator?._commandLine ?? '',
            wmclass: icon?.wm_class ?? '',
        };
    }

    _matchesHiddenIndicator(facts) {
        const matchers = this._settings.get_strv(SETTING_HIDDEN_INDICATORS)
            .map(token => token.trim().toLowerCase())
            .filter(Boolean);

        if (!matchers.length)
            return false;

        const normalized = Object.fromEntries(
            Object.entries(facts).map(([key, value]) => [key, String(value).toLowerCase()])
        );

        return matchers.some(matcher => this._matchesToken(matcher, normalized));
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

    _hideActor(actor, facts) {
        if (!this._hiddenActors.has(actor)) {
            this._log(`hiding ${facts.id || facts.unique || facts.key}`);
            this._hiddenActors.set(actor, actor.visible);
        } else if (this._indicatorWantsVisible(actor)) {
            this._hiddenActors.set(actor, true);
        }

        actor.hide();
    }

    _showActor(actor) {
        const wasVisible = this._hiddenActors.get(actor);
        this._hiddenActors.delete(actor);

        if ((wasVisible || this._indicatorWantsVisible(actor)) && !this._isActorDestroyed(actor))
            actor.show();
    }

    _indicatorWantsVisible(actor) {
        const status = actor._indicator?.status;
        return status === 'Active' || status === 'NeedsAttention';
    }

    _isActorDestroyed(actor) {
        return typeof actor.is_destroyed === 'function' && actor.is_destroyed();
    }

    _log(message) {
        if (this._settings.get_boolean(SETTING_DEBUG_LOGGING))
            console.debug(`[${this.metadata.uuid}] ${message}`);
    }
}
