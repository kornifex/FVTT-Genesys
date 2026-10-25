<script lang="ts" setup>
import { computed, inject } from 'vue';

import { ItemSheetContext, RootContext } from '@/vue/SheetContext';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { CHARACTERISTICS } from '@/data/Characteristics';

const context = inject<ItemSheetContext<WeaponDataModel>>(RootContext)!;

const system = computed(() => context.data.item.systemData);
</script>

<template>
	<BaseWeaponSheet>
		<template v-slot:extra-data>
			<div class="row">
				<label><Localized label="Genesys.Labels.DamageCharacteristic" /></label>
				<select name="system.damageCharacteristic" :value="system.damageCharacteristic">
					<option value="-">-</option>
					<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
						<Localized :label="label" />
					</option>
				</select>
			</div>
		</template>
	</BaseWeaponSheet>
</template>
