/**
 * @file Pool Modifications that come from outside the dice prompt: from effects (how their changes are keyed, which ones apply to a check, and how talent and quality ranks scale them), the target's defense and silhouette, the roller's encumbrance and the damage of the weapon they attack with.
 */

import { type Encumbrance, isEncumbered } from '@/actor/data/Encumbrance';
import { Characteristic } from '@/data/Characteristics';
import { Defense } from '@/data/Actors';
import { DieTypes } from '@/dice/DieTypes';
import { parsePoolModifications, sortPoolModifications } from '@/dice/DicePool';
import { DIE_GLYPHS, PoolModGlyphPattern, removalGlyph } from '@/dice/GenesysPoolModifications';
import { isCriticalChangeKey } from '@/dice/CriticalInjuryRoll';
import { isHealingChangeKey } from '@/actor/Recovery';
import { parseWholeNumber } from '@/data/parsing';
import { skillNamesMatch } from '@/data/Skills';
import { type AttackChanges, decodeAttackChangeKey, isAttackChangeKey } from '@/effects/AttackChanges';
import { CAREER_SKILL_CHANGE_KEY, careerSkillChangeKey, decodeCareerSkillChangeKey } from '@/effects/CareerSkillChanges';
import { originItemId } from '@/effects/EffectOrigin';
import type { EquipmentDamageState } from '@/item/data/EquipmentDamage';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { effectTag } from '@/item/data/EffectTags';
import { effectQuality, isOutrankedQualityEffect, QUALITY_FLAG, qualityRank } from '@/item/data/Qualities';
import { ATTACHMENT_FLAG, effectAttachment } from '@/item/data/Attachments';
import { isForWeaponAttacksOnly } from '@/effects/WeaponAttacksOnly';
import { type RankedSystem, scalingRank } from '@/item/data/Talents';
import { isItemChangeKey } from '@/item/ItemChanges';

/**
 * What a Pool Modification change applies to: every check, checks of a characteristic, checks of a skill, combat checks,
 * or only melee or only ranged attacks.
 */
const KINDS = ['check', 'char', 'skill', 'combat', 'melee', 'ranged'] as const;
type PoolModificationKind = (typeof KINDS)[number];

/**
 * The kinds of change that apply to the checks of one characteristic or one skill, which their key names. The others
 * apply to every check of their kind, with an empty subject.
 */
const SUBJECT_KINDS: readonly PoolModificationKind[] = ['char', 'skill'];

/**
 * The kind of an attack, melee or ranged, which the defense it meets and the changes that target that kind depend on.
 */
type AttackKind = Extract<PoolModificationKind, 'melee' | 'ranged'>;

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
	system: RankedSystem;
};

/**
 * What this module needs of an effect.
 */
export type PoolModificationEffect = {
	name: string;
	uuid: string;
	isSuppressed: boolean;
	origin: string | null;
	parent: unknown;
	// v14 lets a change hold a value of any type, which a Pool Modification never is.
	system: { changes: { key?: string; value: unknown }[] };
	/** The effect's flags, which tag the effect of a weapon's or an armor's quality. */
	flags?: object;
};

/**
 * What this module needs of an actor that makes a check or is its target.
 */
export type PoolModificationActor = {
	type: string;
	system: object;
	allApplicableEffects(): Iterable<PoolModificationEffect>;
};

/**
 * The check whose Pool Modifications are collected.
 */
export type CheckForPoolModifications = {
	characteristic?: Characteristic;
	skillName?: string;

	/**
	 * What the check is rolled for, as its Pool Modifications see it: an attack, which is a combat check, or any other.
	 */
	purpose: CombatCheck | { kind: 'other' };
};

/**
 * An attack, with a weapon or a spell, whose Pool Modifications depend on how it is made.
 */
export type CombatCheck = {
	kind: 'combat';

	/**
	 * Range of the weapon, or the magic attack's.
	 */
	attackRange: string;

	/**
	 * The kind of attack the Skills Compendium gives the skill rolled. Left undefined when it gives none: the weapon's
	 * range then decides.
	 */
	skillAttackKind?: AttackKind;

	/**
	 * The actor that makes the attack: the one making the check, or the vehicle whose weapon they fire.
	 */
	attacker: SilhouettedActor;

	/**
	 * The weapon the attack is made with, whose damage hinders it, and whose qualities' effects change it. Left undefined
	 * for a magic attack.
	 */
	weapon?: DamageableItem & { effects?: Iterable<PoolModificationEffect> };

	/**
	 * The qualities of the Weapon Profile the attack is made with, whose effects change it. Left undefined for a magic
	 * attack.
	 */
	attackQualities?: readonly Pick<ContainedItemQuality, 'id'>[];
};

