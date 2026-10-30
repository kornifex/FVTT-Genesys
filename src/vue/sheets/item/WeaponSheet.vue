<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import WeaponProfileFields from '@/vue/components/item/WeaponProfileFields.vue';
import {
	addExtraProfileUpdate,
	deleteExtraProfileUpdate,
	type ExtraWeaponProfile,
	profileUpdate,
	weaponProfiles,
	type WeaponProfile,
} from '@/item/WeaponProfiles';

const { document: item, system, editable } = useSheetDocument<GenesysItem<'weapon'>>();

const extraProfiles = computed(() => weaponProfiles(system.value).slice(1));

// The extra profiles' fields are unnamed, so that the sheet's form doesn't submit them: each change writes its profile
// in the weapon's list.
async function updateProfile(profile: WeaponProfile, changes: Partial<ExtraWeaponProfile>) {
	await item.value.update({ system: profileUpdate(system.value, profile.index, changes) });
}

async function addProfile() {
	await item.value.update({ system: addExtraProfileUpdate(system.value) });
}

async function deleteProfile(profile: WeaponProfile) {
	await item.value.update({ system: deleteExtraProfileUpdate(system.value, profile.index) });
}
</script>

<template>
	<BaseWeaponSheet>
		<template v-slot:profiles>
			<!-- A skill or a quality dropped on a profile's block goes to that profile. -->
			<section
				v-for="profile in extraProfiles"
				:key="profile.index"
				class="data-grid weapon-profile"
				:data-weapon-profile="profile.index"
			>
				<div class="profile-header">
					<Localized label="Genesys.WeaponProfile.Title" />
					<a v-if="editable" class="delete-profile" data-tooltip="Genesys.WeaponProfile.Delete" @click="deleteProfile(profile)"
						><i class="fas fa-trash"></i
					></a>
				</div>

				<DataRow label="Genesys.Labels.Name">
					<input
						type="text"
						class="profile-name"
						:value="profile.name"
						@change="updateProfile(profile, { name: ($event.target as HTMLInputElement).value })"
					/>
				</DataRow>

				<WeaponProfileFields :profile="profile" @change="updateProfile(profile, $event)" />
			</section>

			<div v-if="editable" class="add-profile">
				<button type="button" @click="addProfile"><Localized label="Genesys.WeaponProfile.Add" /></button>
			</div>
		</template>
	</BaseWeaponSheet>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.weapon-profile {
	margin-top: 0.5rem;
	border-top: 2px solid colors.$dark-blue;

	.profile-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25em;
		font-family: 'Modesto Condensed', sans-serif;
		font-size: 1.2em;
	}
}

.add-profile {
	display: flex;
	justify-content: center;
	padding: 0.5rem;
}
</style>
