<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { CHARACTERISTICS } from '@/data/Characteristics';
import { withQualityRating } from '@/item/data/Qualities';
import { type DamageCharacteristic, RANGE_LABELS, type RangeBand } from '@/item/Weapons';
import {
	type ExtraWeaponProfile,
	profileUpdate,
	weaponProfiles,
	withExtraProfileAdded,
	withoutExtraProfile,
	type WeaponProfile,
} from '@/item/WeaponProfiles';
import { withoutIndex } from '@/arrays';

const { document: item, system, editable } = useSheetDocument<GenesysItem<'weapon'>>();

const extraProfiles = computed(() => weaponProfiles(system.value).slice(1));

// The extra profiles' fields are unnamed, so that the sheet's form doesn't submit them: each change writes its profile
// in the weapon's list.
async function updateProfile(profile: WeaponProfile, changes: Partial<ExtraWeaponProfile>) {
	await item.value.update({ system: profileUpdate(system.value, profile.index, changes) });
}

function valueOf(event: Event) {
	return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function numberOf(event: Event) {
	// An emptied number field counts as 0.
	const value = parseInt(valueOf(event), 10);
	return Number.isNaN(value) ? 0 : value;
}

async function updateQualityRating(profile: WeaponProfile, index: number, event: Event) {
	const qualities = withQualityRating(profile.qualities, index, numberOf(event));
	if (qualities) {
		await updateProfile(profile, { qualities });
	}
}

async function addProfile() {
	await item.value.update({ system: withExtraProfileAdded(system.value) });
}

async function deleteProfile(profile: WeaponProfile) {
	await item.value.update({ system: withoutExtraProfile(system.value, profile.index) });
}
</script>

<template>
	<BaseWeaponSheet>
		<template v-slot:extra-data>
			<DataRow label="Genesys.Labels.DamageCharacteristic">
				<select name="system.damageCharacteristic" :value="system.damageCharacteristic">
					<option value="-">-</option>
					<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
						<Localized :label="label" />
					</option>
				</select>
			</DataRow>
		</template>

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
						@change="updateProfile(profile, { name: valueOf($event) })"
					/>
				</DataRow>

				<DataRow label="Genesys.Labels.DamageCharacteristic">
					<select
						class="profile-damage-characteristic"
						:value="profile.damageCharacteristic"
						@change="updateProfile(profile, { damageCharacteristic: valueOf($event) as DamageCharacteristic })"
					>
						<option value="-">-</option>
						<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.Damage">
					<input
						type="number"
						class="profile-damage"
						:value="profile.baseDamage"
						@change="updateProfile(profile, { baseDamage: numberOf($event) })"
					/>
				</DataRow>

				<DataRow label="Genesys.Labels.Critical">
					<input
						type="number"
						class="profile-critical"
						:value="profile.critical"
						@change="updateProfile(profile, { critical: numberOf($event) })"
					/>
				</DataRow>

				<DataRow label="Genesys.Labels.Range">
					<select
						class="profile-range"
						:value="profile.range"
						@change="updateProfile(profile, { range: valueOf($event) as RangeBand })"
					>
						<option v-for="(label, range) in RANGE_LABELS" :key="range" :value="range">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.Skills">
					<div class="profile-skills">
						<div v-for="(skill, index) in profile.skills" :key="index" class="data">
							<div>{{ skill }}</div>
							<a @click="updateProfile(profile, { skills: withoutIndex(profile.skills, index) })"
								><i class="fas fa-trash"></i
							></a>
						</div>
					</div>
				</DataRow>

				<DataRow label="Genesys.Labels.Qualities">
					<div class="profile-qualities">
						<div v-for="(quality, index) in profile.qualities" :key="index" class="data-rated">
							<div>{{ quality.name }}</div>
							<div>
								<span v-if="quality.isRated"
									><input type="text" :value="quality.rating" @blur="updateQualityRating(profile, index, $event)"
								/></span>
							</div>
							<a @click="updateProfile(profile, { qualities: withoutIndex(profile.qualities, index) })"
								><i class="fas fa-trash"></i
							></a>
						</div>
					</div>
				</DataRow>
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

.data {
	display: grid;
	grid-template-columns: /* Name */ 1fr /* Delete Button */ auto;
	align-items: center;
	border-bottom: 1px dashed colors.$blue;
	padding: 2px;

	&:last-child {
		border-bottom: none;
	}
}

.data-rated {
	@extend .data;
	grid-template-columns: /* Name */ 2fr /* Rating */ 1fr /* Delete Button */ auto;

	a {
		margin-left: 1rem;
	}
}

.add-profile {
	display: flex;
	justify-content: center;
	padding: 0.5rem;
}
</style>
