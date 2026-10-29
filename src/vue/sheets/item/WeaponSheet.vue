<script lang="ts" setup>
import { computed, inject } from 'vue';

import { ItemSheetContext, RootContext } from '@/vue/SheetContext';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { CHARACTERISTICS } from '@/data/Characteristics';

const context = inject<ItemSheetContext<WeaponDataModel>>(RootContext)!;

const system = computed(() => context.data.item.systemData);
</script>

<template>
	<BaseWeaponSheet>
		<template v-slot:extra-data>
			<DataRow label="Genesys.Labels.DamageCharacteristic">
				<select name="system.damageCharacteristic" :value="system.damageCharacteristic">
					<option value="-">-</option>
					<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
						<Localized :label="label" />
					</option>
				</select>
			</DataRow>
		</template>
	</BaseWeaponSheet>
</template>
