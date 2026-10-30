<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { BaseWeaponDataModel, type ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { withQualityRating } from '@/item/data/Qualities';
import { RANGE_LABELS } from '@/item/Weapons';
import { withoutIndex } from '@/arrays';

const { document: item, system } = useSheetDocument<GenesysItem<BaseWeaponDataModel>>();

async function deleteSkill(index: number) {
	await item.value.update({ system: { skills: withoutIndex(system.value.skills, index) } });
}

async function updateQualities(qualities: ContainedItemQuality[] | undefined) {
	if (qualities) {
		await item.value.update({ system: { qualities } });
	}
}

function deleteQuality(index: number) {
	return updateQualities(withoutIndex(system.value.qualities, index));
}

function updateQualityRating(index: number, event: Event) {
	const rating = parseInt((event.target as HTMLInputElement).value, 10);
	return updateQualities(withQualityRating(system.value.qualities, index, rating));
}
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<slot name="extra-data" />

				<DataRow label="Genesys.Labels.Damage" name="system.baseDamage" :value="system.baseDamage" type="number" />

				<DataRow label="Genesys.Labels.Critical" name="system.critical" :value="system.critical" type="number" />

				<DataRow label="Genesys.Labels.Range">
					<select name="system.range" :value="system.range">
						<option v-for="(label, range) in RANGE_LABELS" :key="range" :value="range">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<EquipmentRows :system="system" />

				<DataRow label="Genesys.Labels.Skills">
					<div>
						<div v-for="(skill, index) in system.skills" :key="index" class="data">
							<div>{{ skill }}</div>
							<a @click="deleteSkill(index)"><i class="fas fa-trash"></i></a>
						</div>
					</div>
				</DataRow>

				<DataRow label="Genesys.Labels.Qualities">
					<div>
						<div v-for="(quality, index) in system.qualities" :key="index" class="data-rated">
							<div>{{ quality.name }}</div>
							<div>
								<span v-if="quality.isRated"
									><input type="text" :value="quality.rating" @blur="updateQualityRating(index, $event)"
								/></span>
							</div>
							<a @click="deleteQuality(index)"><i class="fas fa-trash"></i></a>
						</div>
					</div>
				</DataRow>
			</section>
		</template>
	</BasicItemSheet>
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
