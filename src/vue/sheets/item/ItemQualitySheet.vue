<script lang="ts" setup>
import { toRef } from 'vue';

import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { ItemQualityDataModel } from '@/item/data/ItemQualityDataModel';

const { document: item } = useSheetDocument<GenesysItem<ItemQualityDataModel>>();

const system = toRef(() => item.value.systemData);
</script>

<template>
	<BasicItemSheet>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Activation">
					<select name="system.activation" :value="system.activation">
						<option value="passive"><Localized label="Genesys.Labels.Passive" /></option>
						<option value="active"><Localized label="Genesys.Labels.Active" /></option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.IsRated">
					<input type="checkbox" name="system.isRated" :checked="system.isRated" />
				</DataRow>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>