/**
 * What this module needs of an item whose damage hinders the checks made with it.
 */
type DamageableItem = {
	name: string;
	uuid: string | null;
	system: { damage: EquipmentDamageState };
};

/**
 * What this module needs of an actor whose silhouette it compares. A vehicle's silhouette can be emptied in its sheet.
 */
export type SilhouettedActor = {
	system: { silhouette?: number | null };
};

/**
 * The silhouettes of a target and of its attacker.
 */
type Silhouettes = { target: number; attacker: number };

/**
 * The damage of an item that hinders the checks made with it; major damage forbids them.
 */
type HinderingDamage = Extract<EquipmentDamageState, 'minor' | 'moderate'>;

/**
 * A damaged item, by its name and its uuid, with its damage.
 */
type DamagedItem = { name: string; uuid: string | null; damage: HinderingDamage };

/**
 * What a Pool Modification from outside the dice prompt comes from: an effect, the target's defense, the silhouette
 * difference between the target and its attacker, the roller's encumbrance, or the damage of the weapon they attack
 * with. An effect is named for the roller, and told apart by its uuid: effects often share a name, as the sheets name a
 * new effect after its item. An effect that comes from an item, such as a talent or a piece of equipment, carries that
 * item, which the roller opens to read the effect's conditions, as they open a damaged weapon. An effect of a quality or
 * an attachment of its item carries that part's description too.
 */
type PoolModificationOrigin =
	| { effect: string; uuid: string; item?: EffectItem; described?: DescribedPart }
	| { defense: keyof Defense }
	| { silhouette: Silhouettes }
	| { encumbrance: Encumbrance }
	| { itemDamage: DamagedItem };

/**
 * The item an effect comes from, by its name and its uuid.
 */
type EffectItem = { name: string; uuid: string };

/**
 * The quality or the attachment of its item that an effect belongs to, by its name and its description. The Dice Prompt
 * shows the description in place of a link to the item, which holds a copy of the quality or the attachment, not a
 * document of its own.
 */
type DescribedPart = { name: string; description: string };

/**
 * A Pool Modification that comes from outside the dice prompt: from an effect of the actor or of their target, from the
 * target's defense, from the silhouette difference between the attacker and the target, from the actor's encumbrance,
 * or from the damage of the weapon they attack with.
 */
export type ExternalPoolModification = {
	source: PoolModificationSource;
	from: PoolModificationOrigin;
	mods: string[];
	/**
	 * What the Attack Changes of the same effect add to the attack, which the roller turns on or off with its Pool
	 * Modifications: Battle Rage's Setback comes with its +2 damage (RoT p. 67). An effect that only holds Attack Changes
	 * is listed with no Pool Modification.
	 */
	attack?: AttackChanges;
	/**
	 * Whether the Dice Prompt lists it off, whatever the world's setting: an active quality's, which the roller turns on
	 * when they trigger it.
	 */
	startsOff?: boolean;
};

/**
 * The value that the function for its kind of origin gives a Pool Modification's origin.
 */
export function matchOrigin<T>(
	from: PoolModificationOrigin,
	cases: {
		effect(name: string, uuid: string, item: EffectItem | undefined, described: DescribedPart | undefined): T;
		defense(defense: keyof Defense): T;
		silhouette(silhouettes: Silhouettes): T;
		encumbrance(encumbrance: Encumbrance): T;
		itemDamage(item: DamagedItem): T;
	},
): T {
	if ('effect' in from) {
		return cases.effect(from.effect, from.uuid, from.item, from.described);
	}

	if ('defense' in from) {
		return cases.defense(from.defense);
	}

	if ('silhouette' in from) {
		return cases.silhouette(from.silhouette);
	}

	return 'encumbrance' in from ? cases.encumbrance(from.encumbrance) : cases.itemDamage(from.itemDamage);
}

// The actor types whose effects, defense and silhouette modify the checks that target them. A vehicle's defense works as a
// character's (CRB p. 223).
const TARGET_TYPES = ['character', 'minion', 'rival', 'nemesis', 'vehicle'];

/**
 * The change type of a Pool Modification. The system registers it with a handler that applies nothing, since a Pool
 * Modification changes no data of its actor: the system reads it when it builds a dice pool.
 */
export const POOL_MODIFICATION_TYPE = 'genesys.poolModification';

