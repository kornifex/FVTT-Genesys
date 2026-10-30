<script lang="ts" setup>
import type { Stored } from '@/data/Stored';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import { severityDifficulty } from '@/item/data/Injuries';
import { deleteItem, openSheet } from '@/operations/ItemActions';
import Localized from '@/vue/components/Localized.vue';
import Enriched from '@/vue/components/Enriched.vue';
import DescriptionToggle from '@/vue/components/DescriptionToggle.vue';
import { useOpenRows } from '@/vue/useOpenRows';

// A character suffers Critical Injuries, a vehicle Critical Hits: the same items, under their own names.
const KINDS = {
	injury: { list: 'critical-injuries', row: 'injury', label: 'Genesys.Labels.Injury' },
	hit: { list: 'critical-hits', row: 'critical-hit', label: 'Genesys.Labels.Hit' },
} as const;

const props = defineProps<{
	kind: keyof typeof KINDS;
	injuries: Stored<GenesysItem<'injury'>>[];
}>();

const emit = defineEmits<{
	/**
	 * The severity of an injury was clicked, to heal or repair it.
	 */
	(e: 'roll', injury: Stored<GenesysItem<'injury'>>): void;
}>();

const { editable } = useSheetDocument();
const kind = KINDS[props.kind];
const { isOpen, toggle } = useOpenRows();
</script>

<template>
	<div :class="kind.list">
		<div :class="[kind.row, 'critical', 'header']">
			<div><Localized label="Genesys.Labels.Severity" /></div>
			<div><Localized :label="kind.label" /></div>
		</div>

		<div v-for="injury in injuries" :key="injury.id" :class="[kind.row, 'critical']">
			<div class="severity">
				<a @click="emit('roll', injury)">{{ severityDifficulty(injury.system.severity) }}</a>
			</div>
			<div class="name">
				<a @click="openSheet(injury)">{{ injury.name }}</a>
				<DescriptionToggle :description="injury.system.description" :open="isOpen(injury.id)" @toggle="toggle(injury.id)" />
			</div>
			<div v-if="editable" class="actions">
				<a @click="openSheet(injury)"><i class="fas fa-edit"></i></a>
				<a @click="deleteItem(injury)"><i class="fas fa-trash"></i></a>
			</div>
			<div v-else />
			<div :class="['description', { active: isOpen(injury.id) }]"><Enriched :value="injury.system.description" /></div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';
@use '@scss/mixins/combat-tab.scss';

.critical-injuries,
.critical-hits {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	padding: 0.25em;
}

.header {
	font-family: 'Bebas Neue', sans-serif;
}

.severity {
	font-family: 'Genesys Symbols', sans-serif;
	font-size: 1.25em;
	color: colors.$die-difficulty;
	-webkit-text-stroke: 1px black;
	text-stroke: 1px black;
	letter-spacing: -2px;
	position: relative;
	top: 0.25em;
}

.critical {
	display: grid;
	grid-template-columns: /* Severity */ 70px /* Name */ 1fr /* Actions */ auto;
	grid-template-rows: auto auto;
	align-items: center;
	border-bottom: 1px dashed colors.$blue;
	column-gap: 0.5em;

	.name {
		font-family: 'Roboto Serif', serif;
	}

	&:last-child {
		border-bottom: none;
	}

	.description {
		@include combat-tab.row-description(1em);
	}
}

.actions {
	display: flex;
	gap: 0.25em;
}
</style>
