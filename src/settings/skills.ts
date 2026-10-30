import type { Stored } from '@/data/Stored';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import type { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';

type Compendium = foundry.documents.collections.CompendiumCollection.Any;

/**
 * Whether a compendium holds Items.
 */
function holdsItems(pack: Compendium): pack is foundry.documents.collections.CompendiumCollection<'Item'> {
	return pack.metadata.type === 'Item';
}

/**
 * Load the skills of a Skills Compendium into `CONFIG.genesys.skills`, and report a compendium that can't provide skills.
 * @param storedValue The value of the Skills Compendium setting, which warns the user when it is empty.
 * @param skillsCompendiumName The compendium to load: the setting's value, or the default compendium when it is empty.
 */
export async function loadSkills(storedValue: string | undefined, skillsCompendiumName: string): Promise<void> {
	if (!storedValue) {
		ui.notifications.warn('Genesys.Notifications.NoSkillsCompendium', { localize: true });
	}

	let skills: Stored<GenesysItem<SkillDataModel>>[] = [];

	const pack = game.packs.get(skillsCompendiumName);
	if (!pack) {
		ui.notifications.error(game.i18n.format('Genesys.Notifications.MissingCompendium', { name: skillsCompendiumName }));
	} else if (!holdsItems(pack)) {
		ui.notifications.error(
			game.i18n.format('Genesys.Notifications.WrongCompendiumType', { name: skillsCompendiumName, type: pack.metadata.type }),
		);
	} else if (!pack.index.some((item) => item.type === 'skill')) {
		ui.notifications.warn(game.i18n.format('Genesys.Notifications.NoSkillsInCompendium', { name: skillsCompendiumName }));
	} else {
		skills = itemsOfType({ items: await pack.getDocuments() }, 'skill');
	}

	CONFIG.genesys.skills = skills;

	// The combat tracker lists the initiative skills from the loaded skills.
	void ui.combat?.render();
}
