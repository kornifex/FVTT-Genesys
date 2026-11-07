<script lang="ts" setup>
import { shallowRef, useId, watch } from 'vue';

import type { Stored } from '@/data/Stored';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';
import ActorTile from '@/vue/components/ActorTile.vue';
import { GenesysActor } from '@/actor/GenesysActor';
import { useDragHover } from '@/vue/useDragHover';
import { crewActors } from '@/operations/CrewRoll';

const props = withDefaults(
	defineProps<{
		id: string;
		name: string;
		skills: string[];
		members: string[];
		pilot: boolean;
		dragging?: boolean;
	}>(),
	{
		dragging: false,
	},
);

const emit = defineEmits<{
	(e: 'delete'): void;
	(e: 'updateName', newName: string): void;
	(e: 'updatePilot', pilot: boolean): void;
	(e: 'removeSkill', skillName: string): void;
	(e: 'removeMember', memberUuid: string): void;
	(e: 'entityDrop', event: DragEvent, memberUnder?: string): void;
}>();

const { isHovered, enter, leave, reset } = useDragHover();
const fieldId = useId();
// Shallow, so that Vue never wraps the actors in reactive proxies.
const actorsInRole = shallowRef<Stored<GenesysActor>[]>([]);

// Only the members whose actor still exists are shown. Foundry builds the vehicle's system data anew on each of its
// updates, so a change to the members comes as another list. Resolving them is asynchronous: a later change of the
// members replaces the actors still being resolved.
watch(
	() => props.members,
	async (members, _oldMembers, onCleanup) => {
		let stale = false;
		onCleanup(() => (stale = true));

		const actors = await crewActors(members);
		if (!stale) {
			actorsInRole.value = [...actors.values()];
		}
	},
	{ immediate: true },
);

function drop(event: DragEvent, memberUnder?: string) {
	reset();

	emit('entityDrop', event, memberUnder);
}
</script>

<template>
	<div
		:class="{
			'role-section': true,
			'drop-target': props.dragging,
			'drop-hover': props.dragging && isHovered,
		}"
		:data-role-id="props.id"
		@dragenter="enter"
		@dragleave="leave"
		@drop="drop($event)"
	>
		<div class="role-data">
			<div class="role-name">
				<label :for="`${fieldId}-name`"><Localized label="Genesys.Labels.Name" /></label>
				<input
					:id="`${fieldId}-name`"
					type="text"
					:value="name"
					@change="emit('updateName', ($event.target as HTMLInputElement).value)"
				/>
				<ActionButton icon="fas fa-trash" label="Genesys.Labels.DeleteRole" edits @click="emit('delete')" />
			</div>
			<div class="underline" />

			<div class="role-skills">
				<label><Localized label="Genesys.Labels.Skills" /></label>
				<div>
					<ContextMenu v-for="skill in skills" :key="skill" class="role-skill">
						<template v-slot:menu-items>
							<MenuItem icon="fas fa-trash" label="Genesys.Labels.Delete" @click="emit('removeSkill', skill)" />
						</template>

						<span>{{ skill }}</span>
					</ContextMenu>
				</div>
			</div>
			<div class="underline" />

			<div class="role-pilot" data-tooltip="Genesys.Labels.PilotRoleHint">
				<label :for="`${fieldId}-pilot`"><Localized label="Genesys.Labels.PilotRole" /></label>
				<input
					:id="`${fieldId}-pilot`"
					type="checkbox"
					:checked="pilot"
					@change="emit('updatePilot', ($event.target as HTMLInputElement).checked)"
				/>
			</div>
			<div class="underline" />

			<div class="role-members">
				<TransitionGroup name="mems">
					<div v-for="member in actorsInRole" :key="member.uuid" class="role-member" @drop="drop($event, member.uuid)">
						<ActorTile
							:actor="member"
							draggable="true"
							:dragging="dragging"
							@remove-member="emit('removeMember', member.uuid)"
						/>
					</div>
				</TransitionGroup>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

.role-section {
	grid-column: auto / span 1;
	background: colors.alpha(colors.$light-blue, 0.15);
	border-radius: 1em;
	padding: 0.75em;

	.role-data {
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-rows: repeat(3, auto 1px) 1fr;
		border: 1px solid colors.$ink;
		background: colors.$field;
		align-items: center;
		column-gap: 0.5em;
		height: 100%;

		.role-name,
		.role-skills,
		.role-pilot {
			display: contents;

			label {
				margin-left: 0.25em;
				font-family: 'Roboto Condensed', sans-serif;
				text-transform: uppercase;
				font-weight: 600;
				font-size: 0.8em;
			}
		}

		.role-name {
			@include reset.input;
			input {
				padding-left: 0.25em;
				font-family: 'Roboto', sans-serif;
			}
		}

		.role-pilot input {
			justify-self: start;
		}

		.role-skills {
			& > div {
				display: flex;
				padding-left: 0.25em;
				font-family: 'Roboto', sans-serif;
				min-height: 2em;
				align-items: center;
				flex-wrap: wrap;

				.role-skill {
					& > span {
						display: inline-flex;
						flex-direction: row;
						flex-wrap: nowrap;
						align-items: center;
						gap: 0.5em;
					}

					& > span::after {
						content: ',';
						margin-right: 0.25em;
						margin-left: -0.4em;
					}

					&:last-of-type > span::after {
						display: none;
					}
				}
			}
		}

		.underline {
			grid-column: 1 / span all;
			width: 92%;
			height: 100%;
			background: colors.$ink;
		}

		.role-members {
			grid-column: 1 / span all;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			min-height: 7rem;
			align-items: center;
			justify-content: center;

			.mems-move,
			.mems-enter-active,
			.mems-leave-active {
				transition: all 0.5s ease;
			}

			.mems-enter-from,
			.mems-leave-to {
				height: 0;
				opacity: 0;
				transform: translateY(50px);
			}

			.role-member {
				margin: 0.5rem;
				width: 80px;
				z-index: 5;
			}
		}
	}
}

.drop-target {
	background: colors.alpha(colors.$light-blue, 0.25);

	&.drop-hover {
		background: colors.$light-blue;
	}
}
</style>
