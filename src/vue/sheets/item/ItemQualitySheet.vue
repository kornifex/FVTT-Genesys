<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';

const { system } = useSheetDocument<GenesysItem<'quality'>>();
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Activation" v-slot="{ id }">
					<select :id="id" name="system.activation" :value="system.activation">
						<option value="passive"><Localized label="Genesys.Labels.Passive" /></option>
						<option value="active"><Localized label="Genesys.Labels.Active" /></option>
					</select>
				</DataRow>

				<!-- Only an active quality is triggered by spending Advantage. -->
				<DataRow
					v-if="system.activation === 'active'"
					label="Genesys.Labels.AdvantageCost"
					name="system.advantageCost"
					:value="system.advantageCost"
					type="number"
				/>

				<DataRow label="Genesys.Labels.IsRated" v-slot="{ id }">
					<input :id="id" type="checkbox" name="system.isRated" :checked="system.isRated" />
				</DataRow>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>
