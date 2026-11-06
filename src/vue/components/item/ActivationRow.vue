<script lang="ts" setup>
import DataRow from '@/vue/components/DataRow.vue';
import Localized from '@/vue/components/Localized.vue';
import { vLocalize } from '@/vue/directives';
import type { AbilityActivation } from '@/data/schemaFields';

defineProps<{
	/**
	 * The `system.activation` of a talent or an ability.
	 */
	activation: AbilityActivation;
}>();
</script>

<template>
	<!-- The row's label names the group and its type; the detail has a name of its own. -->
	<DataRow label="Genesys.Labels.Activation" group v-slot="{ labelId }">
		<div class="activation-field">
			<select name="system.activation.type" :value="activation.type" :aria-labelledby="labelId">
				<option value="active"><Localized label="Genesys.Labels.Active" /></option>
				<option value="passive"><Localized label="Genesys.Labels.Passive" /></option>
			</select>

			<input
				type="text"
				name="system.activation.detail"
				:value="activation.detail"
				v-localize:aria-label="'Genesys.Labels.ActivationDetail'"
			/>
		</div>
	</DataRow>
</template>

<style lang="scss" scoped>
.activation-field {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0.25em;
}
</style>