const KEY_PREFIX = 'genesys.pool';
const KEY_PATTERN = new RegExp(`^genesys\\.pool\\.(${KINDS.join('|')})\\.(self|target)\\.(.*)$`);
const BASE_KEY_PATTERN = new RegExp(`^genesys\\.pool\\.(${KINDS.join('|')})\\.(self|target)$`);
const VALUE_PATTERN = new RegExp(`^${PoolModGlyphPattern.source}*$`);

/**
 * The change key of a Pool Modification, which {@link decodeKey} reads back.
 */
export function encodeKey({ kind, source, subject }: PoolModificationKey) {
	return `${KEY_PREFIX}.${kind}.${source}.${SUBJECT_KINDS.includes(kind) ? subject : ''}`;
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

	const itemId = originItemId(effect.origin);
	if (parent?.documentName !== 'Actor' || !itemId) {
		return undefined;
	}

	return parent.items?.get(itemId);
}

/**
 * The value a change counts for, given the item its effect comes from. Talent ranks scale the two kinds of changes
 * differently:
 * - A Pool Modification counts once per rank only when its talent scales with rank. Talents opt into it so that those
 *   written before the option kept their behaviour.
 * - A numeric change counts once per rank of any talent.
 *
 * The effect of a weapon's or an armor's quality, given that quality, counts both kinds once per rank of a rated quality
 * (CRB pp. 86–89): Accurate 2, written as one Boost, gives two.
 *
 * The value keeps its type: Foundry stores a number as one, and a value it can't parse as a string.
 */
export function scaledChangeValue(
	item: SourceItem | undefined,
	change: { key: string; value: string },
	quality?: Pick<ContainedItemQuality, 'isRated' | 'rating'>,
): string;
export function scaledChangeValue(
	item: SourceItem | undefined,
	change: { key: string; value: unknown },
	quality?: Pick<ContainedItemQuality, 'isRated' | 'rating'>,
): unknown;
export function scaledChangeValue(
	item: SourceItem | undefined,
	{ key, value }: { key: string; value: unknown },
	quality?: Pick<ContainedItemQuality, 'isRated' | 'rating'>,
) {
	const rankOfQuality = quality && qualityRank(quality);

	if (decodeKey(key)) {
		const rank = rankOfQuality ?? scalingRank(item);
		return typeof value === 'string' ? value.repeat(Math.max(rank, 0)) : value;
	}

	// A quality of rank 1, rated or not, leaves its value as written: the rewrite below would cut a decimal or a formula to
	// an integer.
	if (quality ? rankOfQuality !== 1 : item?.type === 'talent') {
		const rank = rankOfQuality ?? item!.system.rank!;
		if (typeof value === 'number') {
			return value * rank;
		}

		const scaled = parseInt(String(value)) * rank;
		if (!isNaN(scaled)) {
			return scaled.toString();
		}
	}

	return value;
}

/**
 * The Pool Modifications that the effects of the actor and of their target, the actor's encumbrance, the target's
 * defense and, for an attack, the damage of the weapon and the silhouette difference with the target bring to a check.
 */
export function poolModificationsForCheck(
	actor: PoolModificationActor | undefined,
	target: PoolModificationActor | undefined,
	check: CheckForPoolModifications,
) {
	const modifications: ExternalPoolModification[] = [];

	if (!actor) {
		return modifications;
	}

	const attack = check.purpose.kind === 'combat' ? check.purpose : undefined;

	modifications.push(
		...effectModifications(effectsExcept(actor.allApplicableEffects(), isWeaponAttackEffect), 'self', check),
		...(attack ? effectModifications(weaponAttackEffects(attack), 'self', check) : []),
		...encumbranceModifications(actor, check),
		...itemDamageModifications(attack?.weapon),
	);

	if (target && TARGET_TYPES.includes(target.type)) {
		modifications.push(...effectModifications(effectsExcept(target.allApplicableEffects(), isOutrankedEffect), 'target', check));

		if (attack) {
			// The target's defense against the kind of an attack adds one Setback per point.
			const defense = attackKind(attack);
			const totalDefense = (target.system as { totalDefense: Defense }).totalDefense;

			if (totalDefense[defense] > 0) {
				modifications.push({
					source: 'target',
					from: { defense },
					mods: Array<string>(totalDefense[defense]).fill(DieTypes.Setback.GLYPH),
				});
			}

			modifications.push(...silhouetteDifferenceModifications(attack.attacker, target));
		}
	}

	return modifications;
}

