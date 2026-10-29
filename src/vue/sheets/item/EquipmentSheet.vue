<script lang="ts" setup>
import { toRef } from 'vue';

import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';

const { document: item } = useSheetDocument<GenesysItem<EquipmentDataModel>>();

const system = toRef(() => item.value.systemData);
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
