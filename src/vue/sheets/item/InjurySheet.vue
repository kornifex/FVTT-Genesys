<script lang="ts" setup>
import { toRef } from 'vue';

import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { InjuryDataModel } from '@/item/data/InjuryDataModel';
import { SEVERITY_LABELS } from '@/item/data/Injuries';

const { document: item } = useSheetDocument<GenesysItem<InjuryDataModel>>();

const system = toRef(() => item.value.systemData);
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Severity">
					<select name="system.severity" :value="system.severity">
						<option value="-">—</option>
						<option v-for="(label, severity) in SEVERITY_LABELS" :key="severity" :value="severity">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>
