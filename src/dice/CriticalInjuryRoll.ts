/** @file Rolling a Critical Injury: how many times an attack triggers it, the lines of its roll's modifier, and the results its total draws from the world's table. */
import { isCount, isRecord } from '@/data/parsing';
import { effectTag } from '@/item/data/EffectTags';
import { type RankedSystem, scalingRank } from '@/item/data/Talents';
import { effectQuality, isOutrankedQuality, QUALITY_FLAG, qualityNameKey, qualityRank } from '@/item/data/Qualities';

/**
 * What the number of times an attack triggers a Critical Injury depends on.
 */
type CriticalAttackResults = {
	succeeded: boolean;
	netAdvantage: number;
	triumphs: number;
	/** The Critical rating of the Weapon Profile, 0 or less for none. */
	critical: number;
};

/**
 * How many times an attack can trigger a Critical Injury: once for each time its net Advantage reaches the Critical
 * rating (CRB p. 102), and once for each Triumph, whatever the rating (CRB p. 103). Only a successful hit triggers one
 * (CRB p. 102); the system checks no soak, which the GM judges.
 */
export function criticalTriggers({ succeeded, netAdvantage, triumphs, critical }: CriticalAttackResults): number {
	if (!succeeded) {
		return 0;
	}

	const fromAdvantage = critical > 0 ? Math.floor(Math.max(netAdvantage, 0) / critical) : 0;
	return fromAdvantage + Math.max(triumphs, 0);
}

/**
 * The flag of the `genesys` scope under which an attack's chat message keeps the Critical Injury it triggered.
 */
export const CRITICAL_INJURY_FLAG = 'criticalInjury';

/**
 * What an attack's chat message keeps for the Critical Injury it triggered, in its flags: how many times it triggered one,
 * the uuids of the attacker and of the single target, if any, and the name, uuid and qualities of the Weapon Profile, as
 * they were when the attack was rolled. A message of 0.7.0-rc.1 has no weapon uuid and no quality ids.
 */
type AttackCriticalInjuryFlag = {
	/** How many times the attack triggered a Critical Injury, 1 or more. */
	triggers: number;
	attacker: string | null;
	target: string | null;
	weapon: { name: string; uuid?: string | null; qualities: (Omit<AttackQuality, 'id'> & { id?: string })[] };
};

/**
 * What a chat message's Critical Injury flag offers, parsed: the Critical Injury an attack triggered, with the weapon as
 * it was rolled, or the one of a character gone past their wound threshold, without an attack.
 */
export type ParsedCriticalInjury =
	| { kind: 'attack'; triggers: number; attacker: string | null; target: string | null; weapon: CriticalAttackWeapon }
	| { kind: 'threshold'; target: string };

/**
 * The Critical Injury a chat message's flag offers, told apart by the weapon only an attack's holds, or undefined when
 * the flag is malformed: a message of another version or edited by hand is refused, not read. The uuid and the quality
 * ids of a message of 0.7.0-rc.1's weapon are missing, so none of the weapon's quality effects counts for it.
 */
export function parseCriticalInjuryFlag(value: unknown): ParsedCriticalInjury | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	if (!('weapon' in value)) {
		return typeof value.target === 'string' ? { kind: 'threshold', target: value.target } : undefined;
	}

	const { triggers, attacker, target } = value;
	const weapon = parseAttackWeapon(value.weapon);
	if (!isCount(triggers) || triggers < 1 || !isUuidOrNull(attacker) || !isUuidOrNull(target) || !weapon) {
		return undefined;
	}
	return { kind: 'attack', triggers, attacker, target, weapon };
}

function isUuidOrNull(value: unknown): value is string | null {
	return value === null || typeof value === 'string';
}

function parseAttackWeapon(value: unknown): CriticalAttackWeapon | undefined {
	if (!isRecord(value) || typeof value.name !== 'string' || !isUuidOrUndefined(value.uuid) || !Array.isArray(value.qualities)) {
		return undefined;
	}

	const qualities: AttackQuality[] = [];
	for (const entry of value.qualities) {
		const quality = parseAttackQuality(entry);
		if (!quality) {
			return undefined;
		}
		qualities.push(quality);
	}
	return { name: value.name, uuid: value.uuid ?? null, qualities };
}

