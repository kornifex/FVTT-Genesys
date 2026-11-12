<script lang="ts" setup>
import { computed } from 'vue';
import DataRow from '@/vue/components/DataRow.vue';
import type { ItemChangeField } from '@/item/ItemChanges';

/**
 * The stats of a weapon's profile or of an armor that its effects change, as they apply once changed: "Damage 5,
 * Critical 2". The fields above show the stored values, which the table edits. Nothing when the effects change none.
 */
const props = defineProps<{
	/**
	 * The stored values.
	 */
	stored: Partial<Record<ItemChangeField, number>>;
	/**
	 * The values once the effects change them.
	 */
	prepared: Partial<Record<ItemChangeField, number>>;
	/**
	 * The fields shown, in order.
	 */
	fields: readonly ItemChangeField[];
}>();

const LABELS = {
	baseDamage: 'Genesys.Labels.Damage',
	critical: 'Genesys.Labels.Critical',
	defense: 'Genesys.Labels.Defense',
	soak: 'Genesys.Labels.Soak',
	encumbrance: 'Genesys.Labels.Encumbrance',
} as const satisfies Record<ItemChangeField, string>;

const changed = computed(() =>
	props.fields
		.filter((field) => props.prepared[field] !== props.stored[field])
		.map((field) => `${game.i18n.localize(LABELS[field])} ${props.prepared[field]}`),
);
</script>

<template>
	<DataRow v-if="changed.length > 0" label="Genesys.Labels.WithEffects" group>
		<div class="effective-stats">{{ changed.join(', ') }}</div>
	</DataRow>
</template>
