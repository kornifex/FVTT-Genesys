<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import DataRow from '@/vue/components/DataRow.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import type { GearDataModel } from '@/item/data/GearDataModel';
import type { EquipmentType } from '@/item/ItemTypes';

const { document: item, system } = useSheetDocument<GenesysItem<EquipmentType>>();

// Only gear can be Wearable Gear. The sheet shows consumables and Containers too.
// The item's type tells its data, which Foundry builds with the DataModel registered for that type.
const gear = computed(() => (item.value.type === 'gear' ? (system.value as GearDataModel) : undefined));
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<template v-if="gear">
					<DataRow label="Genesys.Labels.Wearable" v-slot="{ id }">
						<input :id="id" class="gear-wearable" type="checkbox" name="system.wearable" :checked="gear.wearable" />
					</DataRow>

					<!-- Left empty, the worn encumbrance is null: the gear counts its encumbrance while worn. -->
					<DataRow v-if="gear.wearable" label="Genesys.Labels.WornEncumbrance" v-slot="{ id }">
						<input
							:id="id"
							class="gear-worn-encumbrance"
							type="number"
							min="0"
							step="1"
							name="system.wornEncumbrance"
							:value="gear.wornEncumbrance ?? ''"
						/>
					</DataRow>
				</template>

				<EquipmentRows :system="system" />
			</section>
		</template>
	</BasicItemSheet>
</template>
