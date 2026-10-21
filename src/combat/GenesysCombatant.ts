/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysActor from '@/actor/GenesysActor';
import AdversaryDataModel from '@/actor/data/AdversaryDataModel';
import CharacterDataModel from '@/actor/data/CharacterDataModel';
import GenesysCombat, { InitiativeSkill } from '@/combat/GenesysCombat';
import MinionDataModel from '@/actor/data/MinionDataModel';
import { Characteristic } from '@/data/Characteristics';
import GenesysRoller from '@/dice/GenesysRoller';
import { Disposition, encodeInitiative, InitiativeSide, sideOf } from '@/combat/InitiativeSlots';
import { skillNamesMatch, skillToRoll } from '@/data/Skills';

export default class GenesysCombatant extends Combatant<GenesysCombat, GenesysActor> {
	/**
	 * The initiative skill chosen for this combatant, if it's still one of the combat's initiative skills.
	 */
	get initiativeSkill(): InitiativeSkill | undefined {
		const skillName = this.getFlag('genesys', 'initiativeSkill') as string | undefined;

		if (!skillName) {
			return undefined;
		}

		return (this.parent as GenesysCombat).initiativeSkills.find((s) => skillNamesMatch(s.skillName, skillName));
	}

	async setInitiativeSkill(skill: InitiativeSkill) {
		await this.setFlag('genesys', 'initiativeSkill', skill.skillName);
	}

	/**
	 * Switch to the combat's next initiative skill, back to the first one after the last.
	 */
	async cycleInitiativeSkill() {
		const initiativeSkills = (this.parent as GenesysCombat).initiativeSkills;
		if (initiativeSkills.length < 2) {
			return;
		}

		let skillIndex = 0;
		const currentSkill = this.initiativeSkill;
		if (currentSkill) {
			skillIndex = initiativeSkills.findIndex((s) => skillNamesMatch(s.skillName, currentSkill.skillName));
		}

		await this.setInitiativeSkill(initiativeSkills[(skillIndex + 1) % initiativeSkills.length]);
	}

	get disposition(): Disposition {
		switch ((this.actor.token ?? (this.actor.prototypeToken as any)).disposition) {
			case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
				return 'friendly';

			case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
				return 'neutral';

			case CONST.TOKEN_DISPOSITIONS.HOSTILE:
				return 'hostile';

			default:
				return 'neutral';
		}
	}

	/**
	 * The side of the Initiative Slots this combatant gives and can claim: friendly tokens are PCs, any other is an NPC.
	 */
	get initiativeSide(): InitiativeSide {
		return sideOf(this.disposition);
	}

	override async rollInitiative(skillName?: string) {
		const roll = this.getInitiativeRoll(skillName);
		await roll.evaluate();
		const results = GenesysRoller.parseRollResults(roll);

		return this.update({ initiative: encodeInitiative(results.netSuccess, results.netAdvantage) });
	}

	override getInitiativeRoll(skillName?: string, charFallback: Characteristic = Characteristic.Brawn) {
		const rolledSkill = skillName ? skillToRoll(this.actor.skills, CONFIG.genesys.skills, skillName) : undefined;
		const characteristic = rolledSkill?.skill.systemData.characteristic ?? charFallback;
		const system = this.actor.systemData as CharacterDataModel | AdversaryDataModel;
		const characteristicValue = system.characteristics[characteristic];

		let skillValue = !rolledSkill || rolledSkill.unranked ? 0 : rolledSkill.skill.systemData.rank;
		if (rolledSkill && !rolledSkill.unranked && this.actor.type === 'minion') {
			skillValue = (this.actor.systemData as MinionDataModel).groupSkillRank;
		}

		const yellow = Math.min(characteristicValue, skillValue);
		const green = Math.max(characteristicValue, skillValue) - yellow;

		const useSuperCharacteristic = CONFIG.genesys.settings.useSuperCharacteristics && system.superCharacteristics.has(characteristic);

		return new Roll(`${yellow}dP${useSuperCharacteristic ? 'X' : ''}+${green}dA`);
	}
}
