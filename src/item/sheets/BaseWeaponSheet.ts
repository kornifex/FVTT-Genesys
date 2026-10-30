import { GenesysItemSheet } from '@/item/GenesysItemSheet';
import { GenesysItem } from '@/item/GenesysItem';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';
import { skillNamesMatch } from '@/data/Skills';
import { withQualityAdded } from '@/item/data/Qualities';
import type { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { type ExtraWeaponProfile, profileUpdate, weaponProfile } from '@/item/WeaponProfiles';

/**
 * Item sheet shared by the weapons, which receives their skills and qualities. A character's weapon gives an item
 * dropped on the block of one of its extra Weapon Profiles to that profile, and one dropped anywhere else to its main
 * profile.
 */
export class BaseWeaponSheet extends GenesysItemSheet<'weapon' | 'vehicleWeapon'> {
	protected override async receiveItem(droppedItem: GenesysItem, event?: DragEvent): Promise<void> {
		const system = this.item.system;
		// A vehicle weapon has a single profile: its own fields.
		const weapon = hasExtraProfiles(system) ? system : undefined;
		// The profile read, the main one when the block's profile was deleted meanwhile.
		const dropped = weapon && weaponProfile(weapon, profileDroppedOn(event));
		const profile = dropped ?? system;
		const update = (changes: Partial<ExtraWeaponProfile>) =>
			weapon && dropped ? profileUpdate(weapon, dropped.index, changes) : changes;

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
}

/**
 * The Weapon Profile whose block a drop landed on, numbered as `weaponProfiles` numbers it: 0, the main profile, for a
 * drop anywhere else.
 */
function profileDroppedOn(event: DragEvent | undefined) {
	const block = event?.target instanceof Element ? event.target.closest<HTMLElement>('[data-weapon-profile]') : null;
	return Number(block?.dataset.weaponProfile ?? 0);
}

/**
 * Whether a weapon's data is a character's weapon's, which holds extra profiles.
 */
function hasExtraProfiles(system: WeaponDataModel | VehicleWeaponDataModel): system is WeaponDataModel {
	return 'extraProfiles' in system && system.extraProfiles !== undefined;
}
