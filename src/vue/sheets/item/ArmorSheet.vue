<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import DataRow from '@/vue/components/DataRow.vue';
import QualityRows from '@/vue/components/item/QualityRows.vue';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';

const { document: item, system } = useSheetDocument<GenesysItem<'armor'>>();

async function updateQualities(qualities: ContainedItemQuality[]) {
	await item.value.update({ system: { qualities } });
}
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Defense" name="system.defense" :value="system.defense" type="number" />

				<DataRow label="Genesys.Labels.Soak" name="system.soak" :value="system.soak" type="number" />

				<EquipmentRows :system="system" hard-points />

				<DataRow label="Genesys.Labels.Qualities" group>
					<div>
						<QualityRows :qualities="system.qualities" path="system.qualities" @change="updateQualities" />
					</div>
				</DataRow>
			</section>
		</template>
	</BasicItemSheet>
</template>
