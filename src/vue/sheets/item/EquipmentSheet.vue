<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import type { EquipmentType } from '@/item/ItemTypes';

const { system } = useSheetDocument<GenesysItem<EquipmentType>>();
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
