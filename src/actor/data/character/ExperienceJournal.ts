import { Characteristic } from '@/data/Characteristics';

/**
 * Different sources of Experience Journal entries.
 */
export const EntryType = {
	/**
	 * Starting XP awarded by the character's archetype.
	 */
	Starting: 'Starting',

	/**
	 * XP Awarded by the GM.
	 */
	Award: 'Award',

	/**
	 * XP spent to increase a characteristic during character creation.
	 */
	Characteristic: 'Characteristic',

	/**
	 * XP spent to increase a skill rank.
	 */
	Skill: 'Skill',

	/**
	 * XP spent to purchase a new talent.
	 */
	NewTalent: 'NewTalent',

	/**
	 * XP spent to increase an existing talent's rank.
	 */
	TalentRank: 'TalentRank',
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];

/**
 * The localization key of each type of entry, which formats the entry's data.
 */
export const ENTRY_LABELS: Record<EntryType, string> = {
	Starting: 'Genesys.XPJournal.Starting',
	Award: 'Genesys.XPJournal.Award',
	Characteristic: 'Genesys.XPJournal.Characteristic',
	Skill: 'Genesys.XPJournal.Skill',
	NewTalent: 'Genesys.XPJournal.NewTalent',
	TalentRank: 'Genesys.XPJournal.TalentRank',
};

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
	| { type: typeof EntryType.Starting; data?: object }
	| { type: typeof EntryType.Award; data?: { reason?: string } }
	| { type: typeof EntryType.Characteristic; data: CharacteristicData }
	| { type: typeof EntryType.Skill; data: SkillData }
	| { type: typeof EntryType.NewTalent | typeof EntryType.TalentRank; data: TalentData }
);

/**
 * A list of journal entries.
 */
export type ExperienceJournal = {
	entries: Entry[];
};
