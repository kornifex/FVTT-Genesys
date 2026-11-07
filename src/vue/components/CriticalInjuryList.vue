<script lang="ts" setup>
import type { Stored } from '@/data/Stored';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import { severityDifficulty } from '@/item/data/Injuries';
import { deleteItem, openSheet } from '@/operations/ItemActions';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import Enriched from '@/vue/components/Enriched.vue';
import Glyphs from '@/vue/components/Glyphs.vue';
import RollLink from '@/vue/components/RollLink.vue';
import DescriptionToggle from '@/vue/components/DescriptionToggle.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';
import { useOpenRows } from '@/vue/useOpenRows';

// A character suffers Critical Injuries, a vehicle Critical Hits: the same items, under their own names. A character
// heals one with the world's healing skill, and a vehicle's crew repairs one with its repairing skill.
const KINDS = {
	injury: {
		list: 'critical-injuries',
		row: 'injury',
		label: 'Genesys.Labels.Injury',
		rollLabel: 'Genesys.Tooltips.RollHealing',
		rollData: (name: string) => ({ skill: CONFIG.genesys.settings.skillForHealingInjury, injury: name }),
	},
	hit: {
		list: 'critical-hits',
		row: 'critical-hit',
		label: 'Genesys.Labels.Hit',
		rollLabel: 'Genesys.Tooltips.RollRepair',
		rollData: (name: string) => ({ skill: CONFIG.genesys.settings.skillForRepairingHit, hit: name }),
	},
} as const;

const props = defineProps<{
	kind: keyof typeof KINDS;
	injuries: Stored<GenesysItem<'injury'>>[];
}>();

const emit = defineEmits<{
	/**
	 * The name of an injury was clicked, to heal or repair it.
	 */
	(e: 'roll', injury: Stored<GenesysItem<'injury'>>): void;
}>();

const { editable } = useSheetDocument();
const kind = KINDS[props.kind];
const { isOpen, toggle } = useOpenRows();
</script>

<template>
	<ListEmpty v-if="injuries.length === 0" />
	<div v-else :class="kind.list">
		<div :class="[kind.row, 'critical', 'columns']">
			<div><Localized label="Genesys.Labels.Severity" /></div>
			<div class="name"><Localized :label="kind.label" /></div>
		</div>

		<div v-for="injury in injuries" :key="injury.id" :class="[kind.row, 'critical']">
			<div class="severity"><Glyphs :glyphs="severityDifficulty(injury.system.severity)" /></div>
			<ActionButton class="item-icon" :image="injury.img ?? undefined" label="Genesys.Tooltips.OpenItem" @click="openSheet(injury)" />
			<div class="name">
				<RollLink :label="kind.rollLabel" :label-data="kind.rollData(injury.name)" @roll="emit('roll', injury)">{{
					injury.name
				}}</RollLink>
				<DescriptionToggle :description="injury.system.description" :open="isOpen(injury.id)" @toggle="toggle(injury.id)" />
			</div>
			<div v-if="editable" class="actions">
				<ActionButton icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(injury)" />
				<ActionButton icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(injury)" />
			</div>
			<div v-else />
			<div :class="['description', { active: isOpen(injury.id) }]"><Enriched :value="injury.system.description" /></div>
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
	grid-template-columns: /* Severity */ 70px /* Icon */ 1.5rem /* Name */ 1fr /* Actions */ auto;
	grid-template-rows: auto auto;
	align-items: center;
	border-bottom: 1px dashed colors.$blue;
	column-gap: 0.5em;

	.name {
		font-family: 'Roboto Serif', serif;
	}

	// The column's label stands over the icons and the names.
	&.columns .name {
		grid-column: 2 / span 2;
		font-family: inherit;
	}

	// The icon opens the injury's sheet; the name heals or repairs it.
	.item-icon {
		padding: 2px;

		:deep(img) {
			border-radius: 0.25rem;
		}
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
