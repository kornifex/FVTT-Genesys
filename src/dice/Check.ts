/**
 * @file Checks: what an actor rolls for a skill or a characteristic. A check is resolved into its kind, its characteristic, its rank, whether it uses a super characteristic and its Pool Modifications, then into its dice pool and its chat description.
 */

import type { GenesysItem } from '@/item/GenesysItem';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import { CHARACTERISTIC_ABBREVIATIONS, CHARACTERISTIC_LABELS, Characteristic } from '@/data/Characteristics';
import { Skill, skillToRoll } from '@/data/Skills';
import { buildDicePool, DicePool, parsePoolModifications } from '@/dice/DicePool';
import { ExternalPoolModification, PoolModificationActor, poolModificationsForCheck } from '@/effects/PoolModifications';

/**
 * The kind of a check:
 * - `skill`: a check of a skill the actor owns;
 * - `unranked`: an Unranked Skill Check, of a skill of the Skills Compendium the actor doesn't own;
 * - `characteristic`: a Characteristic Check;
 * - `pool`: a bare dice pool, with neither skill nor characteristic.
 */
type CheckKind = 'skill' | 'unranked' | 'characteristic' | 'pool';

/**
 * What this module needs of a skill.
 */
export type CheckSkill = Skill & {
	system: { characteristic: Characteristic };
};

/**
 * What this module needs of the actor that makes a check, or of its target.
 */
export type CheckActor<S extends CheckSkill = CheckSkill> = PoolModificationActor & {
	skills: S[];
};

/**
 * What this module reads of an actor's data. Vehicles have none of it.
 */
type CheckActorData = {
	characteristics?: Record<Characteristic, number>;
	superCharacteristics?: Set<Characteristic>;
	groupSkillRank?: number;
};

/**
 * The world's rules for checks.
 */
export type CheckRules<S extends CheckSkill = CheckSkill> = {
	compendiumSkills: S[];
	useSuperCharacteristics: boolean;
};

/**
 * The world's rules for checks: its Skills Compendium and its super characteristics setting.
 */
export function worldCheckRules(): CheckRules<GenesysItem<SkillDataModel>> {
	return { compendiumSkills: CONFIG.genesys.skills, useSuperCharacteristics: CONFIG.genesys.settings.useSuperCharacteristics };
}

/**
 * The check asked for.
 */
export type CheckRequest<S extends CheckSkill = CheckSkill> = {
	/**
	 * The skill rolled, resolved as the actor rolls it.
	 */
	skillName?: string;

	/**
	 * The characteristic rolled, as the dice prompt picks it: the skill's when left undefined, none when null.
	 */
	characteristic?: Characteristic | null;

	/**
	 * The characteristic of the Characteristic Check made when there is no skill, or the skill can't be found.
	 */
	fallbackCharacteristic?: Characteristic;

	/**
	 * The target of the check, whose effects and defense bring Pool Modifications. Initiative has none.
	 */
	target?: CheckActor<S>;

	/**
	 * Range of the weapon, for an attack.
	 */
	attackRange?: string;

	/**
	 * Whether the Proficiency dice explode, for a dice pool rolled without an actor.
	 */
	usesSuperCharacteristic?: boolean;
};

/**
 * A Pool Modification of a check, with a key that stays the same when the check is resolved again.
 */
export type CheckPoolModification = ExternalPoolModification & {
	key: string;
};

/**
 * A resolved check.
 */
export type Check<S extends CheckSkill = CheckSkill> = {
	actor?: CheckActor<S>;
	kind: CheckKind;
	skill?: S;
	characteristic?: Characteristic;
	characteristicValue: number;
	rank: number;
	usesSuperCharacteristic: boolean;
	poolModifications: CheckPoolModification[];
};

/**
 * Resolve a check of an actor, or a bare dice pool without one.
 */
