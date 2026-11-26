<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import DataRow from '@/vue/components/DataRow.vue';
import QualityRows from '@/vue/components/item/QualityRows.vue';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';

const { document: item, system } = useSheetDocument<GenesysItem<'attachment'>>();

async function updateQualities(qualities: ContainedItemQuality[]) {
	await item.value.update({ system: { qualities } });
}
</script>

<template>
	<!-- Its enabled effects are its base modifiers, its disabled ones the modification options the table installs. -->
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow
					label="Genesys.Labels.HardPointsRequired"
					name="system.hardPointsRequired"
					:value="system.hardPointsRequired"
					type="number"
				/>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />

				<DataRow label="Genesys.Labels.Qualities" group>
					<div>
						<QualityRows :qualities="system.qualities" path="system.qualities" @change="updateQualities" />
					</div>
				</DataRow>
			</section>
		</template>
	</BasicItemSheet>
</template>
