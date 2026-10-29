<script lang="ts" setup>
import { computed, inject } from 'vue';

import { ItemSheetContext, RootContext } from '@/vue/SheetContext';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';

const context = inject<ItemSheetContext<EquipmentDataModel>>(RootContext)!;

const system = computed(() => context.data.item.systemData);
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<EquipmentRows :system="system" />
			</section>
		</template>
	</BasicItemSheet>
</template>
