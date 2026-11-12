<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import WeaponProfileFields from '@/vue/components/item/WeaponProfileFields.vue';
import EffectiveStats from '@/vue/components/item/EffectiveStats.vue';
import {
	addExtraProfileUpdate,
	deleteExtraProfileUpdate,
	type ExtraWeaponProfile,
	profileRowName,
	profileUpdate,
	weaponProfiles,
	type WeaponProfile,
} from '@/item/WeaponProfiles';
import { confirmDelete } from '@/operations/ItemActions';

// The profiles are read from the stored data, which each change writes back whole: the prepared data holds the damage
// and Critical ratings the weapon's effects add (its attachments'), which the change would store.
const { document: item, system, source, editable } = useSheetDocument<GenesysItem<'weapon'>>();

const PROFILE_STATS = ['baseDamage', 'critical'] as const;

const extraProfiles = computed(() => weaponProfiles(source.value).slice(1));

// The profile as the weapon's effects change it.
function preparedProfile(profile: WeaponProfile) {
	return system.value.extraProfiles[profile.index - 1] ?? profile;
}

// The extra profiles' fields are unnamed, so that the sheet's form doesn't submit them: each change writes its profile
// in the weapon's list.
async function updateProfile(profile: WeaponProfile, changes: Partial<ExtraWeaponProfile>) {
	await item.value.update({ system: profileUpdate(source.value, profile.index, changes) });
}

async function addProfile() {
	await item.value.update({ system: addExtraProfileUpdate(source.value) });
}

// Deleting an extra profile asks first, naming it as the weapon's rows do: "Blaster (Stun)".
async function deleteProfile(profile: WeaponProfile) {
	const { name } = source.value.extraProfiles[profile.index - 1];
	// The list may change while the dialog is open: delete the profile it named, or nothing.
	if (
		(await confirmDelete(profileRowName(item.value.name, profile, game.i18n))) &&
		source.value.extraProfiles[profile.index - 1]?.name === name
	) {
		await item.value.update({ system: deleteExtraProfileUpdate(source.value, profile.index) });
	}
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
				<div class="heading-row">
					<h3><Localized label="Genesys.WeaponProfile.Title" /></h3>
					<ActionButton
						class="delete-profile"
						icon="fas fa-trash"
						label="Genesys.WeaponProfile.Delete"
						edits
						@click="deleteProfile(profile)"
					/>
				</div>

				<DataRow label="Genesys.Labels.Name" v-slot="{ id }">
					<input
						:id="id"
						type="text"
						class="profile-name"
						:value="profile.name"
						@change="updateProfile(profile, { name: ($event.target as HTMLInputElement).value })"
					/>
				</DataRow>

				<WeaponProfileFields
					:profile="profile"
					:qualities-path="`system.extraProfiles.${profile.index - 1}.qualities`"
					@change="updateProfile(profile, $event)"
				>
					<EffectiveStats :stored="profile" :prepared="preparedProfile(profile)" :fields="PROFILE_STATS" />
				</WeaponProfileFields>
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

	// The profile's heading, then its delete button at the other end.
	.heading-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25em;
	}
}

.add-profile {
	display: flex;
	justify-content: center;
	padding: 0.5rem;
}
</style>