function isUuidOrUndefined(value: unknown): value is string | null | undefined {
	return value === undefined || isUuidOrNull(value);
}

function parseAttackQuality(value: unknown): AttackQuality | undefined {
	if (!isRecord(value) || typeof value.name !== 'string' || typeof value.isRated !== 'boolean' || typeof value.rating !== 'number') {
		return undefined;
	}
	if (value.id !== undefined && typeof value.id !== 'string') {
		return undefined;
	}
	return { id: value.id ?? '', name: value.name, isRated: value.isRated, rating: value.rating };
}

/**
 * What a chat message offering the Critical Injury of a character gone past their wound threshold keeps in its flags: the
 * uuid of the character, and no attack.
 */
type ThresholdCriticalInjuryFlag = { target: string };

/**
 * What a chat message that offers to roll a Critical Injury keeps for it, in its flags: an attack's, or a wound
 * threshold's.
 */
export type CriticalInjuryFlag = AttackCriticalInjuryFlag | ThresholdCriticalInjuryFlag;

/**
 * What each extra trigger, each existing injury and each point of Vicious adds to the roll (CRB pp. 89, 103, 114).
 */
const STEP = 10;

/**
 * The bonus of the triggers an attacker spends on one Critical Injury: +10 for each past the first (CRB p. 103).
 */
export function extraTriggersBonus(spent: number): number {
	return STEP * Math.max(spent - 1, 0);
}

/**
 * How many Critical Injuries an actor already has, among its items.
 */
function injuryCount(items: Iterable<{ type: string }>): number {
	let count = 0;
	for (const item of items) {
		if (item.type === 'injury') count += 1;
	}
	return count;
}

/**
 * The bonus of the Critical Injuries an actor already has: +10 for each (CRB p. 114).
 */
export function existingInjuriesBonus(items: Iterable<{ type: string }>): number {
	return STEP * injuryCount(items);
}

/**
 * A weapon's quality, as an attack reads it.
 */
type AttackQuality = { id: string; name: string; isRated: boolean; rating: number };

/**
 * The weapon an attack is made with: its Weapon Profile's qualities, and the weapon's uuid, null for an attack that has
 * no weapon, as a spell's.
 */
type CriticalAttackWeapon = { name: string; uuid: string | null; qualities: readonly AttackQuality[] };

/**
 * The Vicious rating of a weapon's qualities, 0 without Vicious (CRB p. 89): a quality is Vicious by its name, in any of
 * the names given, whatever its case, until qualities are items the system recognises otherwise.
 */
export function viciousRating(qualities: readonly Pick<AttackQuality, 'name' | 'rating'>[], names: readonly string[]): number {
	const viciousNames = new Set(names.map(qualityNameKey));
	return qualities
		.filter((quality) => viciousNames.has(qualityNameKey(quality.name)))
		.reduce((rating, quality) => Math.max(rating, quality.rating), 0);
}

/**
 * The keys of the effect changes to Critical Injury rolls: those the effect's actor inflicts on others, and those it
 * suffers. Their value is a whole number, added to the roll.
 */
export const CRITICAL_CHANGE_KEYS = {
	inflicted: 'genesys.critical.inflicted',
	suffered: 'genesys.critical.suffered',
} as const;

/**
 * Whose Critical Injury roll a change modifies: those its actor inflicts, or those it suffers.
 */
type CriticalChangeKind = keyof typeof CRITICAL_CHANGE_KEYS;

const CRITICAL_VALUE_PATTERN = /^\s*[+-]?\d+\s*$/;

/**
 * Whether a change modifies Critical Injury rolls.
 */
export function isCriticalChangeKey(key: string) {
	return Object.values<string>(CRITICAL_CHANGE_KEYS).includes(key);
}

/**
 * Whether a change's value is one a Critical Injury roll adds: a whole number, signed or not.
 */
export function isCriticalChangeValue(value: string) {
	return CRITICAL_VALUE_PATTERN.test(value);
}

/**
 * What this module needs of the item an effect comes from. A talent scales its effects with its rank when it says so, a
 * weapon's or an armor's quality with its rating.
 */
