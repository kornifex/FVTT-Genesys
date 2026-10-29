<script lang="ts" setup>
import { computed, inject } from 'vue';

import { ItemSheetContext, RootContext } from '@/vue/SheetContext';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import { FIRING_ARC_LABELS } from '@/item/Weapons';

const context = inject<ItemSheetContext<VehicleWeaponDataModel>>(RootContext)!;
const system = computed(() => context.data.item.systemData);
</script>

<template>
	<BaseWeaponSheet>
		<template v-slot:extra-data>
			<DataRow label="Genesys.Labels.FiringArc">
				<div class="firing-arc-options">
					<div v-for="(label, arc) in FIRING_ARC_LABELS" :key="arc">
						<input type="checkbox" :name="`system.firingArc.${arc}`" :checked="system.firingArc[arc]" />
						<label><Localized :label="label" /></label>
					</div>
				</div>
			</DataRow>
		</template>
	</BaseWeaponSheet>
</template>

<style lang="scss" scoped>
.firing-arc-options {
	display: grid;
	grid-template-columns: auto auto;
}
</style>
