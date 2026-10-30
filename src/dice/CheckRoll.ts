/** @file Rolling a check's dice pool with Foundry, and the chat message that shows its results. */

import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysDie } from '@/dice/dice/GenesysDie';
import { Check, checkDescription } from '@/dice/Check';
import { compileDiceFormula, compileSymbolsData, DicePool } from '@/dice/DicePool';
import { CardResults, cardResults, GenesysRollResults, rollResults, showsAttackDetails } from '@/dice/RollResults';
import { enrichedQualities } from '@/item/ChatCards';
import { attackDamage, damageFormula } from '@/item/Weapons';
import type { AttackProfile } from '@/item/WeaponProfiles';
import { CharacteristicsContainer } from '@/data/Characteristics';

const CHECK_TEMPLATE = 'systems/genesys/templates/chat/rolls/skill.hbs';
const ATTACK_TEMPLATE = 'systems/genesys/templates/chat/rolls/attack.hbs';

/**
 * A check and the dice pool it rolls.
 */
export type CheckRoll = {
	check: Check;
	dicePool: DicePool;
};

/**
 * The data of a dice pool's roll: the symbols its modifications add.
 */
type PoolRollData = { symbols: Record<string, number> };

/**
 * A dice pool rolled, and the results read from its dice.
 */
type PoolRoll = {
	roll: Roll<PoolRollData>;
	results: GenesysRollResults;
};

/**
 * Roll a dice pool, and read its results.
 */
export async function rollPool(dicePool: DicePool): Promise<PoolRoll> {
	const roll = new Roll(compileDiceFormula(dicePool), { symbols: compileSymbolsData(dicePool) });
	await roll.evaluate();

	return { roll, results: parseRollResults(roll) };
}

/**
 * The data of the chat message that shows a check's roll: the check's card, or the attack's card with the Weapon Profile
 * an attack is rolled with.
 */
export async function checkMessageData(check: Check, { roll, results }: PoolRoll, attack?: AttackProfile) {
	const card = cardResults(results);
	const data = { description: checkDescription(check, game.i18n), results, card };
	const content = attack
		? await foundry.applications.handlebars.renderTemplate(ATTACK_TEMPLATE, {
				...data,
				...(await attackCardData(check, attack, results, card)),
			})
		: await foundry.applications.handlebars.renderTemplate(CHECK_TEMPLATE, data);

	return {
		user: game.user.id,
		speaker: { actor: (check.actor as GenesysActor | undefined)?.id },
		content,
		rolls: [roll],
	};
}

/**
 * What an attack's card shows on top of the check's: the damage, the critical and the qualities of the Weapon Profile.
 */
async function attackCardData(check: Check, profile: AttackProfile, results: GenesysRollResults, card: CardResults) {
	// A vehicle has no characteristics to add to its weapons' damage.
	const characteristics = (check.actor?.system as { characteristics?: CharacteristicsContainer } | undefined)?.characteristics;
	const { baseDamage, characteristic } = damageFormula(profile);

	return {
		totalDamage: attackDamage(profile, characteristics, results.netSuccess),
		damageFormula: characteristic && characteristics ? `${game.i18n.localize(characteristic)} + ${baseDamage}` : baseDamage.toString(),
		critical: profile.critical,
		qualities: await enrichedQualities(profile.qualities),
		showAttackDetails: showsAttackDetails(card, CONFIG.genesys.settings.showAttackDetailsOnFailure),
	};
}

/**
 * Roll a check, or an attack with the Weapon Profile it is rolled with, and post its results to the chat.
 */
export async function rollCheck({ check, dicePool }: CheckRoll, attack?: AttackProfile) {
	const poolRoll = await rollPool(dicePool);
	await ChatMessage.create(await checkMessageData(check, poolRoll, attack), { rollMode: game.settings.get('core', 'rollMode') });
}

/**
 * The results of a roll, from the faces of its dice and the extra symbols of its data.
 */
export function parseRollResults(roll: Roll<PoolRollData>): GenesysRollResults {
	const faces = roll.dice.reduce((faces: Record<string, string[]>, die) => {
		const genDie = <GenesysDie>die;
		if (faces[genDie.denomination] === undefined) {
			faces[genDie.denomination] = die.results.map((r) => genDie.getResultLabel(r));
		} else {
			faces[genDie.denomination].push(...die.results.map((r) => genDie.getResultLabel(r)));
		}

		return faces;
	}, {});

	return rollResults(faces, roll.data.symbols);
}
