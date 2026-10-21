import { Characteristic } from '@/data/Characteristics';

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

type CharacteristicData = { characteristic: Characteristic; rank: number };
type SkillData = { name: string; id: string; rank: number };
type TalentData = { name: string; id: string; tier: number; rank: number };

/**
 * An individual entry representing an increase or decrease in experience points. Its data depends on its type.
 */
export type Entry = {
	/**
	 * How much experience was spent (negative value) or received (positive value).
	 */
	amount: number;
} & (
	| { type: EntryType.Starting; data?: object }
	| { type: EntryType.Award; data?: { reason?: string } }
	| { type: EntryType.Characteristic; data: CharacteristicData }
	| { type: EntryType.Skill; data: SkillData }
	| { type: EntryType.NewTalent | EntryType.TalentRank; data: TalentData }
);

/**
 * A list of journal entries.
 */
export type ExperienceJournal = {
	entries: Entry[];
};
