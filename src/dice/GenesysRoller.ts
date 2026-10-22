import GenesysActor from '@/actor/GenesysActor';
import GenesysDie from '@/dice/dice/GenesysDie';
import { Check, checkDescription } from '@/dice/Check';
import { compileDiceFormula, compileSymbolsData, DicePool } from '@/dice/DicePool';
import GenesysItem from '@/item/GenesysItem';
import WeaponDataModel from '@/item/data/WeaponDataModel';
import { CharacteristicsContainer } from '@/data/Characteristics';
import VehicleWeaponDataModel from '@/item/data/VehicleWeaponDataModel';

export type GenesysRollResults = {
	/**
	 * Total number of successes that were rolled, including the one added by Triumphs. Always >= 0.
	 */
	totalSuccess: number;

	/**
	 * Total number of failures that were rolled, including the one added by Despairs. Always >= 0.
	 */
	totalFailures: number;

	/**
	 * Total number of advantages that were rolled. Always >= 0.
	 */
	totalAdvantage: number;

	/**
	 * Total number of threats that were rolled. Always >= 0.
	 */
	totalThreat: number;

	/**
	 * Total number of triumphs that were rolled. Always >= 0.
	 */
	totalTriumph: number;

	/**
	 * Total number of despairs that were rolled. Always >= 0.
	 */
	totalDespair: number;

	/**
	 * Number of successes left over in the roll after cancelling out with failures. May be negative if there were more failures.
	 */
	netSuccess: number;

	/**
	 * Number of failures left over in the roll after cancelling out with successes. May be negative if there were more successes.
	 */
	netFailure: number;

	/**
	 * Number of advantages left over in the roll after cancelling out with threats. May be negative if there were more threats.
	 */
	netAdvantage: number;

	/**
	 * Number of threats left over in the roll after cancelling out with advantages. May be negative if there were more advantages.
	 */
	netThreat: number;

	/**
	 * A map of die type to all the result faces from the roll.
	 */
	faces: Record<string, string[]>;

	/**
	 * Extra symbols added to the roll.
	 */
	extraSymbols: Record<string, number>;
};

/**
 * The roll of a check's dice pool, as the roller makes it.
 */
export type CheckRoll = {
	check: Check;
	dicePool: DicePool;
};

export default class GenesysRoller {
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
		return await renderTemplate('systems/genesys/templates/chat/rolls/skill.hbs', { description, results });
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

		let totalDamage = weapon.systemData.baseDamage;
		let damageFormula = weapon.systemData.baseDamage.toString();

		const withDamageCharacteristic = (weapon.systemData as WeaponDataModel).damageCharacteristic;
		if (actor && withDamageCharacteristic && withDamageCharacteristic !== '-') {
			totalDamage += (actor.system as { characteristics: CharacteristicsContainer }).characteristics[withDamageCharacteristic];
			damageFormula =
				game.i18n.localize(`Genesys.CharacteristicAbbr.${withDamageCharacteristic.capitalize()}`) + ` + ${damageFormula}`;
		}

		if (results.netSuccess > 0) {
			totalDamage += results.netSuccess;
		}

		const attackQualities = weapon.systemData.qualities;
		await Promise.all(
			attackQualities.map(async (quality) => {
				quality.description = await TextEditor.enrichHTML(quality.description, { async: true });
			}),
		);

		const rollData = {
			description: checkDescription(check, { kind: 'attack', weaponName: weapon.name }, game.i18n),
			results,
			totalDamage,
			damageFormula,
			critical: weapon.systemData.critical,
			// tbh I can't be assed to implement another Handlebars helper for array length so let's just do undefined. <.<
			qualities: weapon.systemData.qualities.length === 0 ? undefined : attackQualities,
			showDamageOnFailure: CONFIG.genesys.settings.showAttackDetailsOnFailure,
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

		// Get symbols from the dice results.
		const results = Object.values(faces)
			.flatMap((v) => v)
			.flatMap((v) => v.split(''))
			.filter((v) => v !== ' ')
			.reduce(
				(results: Record<string, number>, result) => {
					results[result] += 1;

					return results;
				},
				{
					a: 0,
					s: 0,
					t: 0,
					h: 0,
					f: 0,
					d: 0,
				},
			);

		// Add extra symbols specified by the roll.
		const extraSymbols = <Record<string, number>>roll.data.symbols;
		if (extraSymbols) {
			for (const symbol of ['a', 's', 't', 'h', 'f', 'd']) {
				results[symbol] += extraSymbols[symbol] ?? 0;
			}
		}

		// Threat & Triumph add successes & failures.
		results['s'] += results['t'];
		results['f'] += results['d'];

		return {
			totalSuccess: results['s'],
			totalFailures: results['f'],
			totalAdvantage: results['a'],
			totalThreat: results['h'],
			totalTriumph: results['t'],
			totalDespair: results['d'],

			netSuccess: results['s'] - results['f'],
			netFailure: results['f'] - results['s'],
			netAdvantage: results['a'] - results['h'],
			netThreat: results['h'] - results['a'],

			faces,
			extraSymbols,
		};
	}
}
