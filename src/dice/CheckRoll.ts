/** @file Rolling a check's dice pool with Foundry, and the chat message that shows its results. */

import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysDie } from '@/dice/dice/GenesysDie';
import { Check, checkDescription } from '@/dice/Check';
import { compileDiceFormula, compileSymbolsData, DicePool } from '@/dice/DicePool';
import { CardResults, cardResults, GenesysRollResults, rollResults, showsAttackDetails } from '@/dice/RollResults';
import { GenesysItem } from '@/item/GenesysItem';
import { enrichedQualities } from '@/item/ChatCards';
import { attackDamage, damageFormula } from '@/item/Weapons';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { CharacteristicsContainer } from '@/data/Characteristics';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';

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
 * A dice pool rolled, and the results read from its dice.
 */
type PoolRoll = {
	roll: Roll;
	results: GenesysRollResults;
};

type AttackWeapon = GenesysItem<WeaponDataModel | VehicleWeaponDataModel>;

/**
 * Roll a dice pool, and read its results.
 */
export async function rollPool(dicePool: DicePool): Promise<PoolRoll> {
	const roll = new Roll(compileDiceFormula(dicePool), { symbols: compileSymbolsData(dicePool) });
	await roll.evaluate();

	return { roll, results: parseRollResults(roll) };
}

/**
 * The data of the chat message that shows a check's roll: the check's card, or the attack's card with the weapon an
 * attack is rolled with.
 */
export async function checkMessageData(check: Check, { roll, results }: PoolRoll, weapon?: AttackWeapon) {
	const card = cardResults(results);
	const data = { description: checkDescription(check, game.i18n), results, card };
	const content = weapon
		? await renderTemplate(ATTACK_TEMPLATE, { ...data, ...(await attackCardData(check, weapon, results, card)) })
		: await renderTemplate(CHECK_TEMPLATE, data);

	return {
		user: game.user.id,
		speaker: { actor: (check.actor as GenesysActor | undefined)?.id },
		content,
		rolls: [roll],
	};
}

/**
 * What an attack's card shows on top of the check's: the damage, the critical and the qualities of the weapon.
 */
async function attackCardData(check: Check, weapon: AttackWeapon, results: GenesysRollResults, card: CardResults) {
	// A vehicle has no characteristics to add to its weapons' damage.
	const characteristics = (check.actor?.systemData as { characteristics?: CharacteristicsContainer } | undefined)?.characteristics;
	const { baseDamage, characteristic } = damageFormula(weapon.systemData);
	const attackQualities = await enrichedQualities(weapon.systemData.qualities);

	return {
		totalDamage: attackDamage(weapon.systemData, characteristics, results.netSuccess),
		damageFormula: characteristic && characteristics ? `${game.i18n.localize(characteristic)} + ${baseDamage}` : baseDamage.toString(),
		critical: weapon.systemData.critical,
		// tbh I can't be assed to implement another Handlebars helper for array length so let's just do undefined. <.<
		qualities: weapon.systemData.qualities.length === 0 ? undefined : attackQualities,
		showAttackDetails: showsAttackDetails(card, CONFIG.genesys.settings.showAttackDetailsOnFailure),
	};
}

/**
 * Roll a check, or an attack with the weapon it is rolled with, and post its results to the chat.
 */
export async function rollCheck({ check, dicePool }: CheckRoll, weapon?: AttackWeapon) {
	const poolRoll = await rollPool(dicePool);
	await ChatMessage.create(await checkMessageData(check, poolRoll, weapon), { rollMode: game.settings.get('core', 'rollMode') });
}

/**
 * The results of a roll, from the faces of its dice and the extra symbols of its data.
 */
export function parseRollResults(roll: Roll): GenesysRollResults {
	const faces = roll.dice.reduce((faces: Record<string, string[]>, die) => {
		const genDie = <GenesysDie>die;
		if (faces[genDie.denomination] === undefined) {
			faces[genDie.denomination] = die.results.map((r) => genDie.getResultLabel(r));
		} else {
			faces[genDie.denomination].push(...die.results.map((r) => genDie.getResultLabel(r)));
		}

		return faces;
	}, {});

	return rollResults(faces, <Record<string, number>>roll.data.symbols);
}
