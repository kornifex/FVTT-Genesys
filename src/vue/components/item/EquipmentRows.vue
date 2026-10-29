<script lang="ts" setup>
import DataRow from '@/vue/components/DataRow.vue';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';

defineProps<{
	system: EquipmentDataModel;
}>();
</script>

<template>
	<DataRow label="Genesys.Labels.Encumbrance" name="system.encumbrance" :value="system.encumbrance" type="number" />
	<DataRow label="Genesys.Labels.Price" name="system.price" :value="system.price" type="number" />
	<DataRow label="Genesys.Labels.Rarity" name="system.rarity" :value="system.rarity" type="number" />
	<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
</template>
