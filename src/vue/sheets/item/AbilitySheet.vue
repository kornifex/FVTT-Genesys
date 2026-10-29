<script lang="ts" setup>
import { computed, inject } from 'vue';

import { ItemSheetContext, RootContext } from '@/vue/SheetContext';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import DataRow from '@/vue/components/DataRow.vue';
import ActivationRow from '@/vue/components/item/ActivationRow.vue';
import { AbilityDataModel } from '@/item/data/AbilityDataModel';

const context = inject<ItemSheetContext<AbilityDataModel>>(RootContext)!;

const system = computed(() => context.data.item.systemData);
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
