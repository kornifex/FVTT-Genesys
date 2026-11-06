<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { FIRING_ARC_LABELS } from '@/item/Weapons';

const { system } = useSheetDocument<GenesysItem<'vehicleWeapon'>>();
</script>

<template>
	<BaseWeaponSheet>
		<template v-slot:extra-data>
			<DataRow label="Genesys.Labels.FiringArc" group v-slot="{ id }">
				<div class="firing-arc-options">
					<div v-for="(label, arc) in FIRING_ARC_LABELS" :key="arc">
						<input :id="`${id}-${arc}`" type="checkbox" :name="`system.firingArc.${arc}`" :checked="system.firingArc[arc]" />
						<label :for="`${id}-${arc}`"><Localized :label="label" /></label>
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
