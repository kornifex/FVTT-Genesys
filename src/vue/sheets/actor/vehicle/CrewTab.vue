<script lang="ts" setup>
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { computed, shallowRef, watch } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';

import Localized from '@/vue/components/Localized.vue';
import Role from '@/vue/components/vehicle/Role.vue';
import SortSlot from '@/vue/components/inventory/SortSlot.vue';
import ActorTile from '@/vue/components/ActorTile.vue';

import { GenesysActor } from '@/actor/GenesysActor';
import { CrewDragTransferData, dragData, draggedGenesysType } from '@/data/DragTransferData';
import { addRole, CrewPlace, removeActor, removeRole, removeRoleSkill, renameRole } from '@/actor/data/CrewRoster';
import { receiveCrewEvent } from '@/operations/CrewDrop';
import { useDragHover } from '@/vue/useDragHover';

const { document: actor, system } = useSheetDocument<GenesysActor<VehicleDataModel>>();

// A drag over the tab lights up the places that take the dragged actor: the roles, and the passengers.
const roleDrag = useDragHover((event) => VehicleDataModel.isRelevantTypeForContext('ROLE', draggedGenesysType(event) ?? ''));
const passengerDrag = useDragHover((event) => VehicleDataModel.isRelevantTypeForContext('PASSENGER', draggedGenesysType(event) ?? ''));
// Shallow, so that Vue never wraps the actors in reactive proxies.
const passengersActors = shallowRef<GenesysActor[]>([]);

const sortedPassengers = computed(() => [...actor.value.systemData.passengers.list].sort(sortPassenger));

// Make sure to display only actors that exist.
watch(
	sortedPassengers,
	async (passengers) => {
		const foundActors: GenesysActor[] = [];
		for (const passenger of passengers) {
			const actor = await fromUuid<GenesysActor>(passenger.uuid);
			if (actor) {
				foundActors.push(actor);
			}
		}
		passengersActors.value = foundActors;
	},
	{ immediate: true },
);

function sortPassenger(left: { sort: number }, right: { sort: number }) {
	return left.sort - right.sort;
}

function addNewRole() {
	void system.value.updateCrew((crew) => addRole(crew, foundry.utils.randomID()));
}

function dropToPassengers(event: DragEvent, place: CrewPlace) {
	void receiveCrewEvent(actor.value, event, place);
}

function dropToRole(event: DragEvent, roleId: string, memberUnder?: ActorUUID | TokenDocumentUUID) {
	void receiveCrewEvent(actor.value, event, { kind: 'role', roleId, before: memberUnder });
}

function dragStart(event: DragEvent) {
	const crewDragData: CrewDragTransferData = {
		...dragData(event.dataTransfer),
		sourceVehicleUuid: actor.value.uuid,
	};

	event.dataTransfer?.setData('text/plain', JSON.stringify(crewDragData));
}

function dragEnter(event: DragEvent) {
	roleDrag.enter(event);
	passengerDrag.enter(event);
}

function dragLeave(event: DragEvent) {
	roleDrag.leave(event);
	passengerDrag.leave(event);
}

function resetDrags() {
	roleDrag.reset();
	passengerDrag.reset();
}
</script>

<template>
	<section class="tab-crew" @drop.capture="resetDrags" @dragenter="dragEnter" @dragleave="dragLeave">
		<div class="section-header">
			<span><Localized label="Genesys.Labels.Roles" /></span>
			<a @click="addNewRole"><i class="fas fa-plus"></i> <Localized label="Genesys.Labels.Add" /></a>
		</div>

		<section class="roles">
			<TransitionGroup name="crew-trans">
				<template v-for="role in system.roles" :key="role.id">
					<Role
						:id="role.id"
						:name="role.name"
						:skills="role.skills"
						:members="role.members"
						:dragging="roleDrag.isHovered.value"
						@delete="system.updateCrew((crew) => removeRole(crew, role.id))"
						@update-name="(newName) => system.updateCrew((crew) => renameRole(crew, role.id, newName))"
						@remove-skill="(skillName) => system.updateCrew((crew) => removeRoleSkill(crew, role.id, skillName))"
						@remove-member="(memberId) => system.updateCrew((crew) => removeActor(crew, memberId))"
						@actor-drag-start="dragStart"
						@entity-drop="(event, memberUnder) => dropToRole(event, role.id, memberUnder)"
					/>
				</template>
			</TransitionGroup>
		</section>

		<div class="section-header">
			<span><Localized label="Genesys.Labels.Passengers" /></span>
			<div
				:class="{
					'capacity-section': true,
					'over-capacity': system.isOverCapacity,
				}"
			>
				<span v-if="system.isOverCapacity"><Localized label="Genesys.Labels.OverCapacity" /></span>
				<span><i class="fas fa-users"></i></span>
				<span>{{ system.currentPassengers.value }}/{{ system.currentPassengers.threshold }}</span>
			</div>
		</div>

		<section class="passengers">
			<SortSlot :active="passengerDrag.isHovered.value" @drop="dropToPassengers($event, { kind: 'passengers', position: 'first' })" />

			<TransitionGroup name="crew-trans">
				<template v-for="passenger in passengersActors" :key="passenger.uuid">
					<ActorTile
						:actor="passenger as GenesysActor"
						:mini="true"
						:dragging="passengerDrag.isHovered.value"
						draggable="true"
						@remove-member="system.updateCrew((crew) => removeActor(crew, passenger.uuid))"
						@dragstart="dragStart"
					/>

					<SortSlot
						:active="passengerDrag.isHovered.value"
						@drop="dropToPassengers($event, { kind: 'passengers', position: 'after', passenger: passenger.uuid })"
					/>
				</template>
			</TransitionGroup>
		</section>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

.tab-crew {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	padding: 0.5em;

	.roles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5em;
		margin-bottom: 1rem;
	}

	.crew-trans-move,
	.crew-trans-enter-active,
	.crew-trans-leave-active {
		transition: all 0.5s ease;
	}

	.crew-trans-enter-from,
	.crew-trans-leave-to {
		height: 0;
		opacity: 0;
		transform: translateY(50px);
	}

	.capacity-section {
		width: 100%;
		display: flex;
		flex-wrap: nowrap;
		gap: 0.25em;
		font-family: 'Bebas Neue', sans-serif;
		align-items: center;

		background: colors.$dark-blue;
		height: 100%;
		color: white;

		padding-right: 0.5em;
		border-radius: 0.5rem;

		span {
			margin-left: 0.5em;
		}

		&.over-capacity {
			color: colors.$alert;
		}
	}

	.section-header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		font-size: 1.25em;
		font-family: 'Bebas Neue', sans-serif;
		margin-bottom: 0.5rem;

		> :first-child {
			grid-column: 1 / span 1;
		}

		> :last-child {
			grid-column: 3 / span 1;
		}
	}
}
</style>