// A character over their encumbrance threshold adds one Setback per point over it to their Agility and Brawn checks,
// whichever skill they roll with it (CRB p. 85). Only characters have a threshold.
function encumbranceModifications(actor: PoolModificationActor, { characteristic }: CheckForPoolModifications): ExternalPoolModification[] {
	if (actor.type !== 'character' || (characteristic !== 'agility' && characteristic !== 'brawn')) {
		return [];
	}

	const encumbrance = (actor.system as { currentEncumbrance?: Encumbrance }).currentEncumbrance;
	if (!encumbrance || !isEncumbered(encumbrance)) {
		return [];
	}

	return [
		{
			source: 'self',
			from: { encumbrance },
			mods: Array<string>(encumbrance.value - encumbrance.threshold).fill(DieTypes.Setback.GLYPH),
		},
	];
}

// The checks made with a damaged item get a Setback at minor damage, and one more Difficulty die at moderate damage
// (CRB p. 89, Table I.5-4). Major damage makes the item unusable, which the attack refuses before any check.
const DAMAGE_MODIFICATIONS: Record<HinderingDamage, string> = {
	minor: DieTypes.Setback.GLYPH,
	moderate: DIE_GLYPHS.Difficulty,
};

function itemDamageModifications(weapon: DamageableItem | undefined): ExternalPoolModification[] {
	const damage = weapon?.system.damage;
	if (!weapon || (damage !== 'minor' && damage !== 'moderate')) {
		return [];
	}

	return [
		{
			source: 'self',
			from: { itemDamage: { name: weapon.name, uuid: weapon.uuid, damage } },
			mods: [DAMAGE_MODIFICATIONS[damage]],
		},
	];
}

// An attack against a target two or more silhouettes larger is one difficulty easier, and one difficulty harder against
// a target two or more smaller (CRB p. 109, which p. 222 applies to vehicles).
function silhouetteDifferenceModifications(attacker: SilhouettedActor, target: SilhouettedActor): ExternalPoolModification[] {
	const targetSilhouette = silhouetteOf(target);
	const attackerSilhouette = silhouetteOf(attacker);
	if (targetSilhouette === undefined || attackerSilhouette === undefined) {
		return [];
	}

	const difference = targetSilhouette - attackerSilhouette;
	if (Math.abs(difference) < 2) {
		return [];
	}

	return [
		{
			source: 'target',
			from: { silhouette: { target: targetSilhouette, attacker: attackerSilhouette } },
			mods: [difference > 0 ? removalGlyph(DIE_GLYPHS.Difficulty) : DIE_GLYPHS.Difficulty],
		},
	];
}

/**
 * The kind of an attack, as the defense it meets (CRB p. 104): the one its skill makes, whatever the weapon's range, so
 * that a pike's Melee (Heavy) attack at short range is a melee one (RoT p. 93). When the skill makes none, melee with a
 * weapon of engaged range, ranged with one of any other.
 */
function attackKind({ attackRange, skillAttackKind }: CombatCheck): AttackKind {
	return skillAttackKind ?? (attackRange === 'engaged' ? 'melee' : 'ranged');
}

function silhouetteOf({ system }: SilhouettedActor) {
	const silhouette: unknown = system.silhouette;
	return typeof silhouette === 'number' ? silhouette : undefined;
}

// The item types whose qualities' and attachments' Pool Modifications change only the attacks made with the item.
const WEAPON_TYPES = ['weapon', 'vehicleWeapon'];

// Whether an effect is a weapon's quality's or attachment's, or one of its own marked for its attacks only, whose Pool
// Modifications change only the attacks made with that weapon, rather than every check its keys name, as an armor's do
// (#694, #702, #929).
function isWeaponAttackEffect(effect: PoolModificationEffect) {
	return (
		(effectTag(effect, QUALITY_FLAG) !== undefined || changesEveryProfile(effect)) &&
		WEAPON_TYPES.includes(sourceItem(effect)?.type ?? '')
	);
}

// Whether a weapon's effect changes the attacks made with any of its Weapon Profiles: an attachment's, or one of its own
// marked for its attacks only. A quality's changes those of the profile that holds it alone.
function changesEveryProfile(effect: PoolModificationEffect) {
	return effectTag(effect, ATTACHMENT_FLAG) !== undefined || isForWeaponAttacksOnly(effect, sourceItem(effect));
}

