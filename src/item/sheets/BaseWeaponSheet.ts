import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { skillNamesMatch } from '@/data/Skills';
import { withQualityAdded } from '@/item/data/Qualities';
import { profileUpdate, weaponProfiles } from '@/item/WeaponProfiles';

/**
 * Item sheet shared by the weapons, which receives their skills and qualities. A character's weapon gives an item
 * dropped on the block of one of its extra Weapon Profiles to that profile, and one dropped anywhere else to its main
 * profile.
 */
export class BaseWeaponSheet extends GenesysItemSheet<'weapon' | 'vehicleWeapon'> {
	protected override async receiveItem(droppedItem: GenesysItem, event?: DragEvent): Promise<void> {
		const index = this.#profileDroppedOn(event);
		// A vehicle weapon has a single profile: its own fields.
		const profile = index > 0 ? weaponProfiles(this.item.system as WeaponDataModel)[index] : this.item.system;
		const update = (changes: Pick<WeaponDataModel, 'skills'> | Pick<WeaponDataModel, 'qualities'>) =>
			index > 0 ? profileUpdate(this.item.system as WeaponDataModel, index, changes) : changes;

		switch (droppedItem.type) {
			case 'skill':
				if (profile.skills.some((s) => skillNamesMatch(s, droppedItem.name))) {
					return;
				}

				await this.item.update({ system: update({ skills: [...profile.skills, droppedItem.name] }) });

				await this.render();

				return;

			case 'quality': {
				const quality = droppedItem.system as ItemQualityDataModel;
				const qualities = withQualityAdded(profile.qualities, {
					name: droppedItem.name,
					description: quality.description,
					isRated: quality.isRated,
				});
				if (qualities) {
					await this.item.update({ system: update({ qualities }) });
				}

				return;
			}
		}
	}

	/**
	 * The Weapon Profile whose block a drop landed on, numbered as `weaponProfiles` numbers it: 0, the main profile, for
	 * a drop anywhere else.
	 */
	#profileDroppedOn(event: DragEvent | undefined) {
		const block = event?.target instanceof Element ? event.target.closest<HTMLElement>('[data-weapon-profile]') : null;
		const index = Number(block?.dataset.weaponProfile ?? 0);
		return this.item.type === 'weapon' && index > 0 && index <= (this.item.system as WeaponDataModel).extraProfiles.length ? index : 0;
	}
}
