/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysActor from '@/actor/GenesysActor';
import GenesysCombat, { InitiativeSkill } from '@/combat/GenesysCombat';
import { Disposition, InitiativeSide, sideOf } from '@/combat/InitiativeSlots';
import { skillNamesMatch } from '@/data/Skills';

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

	/**
	 * The Initiative Skill this combatant rolls: the one chosen for it, or else the combat's first.
	 */
	get initiativeSkillToRoll(): InitiativeSkill {
		return this.initiativeSkill ?? (this.parent as GenesysCombat).initiativeSkills[0];
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

	/**
	 * Roll this combatant's initiative as the combat rolls it, with a chat message.
	 */
	override async rollInitiative() {
		await (this.parent as GenesysCombat).rollInitiative([this.id]);
		return this;
	}
}