// Whether an effect belongs to a weapon's quality that another of the weapon's profiles holds at a higher rank: a quality
// counts once per weapon for those who target its wielder, as it does in its numeric changes.
function isOutrankedEffect(effect: PoolModificationEffect) {
	return isOutrankedQualityEffect(effect, sourceItem(effect)?.system);
}

function* effectsExcept(effects: Iterable<PoolModificationEffect>, excluded: (effect: PoolModificationEffect) => boolean) {
	for (const effect of effects) {
		if (!excluded(effect)) {
			yield effect;
		}
	}
}

// The effects of the qualities of the Weapon Profile an attack is made with, and those of the weapon that change every
// profile, read from the weapon itself: a vehicle weapon's never reach the crew member who fires it.
function weaponAttackEffects({ weapon, attackQualities = [] }: CombatCheck) {
	const ids = new Set(attackQualities.map((quality) => quality.id).filter((id) => id !== ''));
	return [...(weapon?.effects ?? [])].filter((effect) => ids.has(effectTag(effect, QUALITY_FLAG) ?? '') || changesEveryProfile(effect));
}

function effectModifications(
	effects: Iterable<PoolModificationEffect>,
	source: PoolModificationSource,
	{ characteristic, skillName, purpose }: CheckForPoolModifications,
) {
	const attack = purpose.kind === 'combat' ? purpose : undefined;

	const appliesToCheck = (key: PoolModificationKey | undefined) => {
		if (key?.source !== source) {
			return false;
		}

		switch (key.kind) {
			case 'check':
				return key.subject === '';
			case 'char':
				return key.subject === (characteristic as string | undefined);
			case 'skill':
				return !!skillName && skillNamesMatch(key.subject, skillName);
			// An attack is a combat check: Aim and Guarded Stance change the actor's own, cover and prone those made against
			// them, by their kind, and prone the actor's own melee attacks (CRB p. 98–100, 108).
			case 'combat':
				return key.subject === '' && !!attack;
			case 'melee':
			case 'ranged':
				return key.subject === '' && !!attack && attackKind(attack) === key.kind;
		}
	};

	// What an effect's Attack Changes add to the attack, undefined when they add nothing: only the actor's own effects
	// change the attacks it makes, by their kind, as its Pool Modifications of combat checks do.
	const attackChanges = (
		changes: PoolModificationEffect['system']['changes'],
		scaled: (change: { key: string; value: unknown }) => unknown,
	): AttackChanges | undefined => {
		const totals: AttackChanges = {};
		if (source !== 'self' || !attack) {
			return undefined;
		}

		for (const { key = '', value } of changes) {
			const attackKey = decodeAttackChangeKey(key);
			const amount = attackKey && parseWholeNumber(scaled({ key, value }));
			if (attackKey && amount && (attackKey.scope === 'combat' || attackKey.scope === attackKind(attack))) {
				totals[attackKey.field] = (totals[attackKey.field] ?? 0) + amount;
			}
		}

		return Object.keys(totals).length > 0 ? totals : undefined;
	};

	const modifications: ExternalPoolModification[] = [];

	for (const effect of effects) {
		if (effect.isSuppressed) {
			continue;
		}

		const item = sourceItem<SourceItem & { name: string; uuid: string | null }>(effect);
		const quality = effectQuality(effect, item?.system);
		const described = quality ?? effectAttachment(effect, item?.system);
		const mods = effect.system.changes.flatMap(({ key = '', value }) =>
			appliesToCheck(decodeKey(key)) && typeof value === 'string'
				? parsePoolModifications(scaledChangeValue(item, { key, value }, quality))
				: [],
		);

		const attack = attackChanges(effect.system.changes, (change) => scaledChangeValue(item, change, quality));

		if (mods.length > 0 || attack) {
			modifications.push({
				source,
				from: {
					effect: effect.name,
					uuid: effect.uuid,
					...(item?.uuid && { item: { name: item.name, uuid: item.uuid } }),
					...(described && { described: { name: described.name, description: described.description } }),
				},
				mods: mods.sort(sortPoolModifications),
				...(attack && { attack }),
				// An active quality applies only once the roller triggers it, by spending Advantage (CRB p. 86).
				...(quality?.activation === 'active' && { startsOff: true }),
			});
		}
	}

	return modifications;
}

/**
 * A change as an effect stores it: a string `type`, a `phase`, and a value of any type.
 */
type StoredChange = {
	key: string;
	value: unknown;
	priority?: number | null;
	type?: string;
	phase?: string;
};

/**
 * A change as the effect sheets edit it: a Pool Modification's key without its subject, which is edited in its own
 * field.
 */
