<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import DataRow from '@/vue/components/DataRow.vue';
import ActivationRow from '@/vue/components/item/ActivationRow.vue';
import { AbilityDataModel } from '@/item/data/AbilityDataModel';

const { system } = useSheetDocument<GenesysItem<AbilityDataModel>>();
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<ActivationRow :activation="system.activation" />

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>
