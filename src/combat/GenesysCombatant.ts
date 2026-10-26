import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysCombat, InitiativeSkill } from '@/combat/GenesysCombat';
import { InitiativeSide, sideOf } from '@/combat/InitiativeSlots';
import { skillNamesMatch } from '@/data/Skills';

export class GenesysCombatant extends Combatant<GenesysCombat, GenesysActor> {
	/**
	 * The initiative skill chosen for this combatant, if it's still one of the combat's initiative skills.
	 */
	get initiativeSkill(): InitiativeSkill | undefined {
		const skillName = this.getFlag<string | undefined>('genesys', 'initiativeSkill');

		if (!skillName) {
			return undefined;
		}

		return this.parent.initiativeSkills.find((s) => skillNamesMatch(s.skillName, skillName));
	}

	/**
	 * The Initiative Skill this combatant rolls: the one chosen for it, or else the combat's first.
	 */
	get initiativeSkillToRoll(): InitiativeSkill {
		return this.initiativeSkill ?? this.parent.initiativeSkills[0];
	}

	async setInitiativeSkill(skill: InitiativeSkill) {
		await this.setFlag('genesys', 'initiativeSkill', skill.skillName);
	}

	/**
	 * Switch to the combat's next initiative skill, back to the first one after the last.
	 */
	async cycleInitiativeSkill() {
		const initiativeSkills = this.parent.initiativeSkills;
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

	/**
	 * Whether a player owns this combatant's actor.
	 */
	get actorHasPlayerOwner() {
		return this.actor?.hasPlayerOwner ?? false;
	}

	/**
	 * The side of the Initiative Slots this combatant gives and can claim: a PC if a player owns its actor, else an NPC.
	 */
	get initiativeSide(): InitiativeSide {
		return sideOf(this.actorHasPlayerOwner);
	}

	/**
	 * Roll this combatant's initiative as the combat rolls it, with a chat message.
	 */
	override async rollInitiative() {
		await this.parent.rollInitiative([this.id]);
		return this;
	}
}
