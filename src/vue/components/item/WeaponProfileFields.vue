<script lang="ts" setup>
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { CHARACTERISTICS } from '@/data/Characteristics';
import { withQualityRating } from '@/item/data/Qualities';
import { type DamageCharacteristic, RANGE_LABELS, type RangeBand } from '@/item/Weapons';
import type { VehicleWeaponProfileData, WeaponProfileData } from '@/item/WeaponProfiles';
import { withoutIndex } from '@/arrays';

/**
 * The rows of a Weapon Profile on a weapon's Data tab: its damage characteristic when it has one, damage, Critical
 * rating, range, then the default slot, then its skills and qualities.
 */
const props = defineProps<{
	profile: VehicleWeaponProfileData & Partial<Pick<WeaponProfileData, 'damageCharacteristic'>>;
	/**
	 * Whether the profile's fields are the weapon's own, which the sheet's form submits by their names: its main
	 * profile's. An extra profile's fields are unnamed, and each change is emitted.
	 */
	named?: boolean;
}>();

const emit = defineEmits<{
	(e: 'change', changes: Partial<WeaponProfileData>): void;
}>();

function fieldName(field: keyof WeaponProfileData) {
	return props.named ? `system.${field}` : undefined;
}

// A named field is written by the sheet's form.
function changeField(changes: Partial<WeaponProfileData>) {
	if (!props.named) {
		emit('change', changes);
	}
}

function valueOf(event: Event) {
	return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function numberOf(event: Event) {
	// An emptied number field counts as 0.
	const value = parseInt(valueOf(event), 10);
	return Number.isNaN(value) ? 0 : value;
}

function updateQualityRating(index: number, event: Event) {
	// A rating that isn't a number changes nothing.
	const qualities = withQualityRating(props.profile.qualities, index, parseInt(valueOf(event), 10));
	if (qualities) {
		emit('change', { qualities });
	}
}
</script>

<template>
	<DataRow v-if="profile.damageCharacteristic !== undefined" label="Genesys.Labels.DamageCharacteristic">
		<select
			class="profile-damage-characteristic"
			:name="fieldName('damageCharacteristic')"
			:value="profile.damageCharacteristic"
			@change="changeField({ damageCharacteristic: valueOf($event) as DamageCharacteristic })"
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
			:name="fieldName('baseDamage')"
			:value="profile.baseDamage"
			@change="changeField({ baseDamage: numberOf($event) })"
		/>
	</DataRow>

	<DataRow label="Genesys.Labels.Critical">
		<input
			type="number"
			class="profile-critical"
			:name="fieldName('critical')"
			:value="profile.critical"
			@change="changeField({ critical: numberOf($event) })"
		/>
	</DataRow>

	<DataRow label="Genesys.Labels.Range">
		<select
			class="profile-range"
			:name="fieldName('range')"
			:value="profile.range"
			@change="changeField({ range: valueOf($event) as RangeBand })"
		>
			<option v-for="(label, range) in RANGE_LABELS" :key="range" :value="range">
				<Localized :label="label" />
			</option>
		</select>
	</DataRow>

	<slot />

	<DataRow label="Genesys.Labels.Skills">
		<div class="profile-skills">
			<div v-for="(skill, index) in profile.skills" :key="index" class="data">
				<div>{{ skill }}</div>
				<a @click="emit('change', { skills: withoutIndex(profile.skills, index) })"><i class="fas fa-trash"></i></a>
			</div>
		</div>
	</DataRow>

	<DataRow label="Genesys.Labels.Qualities">
		<div class="profile-qualities">
			<div v-for="(quality, index) in profile.qualities" :key="index" class="data-rated">
				<div>{{ quality.name }}</div>
				<div>
					<span v-if="quality.isRated"
						><input type="text" :value="quality.rating" @blur="updateQualityRating(index, $event)"
					/></span>
				</div>
				<a @click="emit('change', { qualities: withoutIndex(profile.qualities, index) })"><i class="fas fa-trash"></i></a>
			</div>
		</div>
	</DataRow>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

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
</style>
