<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import WeaponProfileFields from '@/vue/components/item/WeaponProfileFields.vue';
import type { WeaponProfileData } from '@/item/WeaponProfiles';

const { document: item, system } = useSheetDocument<GenesysItem<'weapon' | 'vehicleWeapon'>>();

// The main profile's lists, which the sheet's form doesn't submit, are the weapon's own fields.
async function updateMainProfile(changes: Partial<WeaponProfileData>) {
	await item.value.update({ system: changes });
}
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<slot name="extra-data" />

				<WeaponProfileFields :profile="system" named @change="updateMainProfile">
					<EquipmentRows :system="system" />
				</WeaponProfileFields>
			</section>

			<slot name="profiles" />
		</template>
	</BasicItemSheet>
</template>