export function resolveCheck<S extends CheckSkill>(
	actor: CheckActor<S> | undefined,
	request: CheckRequest<S>,
	rules: CheckRules<S>,
): Check<S> {
	if (!actor) {
		return {
			kind: 'pool',
			characteristicValue: 0,
			rank: 0,
			usesSuperCharacteristic: rules.useSuperCharacteristics && !!request.usesSuperCharacteristic,
			poolModifications: [],
		};
	}

	const data = actor.systemData as CheckActorData;
	const rolledSkill = request.skillName ? skillToRoll(actor.skills, rules.compendiumSkills, request.skillName) : undefined;
	const characteristic =
		request.characteristic === undefined
			? rolledSkill?.skill.system.characteristic ?? request.fallbackCharacteristic
			: request.characteristic ?? undefined;

	let kind: CheckKind = characteristic ? 'characteristic' : 'pool';
	let rank = 0;
	if (rolledSkill?.unranked) {
		kind = 'unranked';
	} else if (rolledSkill) {
		kind = 'skill';
		// A Minion Group rolls the skills it owns at its group skill rank.
		rank = actor.type === 'minion' ? data.groupSkillRank ?? 0 : rolledSkill.skill.system.rank;
	}

	const poolModifications = poolModificationsForCheck(actor, request.target, {
		characteristic,
		skillName: rolledSkill?.skill.name,
		attackRange: request.attackRange,
	});

	return {
		actor,
		kind,
		skill: rolledSkill?.skill,
		characteristic,
		characteristicValue: characteristic ? data.characteristics?.[characteristic] ?? 0 : 0,
		rank,
		usesSuperCharacteristic: rules.useSuperCharacteristics && !!characteristic && !!data.superCharacteristics?.has(characteristic),
		poolModifications: poolModifications.map((modification) => ({ ...modification, key: poolModificationKey(modification) })),
	};
}

function poolModificationKey({ source, from }: ExternalPoolModification) {
	return `${source}.${'effect' in from ? `effect.${from.effect}` : `defense.${from.defense}`}`;
}

/**
 * What the roller chooses for a check's dice pool.
 */
export type PoolChoices = {
	/**
	 * The difficulty, as Pool Modification glyphs.
	 */
	difficulty: string;
	manualChanges?: string[];
	isEnabled: (modification: CheckPoolModification) => boolean;
};

/**
 * The dice pool of a check.
 */
export function checkDicePool(check: Check, { difficulty, manualChanges = [], isEnabled }: PoolChoices): DicePool {
	return buildDicePool({
		characteristicValue: check.characteristicValue,
		skillRank: check.rank,
		usesSuperCharacteristic: check.usesSuperCharacteristic,
		modifications: {
			baseDifficulty: parsePoolModifications(difficulty),
			manualChanges,
			effects: check.poolModifications.map((modification) => ({
				name: modification.key,
				enabled: isEnabled(modification),
				mods: modification.mods,
			})),
		},
	});
}

/**
 * What a check is rolled for: a plain check, an attack with a weapon, or initiative.
 */
export type CheckPurpose = { kind: 'check' } | { kind: 'attack'; weaponName: string } | { kind: 'initiative' };

/**
 * The localization functions the chat description is written with.
 */
export type Localizer = {
	localize(key: string): string;
	format(key: string, data: Record<string, string>): string;
};

/**
 * The description of a check in its chat message, or undefined when it has none.
 */
export function checkDescription(check: Check, purpose: CheckPurpose, i18n: Localizer): string | undefined {
	const superChar = check.usesSuperCharacteristic ? 'super-char' : 'hide-it';
	const characteristicName = check.characteristic && i18n.localize(CHARACTERISTIC_LABELS[check.characteristic]);
	const characteristicAbbr = check.characteristic && i18n.localize(CHARACTERISTIC_ABBREVIATIONS[check.characteristic]);
	const skill = check.skill?.name;

	switch (purpose.kind) {
		case 'initiative':
			return i18n.format('Genesys.Rolls.Description.Initiative', { skill: skill ?? characteristicName ?? '', superChar });

		case 'attack':
			if (skill) {
				return characteristicAbbr
					? i18n.format('Genesys.Rolls.Description.AttackSkill', {
							name: purpose.weaponName,
							skill,
							characteristic: characteristicAbbr,
							superChar,
						})
					: i18n.format('Genesys.Rolls.Description.AttackSkillWithoutCharacteristic', { name: purpose.weaponName, skill });
			}

			return (
				characteristicName &&
				i18n.format('Genesys.Rolls.Description.AttackCharacteristic', {
					name: purpose.weaponName,
					characteristic: characteristicName,
				})
			);

		case 'check':
			if (skill) {
				return characteristicAbbr
					? i18n.format('Genesys.Rolls.Description.Skill', { skill, characteristic: characteristicAbbr, superChar })
					: i18n.format('Genesys.Rolls.Description.SkillWithoutCharacteristic', { skill });
			}

			if (characteristicName) {
				return i18n.format('Genesys.Rolls.Description.Characteristic', { characteristic: characteristicName });
			}

			// A bare dice pool is only described when rolled without an actor.
			return check.actor ? undefined : i18n.format('Genesys.Rolls.Description.Simple', { superChar });
	}
}
