/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file Pool Modifications that come from effects: how their changes are keyed, which ones apply to a check, and how
 * talent ranks scale them.
 */

import { Characteristic } from '@/data/Characteristics';
import { Defense } from '@/data/Actors';
import { GenesysDice } from '@/dice';
import { parsePoolModifications, sortPoolModifications } from '@/dice/DicePool';
import { PoolModGlyphPattern } from '@/dice/types/GenesysPoolModifications';
import { skillNamesMatch } from '@/data/Skills';

/**
 * What a Pool Modification change applies to: every check, checks of a characteristic, or checks of a skill.
 */
export type PoolModificationKind = 'check' | 'char' | 'skill';

/**
 * Whose checks a Pool Modification change applies to: the checks of the effect's actor, or the checks that target it.
 */
export type PoolModificationSource = 'self' | 'target';

/**
 * The key of a Pool Modification change. The subject is the characteristic or the skill name, empty for every check.
 */
export type PoolModificationKey = {
	kind: PoolModificationKind;
	source: PoolModificationSource;
	subject: string;
};

/**
 * What this module needs of the item an effect comes from.
 */
export type SourceItem = {
	type: string;
	system: { rank?: number; scalesWithRank?: 'yes' | 'no' };
};

/**
 * What this module needs of an effect.
 */
export type PoolModificationEffect = {
	name: string;
	isSuppressed: boolean;
	origin: string | null;
	parent: unknown;
	changes: { key: string; value: string }[];
};

/**
 * What this module needs of an actor that makes a check or is its target.
 */
export type PoolModificationActor = {
	type: string;
	systemData: object;
	allApplicableEffects(): Iterable<PoolModificationEffect>;
};

/**
 * The check whose Pool Modifications are collected.
 */
export type CheckForPoolModifications = {
	characteristic?: Characteristic;
	skillName?: string;

	/**
	 * Range of the weapon, for an attack.
	 */
	attackRange?: string;
};

/**
 * A Pool Modification that comes from outside the dice prompt: from an effect of the actor or of their target, or from
 * the target's defense.
 */
export type ExternalPoolModification = {
	source: PoolModificationSource;
	from: { effect: string } | { defense: keyof Defense };
	mods: string[];
};

// The actor types whose effects and defense modify the checks that target them.
const TARGET_TYPES = ['character', 'minion', 'rival', 'nemesis'];

const KEY_PREFIX = 'genesys.pool';
const KEY_PATTERN = /^genesys\.pool\.(check|char|skill)\.(self|target)\.(.*)$/;
const BASE_KEY_PATTERN = /^genesys\.pool\.(check|char|skill)\.(self|target)$/;
const VALUE_PATTERN = new RegExp(`^${PoolModGlyphPattern.source}*$`);

export function encodeKey({ kind, source, subject }: PoolModificationKey) {
	return `${KEY_PREFIX}.${kind}.${source}.${kind === 'check' ? '' : subject}`;
}

/**
 * The parts of a change key, or undefined if the change isn't a Pool Modification.
 */
export function decodeKey(key: string): PoolModificationKey | undefined {
	const match = key.match(KEY_PATTERN);
	if (!match) {
		return undefined;
	}

	return { kind: match[1] as PoolModificationKind, source: match[2] as PoolModificationSource, subject: match[3] };
}

/**
 * Whether a text only holds Pool Modification glyphs.
 */
export function isPoolModificationValue(value: string) {
	return VALUE_PATTERN.test(value);
}

/**
 * The item an effect comes from: its parent when it lives on an item, the item its origin points to among its actor's
 * items when it lives on an actor.
 */
export function sourceItem<Item extends SourceItem>(effect: Pick<PoolModificationEffect, 'origin' | 'parent'>): Item | undefined {
	const parent = effect.parent as { documentName?: string; items?: { get(id: string): Item | undefined } } | null;

	if (parent?.documentName === 'Item') {
		return parent as unknown as Item;
	}

	if (parent?.documentName !== 'Actor' || !effect.origin || !effect.origin.includes('.Item.')) {
		return undefined;
	}

	return parent.items?.get(effect.origin.split('.Item.')[1]);
}

/**
 * The value a change counts for, given the item its effect comes from. Talent ranks scale the two kinds of changes
 * differently:
 * - A Pool Modification counts once per rank only when its talent scales with rank. Talents opt into it so that those
 *   written before the option kept their behaviour.
 * - A numeric change counts once per rank of any talent.
 */
export function scaledChangeValue(item: SourceItem | undefined, change: { key: string; value: string }) {
	if (decodeKey(change.key)) {
		return change.value.repeat(item?.system.scalesWithRank === 'yes' ? item.system.rank ?? 1 : 1);
	}

	if (item?.type === 'talent') {
		const value = parseInt(change.value) * item.system.rank!;
		if (!isNaN(value)) {
			return value.toString();
		}
	}

	return change.value;
}

