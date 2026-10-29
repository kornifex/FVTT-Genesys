<script lang="ts" setup>
import { toRef } from 'vue';

import { CHARACTERISTICS } from '@/data/Characteristics';
import { SKILL_CATEGORIES, SKILL_CATEGORY_LABELS } from '@/data/Skills';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import Tooltip from '@/vue/components/Tooltip.vue';

const { document: item } = useSheetDocument<GenesysItem<SkillDataModel>>();

const system = toRef(() => item.value.systemData);
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Characteristic">
					<select name="system.characteristic" :value="system.characteristic">
						<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.Category">
					<select name="system.category" :value="system.category">
						<option v-for="category in SKILL_CATEGORIES" :key="category" :value="category">
							<Localized :label="SKILL_CATEGORY_LABELS[category]" />
						</option>
					</select>
				</DataRow>

				<div class="row">
					<label>
						<Tooltip content="Genesys.Tooltips.IsInitiative" localized
							><Localized label="Genesys.Labels.IsInitiative"
						/></Tooltip>
					</label>
					<input type="checkbox" name="system.initiative" :checked="system.initiative" />
				</div>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>
