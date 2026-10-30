import { chosenInitiativeSkill, InitiativeSkill, initiativeSkillToRoll, nextInitiativeSkill } from '@/combat/InitiativeSkills';
import { InitiativeSide, sideOf } from '@/combat/InitiativeSlots';

/**
 * A combatant, which rolls its initiative with the Initiative Skill chosen for it.
 */
export class GenesysCombatant extends Combatant {
	/**
	 * The Initiative Skill chosen for this combatant, if it's still one of the combat's Initiative Skills.
	 */
	get initiativeSkill(): InitiativeSkill | undefined {
		return chosenInitiativeSkill(this.parent.initiativeSkills, this.#chosenInitiativeSkillName);
	}

	/**
	 * The Initiative Skill this combatant rolls: the one chosen for it, else Vigilance, else the combat's first.
	 */
	get initiativeSkillToRoll(): InitiativeSkill {
		return initiativeSkillToRoll(this.parent.initiativeSkills, this.#chosenInitiativeSkillName);
	}

	get #chosenInitiativeSkillName() {
		return this.getFlag('genesys', 'initiativeSkill');
	}

	/**
	 * Choose the Initiative Skill this combatant rolls.
	 */
	async setInitiativeSkill(skill: InitiativeSkill) {
		await this.setFlag('genesys', 'initiativeSkill', skill.skillName);
	}

	/**
	 * Switch to the combat's next Initiative Skill, back to the first one after the last.
	 */
	async cycleInitiativeSkill() {
		const nextSkill = nextInitiativeSkill(this.parent.initiativeSkills, this.#chosenInitiativeSkillName);
		if (nextSkill) {
			await this.setInitiativeSkill(nextSkill);
		}
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
		// A combatant that rolls is in its combat, which stores it.
		await this.parent.rollInitiative([this.id!]);
		return this;
	}
}
