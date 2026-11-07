<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import DataRow from '@/vue/components/DataRow.vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { withQualityRating } from '@/item/data/Qualities';
import { withoutIndex } from '@/arrays';
import { confirmDelete } from '@/operations/ItemActions';

const { document: item, system } = useSheetDocument<GenesysItem<'armor'>>();

async function updateQualities(qualities: ContainedItemQuality[] | undefined) {
	if (qualities) {
		await item.value.update({ system: { qualities } });
	}
}

// Removing a quality asks first, naming it.
async function deleteQuality(index: number) {
	if (await confirmDelete(system.value.qualities[index].name)) {
		await updateQualities(withoutIndex(system.value.qualities, index));
	}
}

// The name of a quality's rating field, which shows no label of its own: "Pierce Rating".
function qualityRatingLabel(quality: string) {
	return game.i18n.format('Genesys.Labels.QualityRating', { quality });
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
				<DataRow label="Genesys.Labels.Defense" name="system.defense" :value="system.defense" type="number" />

				<DataRow label="Genesys.Labels.Soak" name="system.soak" :value="system.soak" type="number" />

				<EquipmentRows :system="system" />

				<DataRow label="Genesys.Labels.Qualities" group>
					<div>
						<div v-for="(quality, index) in system.qualities" :key="index" class="data-rated">
							<div>{{ quality.name }}</div>
							<div>
								<span v-if="quality.isRated"
									><input
										type="text"
										:value="quality.rating"
										:aria-label="qualityRatingLabel(quality.name)"
										@blur="updateQualityRating(index, $event)"
								/></span>
							</div>
							<ActionButton icon="fas fa-trash" label="Genesys.Labels.RemoveQuality" edits @click="deleteQuality(index)" />
						</div>
					</div>
				</DataRow>
			</section>
		</template>
	</BasicItemSheet>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.data-rated {
	display: grid;
	grid-template-columns: /* Name */ 2fr /* Rating */ 1fr /* Delete Button */ auto;
	align-items: center;
	border-bottom: 1px dashed colors.$blue;
	padding: 2px;

	&:last-child {
		border-bottom: none;
	}

	.action-button {
		margin-left: 1rem;
	}
}
</style>