export type EditedChange = StoredChange & {
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
	const names = [
		...compendiumSkillNames.map((name) => changeSkillNames.find((changeName) => skillNamesMatch(changeName, name)) ?? name),
		...changeSkillNames,
	];
	return Object.fromEntries(names.map((name) => [name, name]));
}

const PROVIDED_DEFENSE_KEYS: readonly string[] = ['system.providedDefense.melee', 'system.providedDefense.ranged'];

/**
 * Whether a change provides defense, of which the actor keeps the best (CRB p. 106).
 */
function isProvidedDefenseKey(key: string) {
	return PROVIDED_DEFENSE_KEYS.includes(key);
}

/**
 * Whether a change is one the system reads itself, as a whole number added to a roll or to what it heals: a change to
 * Critical Injury rolls, to what a recovery heals, or an Attack Change.
 */
function isWholeNumberChangeKey(key: string) {
	return isCriticalChangeKey(key) || isHealingChangeKey(key) || isAttackChangeKey(key);
}

/**
 * Which field of the effect sheets edits what a change applies to, given the key picked for it.
 */
export function subjectFieldForKey(key: string) {
	// A change the system reads as a whole number has no subject, and no mode: it applies to nothing but the rolls or the
	// healing that read it. Nor has an Item Change, which its item always adds, or a change to the defense a source
	// provides, which is always an Upgrade.
	if (isWholeNumberChangeKey(key) || isItemChangeKey(key) || isProvidedDefenseKey(key)) {
		return 'check-selection';
	}

	// A Career Skill change names its skill, and has no mode either.
	if (key === CAREER_SKILL_CHANGE_KEY) {
		return 'skill-selection';
	}

	switch (key.match(BASE_KEY_PATTERN)?.[1] as PoolModificationKind | undefined) {
		case 'check':
		case 'combat':
		case 'melee':
		case 'ranged':
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
 * A copy of a change, as the effect sheets edit it. A value of another type than a string is edited as its JSON, as
 * Foundry's own sheet does.
 */
export function toEditedChange(change: StoredChange): EditedChange {
	const value = typeof change.value === 'string' ? change.value : JSON.stringify(change.value);
	const editedChange: EditedChange = { ...change, value };
	const key = decodeKey(change.key);
	const careerSkill = decodeCareerSkillChangeKey(change.key);

	if (careerSkill !== undefined) {
		editedChange.key = CAREER_SKILL_CHANGE_KEY;
		editedChange.skill = careerSkill;
	} else if (key) {
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
 * A change edited in the effect sheets, turned back into a change. Pool Modifications get their full key, their own
 * type, which Foundry applies to nothing, and lose their value unless it only holds glyphs. A change to Critical
 * Injury rolls or to what a recovery heals, or an Attack Change, which the system reads itself too, gets the custom type, and
 * loses its value unless it is a whole number. An Item Change, which its item always adds, gets the custom type, and keeps its value. A Career Skill
 * change gets its skill in its key, the custom type and no value. A change to the defense a source provides gets the
 * Upgrade type, so that two such effects don't stack. Any other change is returned as it is.
 */
export function fromEditedChange(change: EditedChange): EditedChange {
	const { char, skill, ...stored } = change;
	// Foundry's sheet parses the value typed as JSON, which turns a number into one.
	const value = typeof change.value === 'string' ? change.value : typeof change.value === 'number' ? String(change.value) : '';

	if (isProvidedDefenseKey(change.key)) {
		return { ...stored, type: 'upgrade' };
	}

	if (isWholeNumberChangeKey(change.key)) {
		return { ...stored, type: 'custom', value: parseWholeNumber(value) !== undefined ? value.trim() : '' };
	}

	if (isItemChangeKey(change.key)) {
		return { ...stored, type: 'custom' };
	}

	if (change.key === CAREER_SKILL_CHANGE_KEY) {
		return { ...stored, key: skill ? careerSkillChangeKey(skill) : CAREER_SKILL_CHANGE_KEY, type: 'custom', value: '' };
	}

	const baseKey = change.key.match(BASE_KEY_PATTERN);
	if (!baseKey) {
		return change;
	}

	const kind = baseKey[1] as PoolModificationKind;
	return {
		...stored,
		key: encodeKey({ kind, source: baseKey[2] as PoolModificationSource, subject: (kind === 'char' ? char : skill) ?? '' }),
		type: POOL_MODIFICATION_TYPE,
		value: isPoolModificationValue(value) ? value : '',
	};
}
