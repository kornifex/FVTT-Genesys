<script lang="ts" setup>
import { computed, onUpdated, ref, useTemplateRef } from 'vue';
import type { Stored } from '@/data/Stored';
import { useRendered, useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import { startDocumentDrag } from '@/data/DragTransferData';
import { openSheet } from '@/operations/ItemActions';
import { type CrewPlace, placeActor, roleName } from '@/actor/data/CrewRoster';
import type { RowAction, RowRemoval } from '@/vue/components/RowAction';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';

import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import RowActions from '@/vue/components/RowActions.vue';

const props = withDefaults(
	defineProps<{
		actor: Stored<GenesysActor>;
		dragging?: boolean;
		mini?: boolean;
	}>(),
	{
		dragging: false,
		mini: false,
	},
);

const emit = defineEmits<{
	(e: 'removeMember'): void;
}>();

const { document: vehicle } = useSheetDocument<GenesysActor<'vehicle'>>();

// Named as the prop, which it shadows in the template: the tile reads the actor through `useRendered`.
const actor = useRendered(() => props.actor);

const isBeingDragged = ref(false);
const imageDom = ref<HTMLImageElement | null>(null);
// The passenger tile's menu, which a right-click anywhere on the tile opens.
const menu = useTemplateRef<ContextMenuHandle>('menu');

const career = computed(() =>
	actor.value.type === 'character' ? actor.value.items.find((item) => item.type === 'career')?.name : undefined,
);

// When we are on "tile" mode the image DOM element used to display the actor's picture is wrapped by a context menu
// component. Sadly, even when we force a re-render of this component sometimes said DOM element won't be re-rendered
// with the latest data from the actor. Therefore, we keep a reference to the element and update it manually if needed.
onUpdated(() => {
	const imageDomValue = imageDom.value;
	if (imageDomValue) {
		const img = props.actor.img;
		if (img && imageDomValue.getAttribute('src') !== img) {
			imageDomValue.setAttribute('src', img);
		}

		if (imageDomValue.getAttribute('alt') !== props.actor.name) {
			imageDomValue.setAttribute('alt', props.actor.name);
		}
	}
});

// The tile is a member of the sheet's vehicle's Crew: its drag tells which vehicle it leaves, so that a drop on another
// vehicle moves it there, and one on this vehicle moves it within the Crew.
function dragStart(event: DragEvent) {
	isBeingDragged.value = true;
	startDocumentDrag(event, props.actor, { sourceVehicleUuid: vehicle.value.uuid });
}

function dragEnd() {
	isBeingDragged.value = false;
}

async function openActorSheet() {
	await openSheet(props.actor);
}

// Moving the actor within the Crew, which a drag of its tile did alone: to each Role it isn't in, and from a Role back to
// the passengers, last.
async function placeInCrew(place: CrewPlace) {
	await vehicle.value.system.updateCrew((crew) => placeActor(crew, props.actor.uuid, place));
}

function crewActions(): RowAction[] {
	const { roles } = vehicle.value.system.crew;
	const inRole = roles.some((role) => role.members.includes(props.actor.uuid));
	return [
		...roles
			.filter((role) => !role.members.includes(props.actor.uuid))
			.map((role) => ({
				icon: 'fas fa-user-tag',
				label: 'Genesys.Labels.AssignToRole',
				labelData: { role: roleName(role, game.i18n) },
				run: () => placeInCrew({ kind: 'role', roleId: role.id }),
			})),
		...(inRole
			? [
					{
						icon: 'fas fa-users',
						label: 'Genesys.Labels.MoveToPassengers',
						run: () => placeInCrew({ kind: 'passengers', position: 'last' }),
					},
				]
			: []),
	];
}

// Removing the actor from the Crew deletes nothing: the actor stays in the world, so it asks nothing.
const removal: RowRemoval = { label: 'Genesys.Labels.RemoveFromCrew', icon: 'fas fa-user-minus', run: () => emit('removeMember') };
</script>

<template>
	<div
		v-if="mini"
		:class="{
			'actor-tile-mini': true,
			'drag-dim': props.dragging && !isBeingDragged,
			'drag-source': isBeingDragged,
		}"
		@dragstart="dragStart"
		@dragend="dragEnd"
		@contextmenu="menu?.open($event)"
	>
		<img :src="actor.img ?? undefined" :alt="actor.name" draggable="false" />

		<div class="details">
			<span class="name">
				<ActionButton @click="openActorSheet">{{ actor.name }}</ActionButton>
			</span>

			<div v-if="career"><Localized label="Genesys.Labels.Career" />: {{ career }}</div>
		</div>

		<RowActions ref="menu" class="actions" :document="actor" :actions="crewActions()" :removal="removal" />
	</div>

	<div
		v-else
		:class="{
			'actor-tile-normal': true,
			'drag-dim': props.dragging && !isBeingDragged,
			'drag-source': isBeingDragged,
		}"
		:data-tooltip="actor.name"
		@dragstart="dragStart"
		@dragend="dragEnd"
	>
		<RowActions class="actions" position="above" :document="actor" :actions="crewActions()" :removal="removal">
			<img ref="imageDom" :src="actor.img ?? undefined" :alt="actor.name" draggable="false" />
		</RowActions>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.actor-tile-mini {
	display: grid;
	grid-template-columns: [icon] 2rem [name] auto [spacer] 1fr [actions] auto;
	grid-template-rows: auto auto;
	align-items: center;
	column-gap: 0.5em;

	background: colors.alpha(colors.$light-blue, 0.15);
	border: 1px solid colors.alpha(colors.$light-blue, 0.3);
	border-radius: 0.25em;
	padding: 2px;

	margin-bottom: 0.25em;

	&:hover {
		background: colors.alpha(colors.$light-blue, 0.25);
		border: 1px solid colors.alpha(colors.$light-blue, 0.5);
	}

	img {
		grid-column: icon / span 1;
		border-radius: 0.25em;
	}

	& > .name {
		grid-column: name / span 1;
	}

	.name {
		font-family: 'Roboto Serif', serif;
		font-size: 1.15em;
		display: flex;
		align-items: center;
		gap: 0.25em;
	}

	.details {
		display: grid;
		grid-template-rows: auto auto;
		grid-column: name / span 2;
		font-family: 'Roboto Serif', serif;

		& > div {
			grid-row: 2 / span 1;
			display: flex;
			flex-wrap: wrap;
			font-size: 0.9em;
			color: colors.$dark-blue;
			gap: 0.25em;

			&:not([data-item-type='container']) {
				margin-left: 0.5em;
			}

			& > div {
				&:after {
					display: inline;
					content: ';';
				}

				&:last-child:after {
					display: none;
				}
			}
		}
	}

	.actions {
		grid-column: actions / span 1;
		width: 1.25em;
		text-align: center;
	}
}

.actor-tile-normal {
	&:hover {
		background: colors.alpha(colors.$light-blue, 0.25);
		border: 2px solid colors.alpha(colors.$light-blue, 0.5);
		border-radius: 1em;

		img {
			padding: 2px;
			border: none;
		}
	}

	img {
		display: block;
		background: colors.alpha(colors.$gold, 0.5);
		border: 1px solid colors.$gold;
		border-radius: 1em;
	}

	// The tile's ⋮, its menu's own, which :deep() reaches, sits under the portrait.
	:deep(.menu-trigger) {
		display: block;
		margin: 0 auto;
	}
}

.actor-tile-normal,
.actor-tile-mini {
	user-select: none;
	transition: all 0.25s ease-in-out;

	&.drag-source {
		background: colors.alpha(colors.$light-blue, 0.4) !important;
		border: 1px solid colors.alpha(colors.$light-blue, 0.6) !important;
	}

	&.drag-dim {
		position: relative;

		background: colors.alpha(colors.$shadow, 0.15);
		border: 1px solid colors.alpha(colors.$shadow, 0.3);

		opacity: 65%;
	}
}
</style>