type CriticalSourceItem = {
	name: string;
	uuid: string | null;
	type: string;
	system: RankedSystem;
};

/**
 * What this module needs of an effect.
 */
export type CriticalEffect = {
	name: string;
	uuid: string;
	isSuppressed: boolean;
	/** The effect's flags, which tag the effect of a weapon's or an armor's quality. */
	flags?: object;
	// v14 lets a change hold a value of any type, a number among them.
	changes: { key?: string; value: unknown }[];
	originItem?: CriticalSourceItem;
};

/**
 * What this module needs of an actor a Critical Injury is rolled for, or of the attacker who inflicts it.
 */
export type CriticalInjuryActor = {
	items: Iterable<{ type: string }>;
	allApplicableEffects(): Iterable<CriticalEffect>;
};

/**
 * Where a talent's line of the modifier comes from: an effect, and the item it comes from.
 */
type CriticalBonusSource = { name: string; uuid: string; item?: { name: string; uuid: string } };

/**
 * What an effect adds to a Critical Injury roll.
 */
type CriticalEffectBonus = CriticalBonusSource & { value: number };

function changeValue(value: unknown): number | undefined {
	if (typeof value === 'number') {
		return Number.isInteger(value) ? value : undefined;
	}

	return typeof value === 'string' && isCriticalChangeValue(value) ? parseInt(value, 10) : undefined;
}

const WEAPON_TYPES = ['weapon', 'vehicleWeapon'];

/**
 * How many times an effect's change counts, or undefined when the effect doesn't apply to this roll: its quality's rank
 * for a quality, its talent's rank for a talent that scales with rank, once otherwise.
 */
function effectRanks(effect: CriticalEffect, kind: CriticalChangeKind, weapon: CriticalAttackWeapon | undefined): number | undefined {
	const item = effect.originItem;
	const qualityId = effectTag(effect, QUALITY_FLAG);
	if (qualityId === undefined || !item) {
		return scalingRank(item);
	}

	if (!WEAPON_TYPES.includes(item.type)) {
		const quality = effectQuality(effect, item.system);
		return quality ? qualityRank(quality) : 1;
	}

	if (kind !== 'inflicted' || !weapon?.uuid || weapon.uuid !== item.uuid) {
		return undefined;
	}

	const quality = weapon.qualities.find(({ id }) => id === qualityId);
	return quality && !isOutrankedQuality(quality, weapon.qualities) ? qualityRank(quality) : undefined;
}

/**
 * What the effects of an actor add to the Critical Injury rolls it inflicts or suffers, effect by effect: such an effect
 * comes from a talent such as Lethal Blows, or Durable for a negative value. A change counts once per rank of its talent
 * when the talent scales with rank, and once per rank of a rated quality, as Pool Modifications do.
 *
 * A weapon's quality changes only the injuries inflicted by an attack with that weapon, at the highest rank among its
 * copies on the Weapon Profile; without such a weapon, it changes none. An armor's quality changes the injuries its wearer
 * suffers or inflicts, as its talents do.
 * @param weapon The weapon of the attack the injury is inflicted by, if any.
 */
export function criticalEffectBonuses(
	actor: CriticalInjuryActor,
	kind: CriticalChangeKind,
	weapon?: CriticalAttackWeapon,
): CriticalEffectBonus[] {
	const bonuses: CriticalEffectBonus[] = [];

	for (const effect of actor.allApplicableEffects()) {
		if (effect.isSuppressed) {
			continue;
		}

		const values = effect.changes.flatMap(({ key, value }) => {
			const parsed = key === CRITICAL_CHANGE_KEYS[kind] ? changeValue(value) : undefined;
			return parsed === undefined ? [] : [parsed];
		});
		if (values.length === 0) {
			continue;
		}

		const item = effect.originItem;
		const ranks = effectRanks(effect, kind, weapon);
		if (ranks === undefined) {
			continue;
		}

		bonuses.push({
			name: effect.name,
			uuid: effect.uuid,
			...(item?.uuid && { item: { name: item.name, uuid: item.uuid } }),
			value: ranks * values.reduce((sum, value) => sum + value, 0),
		});
	}

	return bonuses;
}

