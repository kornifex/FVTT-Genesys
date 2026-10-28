import type { GenesysItem } from '@/item/GenesysItem';
import { register as registerStoryPoints } from '@/settings/storyPoints';
import { type AnySetting, SETTINGS, settingEntries, type SettingKey } from '@/settings/table';

import { register as registerAlpha } from '@/settings/alpha';

/**
 * Namespace used to access system settings from {@link Game.settings}.
 */
export const NAMESPACE = 'genesys';

/**
 * Write a setting's value where the system reads it, and do what else applying it does.
 */
function apply(entry: AnySetting, value: unknown) {
	const normalized = entry.normalize?.(value as never);
	if (entry.field) {
		(CONFIG.genesys.settings as Record<string, unknown>)[entry.field] = normalized;
	}
	void entry.effect?.(value as never, normalized);
}

function applyStored(key: SettingKey) {
	apply(SETTINGS[key], game.settings.get(NAMESPACE, key));
}

function registerTable() {
	for (const [key, entry] of settingEntries()) {
		game.settings.register(NAMESPACE, key, {
			name: game.i18n.localize(entry.name),
			hint: game.i18n.localize(entry.hint),
			scope: entry.scope,
			config: true,
			default: entry.default,
			type: entry.type,
			...(entry.choices && {
				choices: Object.fromEntries(Object.entries(entry.choices).map(([value, label]) => [value, game.i18n.localize(label)])),
			}),
			...(entry.requiresReload ? { requiresReload: true } : { onChange: (value: unknown) => apply(entry, value) }),
		});
	}

	// Reload the skills whenever the content of the Skills Compendium changes.
	const reloadSkills = (item: unknown) => {
		const targetItem = item as GenesysItem;
		if (targetItem.pack === CONFIG.genesys.settings.skillsCompendium && targetItem.type === 'skill') {
			applyStored('skillsCompendium');
		}
	};
	Hooks.on('createItem', reloadSkills);
	Hooks.on('updateItem', reloadSkills);
	Hooks.on('deleteItem', reloadSkills);
}

/**
 * Register all system settings.
 */
export function register() {
	registerTable();
	registerStoryPoints(NAMESPACE);

	registerAlpha(NAMESPACE);
}

/**
 * Apply the stored values of the settings that must take effect before the user interface first renders.
 */
export function setup() {
	for (const [key, entry] of settingEntries()) {
		if (entry.onSetup) applyStored(key);
	}
}

/**
 * Apply the stored values of the other settings to `CONFIG.genesys.settings`.
 */
export function ready() {
	for (const [key, entry] of settingEntries()) {
		if (!entry.onSetup) applyStored(key);
	}
}
