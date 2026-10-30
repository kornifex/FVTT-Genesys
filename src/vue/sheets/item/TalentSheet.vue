<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import ActivationRow from '@/vue/components/item/ActivationRow.vue';
import { MAX_TIER } from '@/item/data/Talents';

const { system } = useSheetDocument<GenesysItem<'talent'>>();
</script>

<template>
	<BasicItemSheet show-effects-tab has-decoration>
		<template v-slot:decoration>
			<div class="talent-tier">{{ system.tier }}</div>
		</template>

		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Tier">
					<input type="number" name="system.tier" :value="system.tier" :min="1" :max="MAX_TIER" />
				</DataRow>

				<ActivationRow :activation="system.activation" />

				<DataRow label="Genesys.Labels.Ranked">
					<select name="system.ranked" :value="system.ranked">
						<option value="yes"><Localized label="Genesys.Labels.Yes" /></option>
						<option value="no"><Localized label="Genesys.Labels.No" /></option>
					</select>
				</DataRow>

				<DataRow v-if="system.ranked === 'yes'" label="Genesys.Labels.EffectsScaleWithRank">
					<select name="system.scalesWithRank" :value="system.scalesWithRank">
						<option value="yes"><Localized label="Genesys.Labels.Yes" /></option>
						<option value="no"><Localized label="Genesys.Labels.No" /></option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.talent-tier {
	display: flex;
	align-items: center;
	justify-content: center;
	aspect-ratio: 1;
	height: 100%;
	border-radius: 50%;
	border: 1px dashed colors.$gold;
	font-family: 'Roboto Slab', sans-serif;
	font-size: 2em;
	margin-right: 1em;
}
</style>
