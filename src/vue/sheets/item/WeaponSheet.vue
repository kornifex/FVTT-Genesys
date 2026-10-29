<script lang="ts" setup>
import { toRef } from 'vue';

import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BaseWeaponSheet from '@/vue/sheets/item/BaseWeaponSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { CHARACTERISTICS } from '@/data/Characteristics';

const { document: item } = useSheetDocument<GenesysItem<WeaponDataModel>>();

const system = toRef(() => item.value.systemData);
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
