<script lang="ts" setup>
import DataRow from '@/vue/components/DataRow.vue';
import Localized from '@/vue/components/Localized.vue';
import type { AbilityActivation } from '@/data/schemaFields';

defineProps<{
	/**
	 * The `system.activation` of a talent or an ability.
	 */
	activation: AbilityActivation;
}>();
</script>

<template>
	<DataRow label="Genesys.Labels.Activation">
		<div class="activation-field">
			<select name="system.activation.type" :value="activation.type">
				<option value="active"><Localized label="Genesys.Labels.Active" /></option>
				<option value="passive"><Localized label="Genesys.Labels.Passive" /></option>
			</select>

			<input type="text" name="system.activation.detail" :value="activation.detail" />
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
