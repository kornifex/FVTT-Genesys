import { EntryType } from '@/actor/data/character/ExperienceJournal';
import { ActorPlanner } from '@/migrations/ActorMigration';

/** What this migration reads of an Experience Journal entry. */
type EntrySource = { type: string; data?: { name?: string; id?: string } };

/** What this migration reads of an item. An item created with its actor has no id yet. */
type ItemSource = { _id: string | null; name: string; type: string };

/** What this migration reads of a character. */
type CharacterSource = { experienceJournal?: { entries: EntrySource[] } };

/**
 * Before upstream 0.1.14, buying a talent recorded its Experience Journal entry without the talent's id, so undoing it
 * finds no talent: it gives the XP back and leaves the talent. This planner links each such entry to the character's
 * talent of the same name, when the character holds exactly one. Any other entry is left as it is: a name that no
 * talent, or several, hold says nothing of which talent the purchase brought. Undoing keeps finding the talent by id.
 */
export const linkTalentPurchases: ActorPlanner = (source) => {
	const entries = (source.system as CharacterSource).experienceJournal?.entries ?? [];
	const talents = (source.items as ItemSource[]).filter((item) => item.type === 'talent');

	let linked = false;
	const migratedEntries = entries.map((entry) => {
		if (entry.type !== EntryType.NewTalent || !entry.data || entry.data.id) {
			return entry;
		}

		const [talent, ...others] = talents.filter((candidate) => candidate.name === entry.data!.name);
		if (!talent?._id || others.length > 0) {
			return entry;
		}

		linked = true;
		return { ...entry, data: { ...entry.data, id: talent._id } };
	});

	return linked ? { update: { 'system.experienceJournal.entries': migratedEntries } } : undefined;
};
