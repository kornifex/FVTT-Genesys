/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Experience Journal
 */

/**
 * Different sources of Experience Journal entries.
 */
export enum EntryType {
	/**
	 * Starting XP awarded by the character's archetype.
	 */
	Starting = 'Starting',

	/**
	 * XP Awarded by the GM.
	 */
	Award = 'Award',

	/**
	 * XP spent to increase a characteristic during character creation.
	 */
	Characteristic = 'Characteristic',

	/**
	 * XP spent to increase a skill rank.
	 */
	Skill = 'Skill',

	/**
	 * XP spent to purchase a new talent.
	 */
	NewTalent = 'NewTalent',

	/**
	 * XP spent to increase an existing talent's rank.
	 */
	TalentRank = 'TalentRank',
}

/**
 * An individual entry representing an increase or decrease in experience points.
 */
export type Entry<DataType = any> = {
	/**
	 * How much experience was spent (negative value) or received (positive value).
	 */
	amount: number;

	/**
	 * Source of the XP award or spend.
	 */
	type: EntryType;

	/**
	 * Generic data container depending on the type of entry.
	 */
	data?: DataType;
};

/**
 * A list of journal entries.
 */
export type ExperienceJournal = {
	entries: Entry[];
};