/**
 * The Pool Modifications that the effects of the actor and of their target, and the target's defense, bring to a check.
 */
export function poolModificationsForCheck(actor: PoolModificationActor | undefined, target: PoolModificationActor | undefined, check: CheckForPoolModifications) {
	const modifications: ExternalPoolModification[] = [];

	if (!actor) {
		return modifications;
	}

	modifications.push(...effectModifications(actor, 'self', check));

	if (target && TARGET_TYPES.includes(target.type)) {
		modifications.push(...effectModifications(target, 'target', check));

		// The target's defense against the range of an attack adds one Setback per point.
		if (check.attackRange) {
			const defense = check.attackRange === 'engaged' ? 'melee' : 'ranged';
			const totalDefense = (target.systemData as { totalDefense: Defense }).totalDefense;

			if (totalDefense[defense] > 0) {
				modifications.push({
					source: 'target',
					from: { defense },
					mods: Array(totalDefense[defense]).fill(GenesysDice.Setback.GLYPH),
				});
			}
		}
	}

	return modifications;
}

function effectModifications(actor: PoolModificationActor, source: PoolModificationSource, { characteristic, skillName }: CheckForPoolModifications) {
	const appliesToCheck = (key: PoolModificationKey | undefined) => {
		if (key?.source !== source) {
			return false;
		}

		switch (key.kind) {
			case 'check':
				return key.subject === '';
			case 'char':
				return key.subject === characteristic;
			case 'skill':
				return !!skillName && skillNamesMatch(key.subject, skillName);
		}
	};

	const modifications: ExternalPoolModification[] = [];

	for (const effect of actor.allApplicableEffects()) {
		if (effect.isSuppressed) {
			continue;
		}

		const item = sourceItem(effect);
		const mods = effect.changes.filter((change) => appliesToCheck(decodeKey(change.key))).flatMap((change) => parsePoolModifications(scaledChangeValue(item, change)));

		if (mods.length > 0) {
			modifications.push({ source, from: { effect: effect.name }, mods: mods.sort(sortPoolModifications) });
		}
	}

	return modifications;
}

/**
 * A change as the effect sheets edit it: a Pool Modification's key without its subject, which is edited in its own
 * field.
 */
export type EditedChange = foundry.data.EffectChangeSource & {
	char?: string;
	skill?: string;
};

/**
 * The skills the effect sheets offer for Pool Modifications, by name: those of the Skills Compendium and those the
 * edited changes already apply to, so that saving the sheet keeps a skill that isn't in the compendium. A compendium
 * skill a change names with another case is offered with the change's case.
 */
export function skillChoices(compendiumSkillNames: string[], changes: EditedChange[]): Record<string, string> {
	const changeSkillNames = changes.flatMap((change) => (change.skill ? [change.skill] : []));
	const names = [...compendiumSkillNames.map((name) => changeSkillNames.find((changeName) => skillNamesMatch(changeName, name)) ?? name), ...changeSkillNames];
	return Object.fromEntries(names.map((name) => [name, name]));
}

/**
 * Which field of the effect sheets edits what a change applies to, given the key picked for it.
 */
export function subjectFieldForKey(key: string) {
	switch (key.match(BASE_KEY_PATTERN)?.[1]) {
		case 'check':
			return 'check-selection';
		case 'char':
			return 'characteristic-selection';
		case 'skill':
			return 'skill-selection';
		default:
			return 'effect-mode';
	}
}

/**
 * A copy of a change, as the effect sheets edit it.
 */
export function toEditedChange(change: foundry.data.EffectChangeSource): EditedChange {
	const editedChange: EditedChange = { ...change };
	const key = decodeKey(change.key);

	if (key) {
		editedChange.key = `${KEY_PREFIX}.${key.kind}.${key.source}`;

		if (key.kind === 'char') {
			editedChange.char = key.subject;
		} else if (key.kind === 'skill') {
			editedChange.skill = key.subject;
		}
	}

	return editedChange;
}

/**
 * Turn a change edited in the effect sheets back into a change, in place. Pool Modifications get their full key, the
 * mode that keeps Foundry from applying them, and lose their value unless it only holds glyphs.
 */
export function fromEditedChange(change: EditedChange) {
	const baseKey = change.key.match(BASE_KEY_PATTERN);
	if (!baseKey) {
		return change;
	}

	const kind = baseKey[1] as PoolModificationKind;
	change.key = encodeKey({ kind, source: baseKey[2] as PoolModificationSource, subject: (kind === 'char' ? change.char : change.skill) ?? '' });
	change.mode = CONST.ACTIVE_EFFECT_MODES.CUSTOM;
	if (!isPoolModificationValue(change.value)) {
		change.value = '';
	}

	delete change.char;
	delete change.skill;

	return change;
}