/**
 * The attack a Critical Injury is rolled for: how many times it triggered one, the weapon it was made with, whose
 * qualities may hold Vicious, and the attacker, whose effects modify the injuries they inflict.
 */
type CriticalInjuryAttack<A extends CriticalInjuryActor = CriticalInjuryActor> = {
	triggers: number;
	weapon?: CriticalAttackWeapon;
	attacker?: A;
};

/**
 * What a Critical Injury is rolled for: the actor who suffers it, when known, and the attack that inflicts it, when it
 * comes from one. A roll without an attack, as for wounds past the threshold, has no attack.
 */
export type CriticalInjuryRequest<A extends CriticalInjuryActor = CriticalInjuryActor> = {
	actor?: A;
	attack?: CriticalInjuryAttack<A>;
};

/**
 * A line of a Critical Injury roll's modifier, which the roller can change in the dialog: the triggers spent past the
 * first, the weapon's Vicious rating, the actor's existing injuries, a talent of the attacker or of the actor, and the
 * roller's free modifier. `count` is what the value was computed from: the triggers spent, the Vicious rating, the
 * injuries.
 */
export type CriticalInjuryLine =
	| { kind: 'triggers' | 'vicious' | 'injuries'; count: number; value: number }
	| { kind: CriticalChangeKind; source: CriticalBonusSource; value: number }
	| { kind: 'free'; value: number };

/**
 * The lines a Critical Injury roll's modifier starts with. An attack starts with one trigger spent, which the roller
 * raises up to the attack's triggers.
 * @param viciousNames The names Vicious goes by: its English name and the world language's.
 */
export function criticalInjuryLines({ actor, attack }: CriticalInjuryRequest, viciousNames: readonly string[]): CriticalInjuryLine[] {
	const lines: CriticalInjuryLine[] = [];
	const effectLines = (kind: CriticalChangeKind, of: CriticalInjuryActor, weapon?: CriticalAttackWeapon) =>
		criticalEffectBonuses(of, kind, weapon).map(({ value, ...source }): CriticalInjuryLine => ({ kind, source, value }));

	if (attack) {
		lines.push({ kind: 'triggers', count: 1, value: extraTriggersBonus(1) });

		const vicious = viciousRating(attack.weapon?.qualities ?? [], viciousNames);
		if (vicious > 0) {
			lines.push({ kind: 'vicious', count: vicious, value: STEP * vicious });
		}

		if (attack.attacker) {
			lines.push(...effectLines('inflicted', attack.attacker, attack.weapon));
		}
	}

	if (actor) {
		lines.push({ kind: 'injuries', count: injuryCount(actor.items), value: existingInjuriesBonus(actor.items) });
		lines.push(...effectLines('suffered', actor));
	}

	lines.push({ kind: 'free', value: 0 });
	return lines;
}

/**
 * The modifier of a Critical Injury roll: the sum of its lines, a line emptied in the dialog counting as 0.
 */
export function criticalModifier(lines: readonly { value: number }[]): number {
	return lines.reduce((sum, { value }) => sum + (Number.isFinite(value) ? Math.trunc(value) : 0), 0);
}

/**
 * The formula of a Critical Injury roll: a d100 plus its modifier (CRB p. 114).
 */
export function criticalInjuryFormula(modifier: number): string {
	if (modifier === 0) {
		return '1d100';
	}

	return `1d100 ${modifier < 0 ? '-' : '+'} ${Math.abs(modifier)}`;
}

/**
 * The results a Critical Injury roll's total draws from a table: those whose range holds it. A total above the table
 * draws its last result, as the "151+" of Table I.6–10 reads (CRB p. 115), and a total below it, which a negative
 * modifier gives, its first.
 */
export function criticalInjuryResults<R extends { range: readonly [number, number] | readonly number[] }>(
	results: readonly R[],
	total: number,
): R[] {
	if (results.length === 0) {
		return [];
	}

	const lowest = Math.min(...results.map(({ range }) => range[0]));
	const highest = Math.max(...results.map(({ range }) => range[1]));
	const drawn = Math.min(Math.max(total, lowest), highest);

	return results.filter(({ range }) => range[0] <= drawn && drawn <= range[1]);
}
