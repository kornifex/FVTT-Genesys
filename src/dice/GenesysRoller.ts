import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysDie } from '@/dice/dice/GenesysDie';
import { Check, checkDescription } from '@/dice/Check';
import { compileDiceFormula, compileSymbolsData, DicePool } from '@/dice/DicePool';
import { cardResults, GenesysRollResults, rollResults, showsAttackDetails } from '@/dice/RollResults';
import { GenesysItem } from '@/item/GenesysItem';
import { enrichedQualities } from '@/item/ChatCards';
import { attackDamage, damageFormula } from '@/item/Weapons';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { CharacteristicsContainer } from '@/data/Characteristics';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';

/**
 * The roll of a check's dice pool, as the roller makes it.
 */
export type CheckRoll = {
	check: Check;
	dicePool: DicePool;
};

export class GenesysRoller {
	/**
	 * The roll of a dice pool.
	 */
	static rollForPool(dicePool: DicePool) {
		return new Roll(compileDiceFormula(dicePool), { symbols: compileSymbolsData(dicePool) });
	}

	/**
	 * The content of the chat message of a check, from its description and the results of its roll.
	 */
	static async checkMessageContent(description: string | undefined, results: GenesysRollResults) {
		return await renderTemplate('systems/genesys/templates/chat/rolls/skill.hbs', { description, results, card: cardResults(results) });
	}

	static async skillRoll({ check, dicePool }: CheckRoll) {
		const roll = this.rollForPool(dicePool);
		await roll.evaluate();
		const results = this.parseRollResults(roll);

		const chatData = {
			user: game.user.id,
			speaker: { actor: (check.actor as GenesysActor | undefined)?.id },
			content: await this.checkMessageContent(checkDescription(check, { kind: 'check' }, game.i18n), results),
			rolls: [roll],
		};
		await ChatMessage.create(chatData, { rollMode: game.settings.get('core', 'rollMode') });
	}

	static async attackRoll({ check, dicePool, weapon }: CheckRoll & { weapon: GenesysItem<WeaponDataModel | VehicleWeaponDataModel> }) {
		const actor = check.actor as GenesysActor | undefined;
		const roll = this.rollForPool(dicePool);
		await roll.evaluate();
		const results = this.parseRollResults(roll);

		// A vehicle has no characteristics to add to its weapons' damage.
		const characteristics = (actor?.system as { characteristics?: CharacteristicsContainer } | undefined)?.characteristics;
		const totalDamage = attackDamage(weapon.systemData, characteristics, results.netSuccess);

		const { baseDamage, characteristic } = damageFormula(weapon.systemData);
		const formula = characteristic && characteristics ? `${game.i18n.localize(characteristic)} + ${baseDamage}` : baseDamage.toString();

		const attackQualities = await enrichedQualities(weapon.systemData.qualities);

		const card = cardResults(results);
		const rollData = {
			description: checkDescription(check, { kind: 'attack', weaponName: weapon.name }, game.i18n),
			results,
			card,
			totalDamage,
			damageFormula: formula,
			critical: weapon.systemData.critical,
			// tbh I can't be assed to implement another Handlebars helper for array length so let's just do undefined. <.<
			qualities: weapon.systemData.qualities.length === 0 ? undefined : attackQualities,
			showAttackDetails: showsAttackDetails(card, CONFIG.genesys.settings.showAttackDetailsOnFailure),
		};
		const html = await renderTemplate('systems/genesys/templates/chat/rolls/attack.hbs', rollData);

		const chatData = {
			user: game.user.id,
			speaker: { actor: actor?.id },
			content: html,
			rolls: [roll],
		};
		await ChatMessage.create(chatData, { rollMode: game.settings.get('core', 'rollMode') });
	}

	/**
	 * The results of a roll, from the faces of its dice and the extra symbols of its data.
	 */
	static parseRollResults(roll: Roll): GenesysRollResults {
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
}
