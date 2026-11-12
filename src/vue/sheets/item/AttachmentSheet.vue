<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import DataRow from '@/vue/components/DataRow.vue';

const { system } = useSheetDocument<GenesysItem<'attachment'>>();
</script>

<template>
	<!-- Its enabled effects are its base modifiers, its disabled ones the modification options the table installs. -->
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow
					label="Genesys.Labels.HardPointsRequired"
					name="system.hardPointsRequired"
					:value="system.hardPointsRequired"
					type="number"
				/>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>
