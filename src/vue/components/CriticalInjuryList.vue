<script lang="ts" setup>
import type { Stored } from '@/data/Stored';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import { severityDifficulty } from '@/item/data/Injuries';
import { deleteItem, openSheet } from '@/operations/ItemActions';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import Glyphs from '@/vue/components/Glyphs.vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';

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
</script>

<template>
	<ListEmpty v-if="injuries.length === 0" />
	<div v-else :class="kind.list">
		<div :class="[kind.row, 'critical', 'columns']">
			<div><Localized label="Genesys.Labels.Severity" /></div>
			<div><Localized :label="kind.label" /></div>
		</div>

		<div v-for="injury in injuries" :key="injury.id" :class="[kind.row, 'critical']">
			<div class="severity">
				<!-- The image's words name the button. -->
				<ActionButton @click="emit('roll', injury)"><Glyphs :glyphs="severityDifficulty(injury.system.severity)" /></ActionButton>
			</div>
			<DescriptionFold class="name" :description="injury.system.description">
				<ActionButton @click="openSheet(injury)">{{ injury.name }}</ActionButton>
			</DescriptionFold>
			<div v-if="editable" class="actions">
				<ActionButton icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(injury)" />
				<ActionButton icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(injury)" />
			</div>
			<div v-else />
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';
@use '@scss/mixins/combat-tab.scss';
@use '@scss/mixins/headings.scss';

.critical-injuries,
.critical-hits {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	padding: 0.25em;
}

.columns {
	@include headings.font;
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

	// The name and the fold are the roots of the row's `DescriptionFold`, which take no scope attribute from the row: :deep()
	// reaches them.
	& > :deep(.name) {
		font-family: 'Roboto Serif', serif;
	}

	&:last-child {
		border-bottom: none;
	}

	& > :deep(.description-fold) {
		@include combat-tab.row-description(1em);
	}
}

.actions {
	display: flex;
	gap: 0.25em;
}
</style>
