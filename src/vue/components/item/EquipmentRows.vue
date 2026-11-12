<script lang="ts" setup>
import DataRow from '@/vue/components/DataRow.vue';
import HardPointsRow from '@/vue/components/item/HardPointsRow.vue';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';

withDefaults(
	defineProps<{
		system: EquipmentDataModel;

		/**
		 * Whether the item has Hard Points, worked out from its encumbrance: a weapon or an armor.
		 */
		hardPoints?: boolean;
	}>(),
	{ hardPoints: false },
);
</script>

<template>
	<DataRow label="Genesys.Labels.Encumbrance" name="system.encumbrance" :value="system.encumbrance" type="number" />
	<HardPointsRow v-if="hardPoints" />
	<DataRow label="Genesys.Labels.Price" name="system.price" :value="system.price" type="number" />
	<DataRow label="Genesys.Labels.Rarity" name="system.rarity" :value="system.rarity" type="number" />
	<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
</template>
