<script lang="ts" setup>
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { inject, computed, toRaw, ref, watch } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';

import Localized from '@/vue/components/Localized.vue';
import Role from '@/vue/components/vehicle/Role.vue';
import SortSlot from '@/vue/components/inventory/SortSlot.vue';
import ActorTile from '@/vue/components/ActorTile.vue';

import { GenesysActor } from '@/actor/GenesysActor';
import { CrewDragTransferData, DragTransferData, extractDataFromDragTransferTypes } from '@/data/DragTransferData';
import { addRole, CrewPlace, removeActor, removeRole, removeRoleSkill, renameRole } from '@/actor/data/CrewRoster';
import { receiveCrewEvent } from '@/operations/CrewDrop';

const context = inject<ActorSheetContext<VehicleDataModel>>(RootContext)!;
const system = computed(() => toRaw(context.data.actor).systemData);

const dragCounters = ref({
	role: 0,
	passenger: 0,
});
const passengersActors = ref<GenesysActor[]>([]);

const sortedPassengers = computed(() => [...toRaw(context.data.actor).systemData.passengers.list].sort(sortPassenger));

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
	void receiveCrewEvent(toRaw(context.data.actor), event, place);
}

function dropToRole(event: DragEvent, roleId: string, memberUnder?: ActorUUID | TokenDocumentUUID) {
	void receiveCrewEvent(toRaw(context.data.actor), event, { kind: 'role', roleId, before: memberUnder });
}

async function resetDragCounters(_event: DragEvent) {
	dragCounters.value.role = 0;
	dragCounters.value.passenger = 0;
}

function modifyDragCounters(event: DragEvent, direction: number) {
	const dragDataFromType = extractDataFromDragTransferTypes(event.dataTransfer?.types);
	if (!dragDataFromType) {
		return;
	}

	if (VehicleDataModel.isRelevantTypeForContext('ROLE', dragDataFromType.genesysType)) {
		dragCounters.value.role += direction;
	}
	if (VehicleDataModel.isRelevantTypeForContext('PASSENGER', dragDataFromType.genesysType)) {
		dragCounters.value.passenger += direction;
	}
}

function dragStart(event: DragEvent) {
	const dragData = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '{}') as DragTransferData;
	const crewDragData: CrewDragTransferData = {
		...dragData,
		sourceVehicleUuid: context.data.actor.uuid,
	};

	event.dataTransfer?.setData('text/plain', JSON.stringify(crewDragData));
}

function dragEnter(event: DragEvent) {
	modifyDragCounters(event, 1);
}

function dragLeave(event: DragEvent) {
	modifyDragCounters(event, -1);
}
</script>

<template>
	<section class="tab-crew" @drop.capture="resetDragCounters" @dragenter="dragEnter" @dragleave="dragLeave">
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
						:dragging="dragCounters.role > 0"
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
			<SortSlot :active="dragCounters.passenger > 0" @drop="dropToPassengers($event, { kind: 'passengers', position: 'first' })" />

			<TransitionGroup name="crew-trans">
				<template v-for="passenger in passengersActors" :key="passenger.uuid">
					<ActorTile
						:actor="passenger as GenesysActor"
						:mini="true"
						:dragging="dragCounters.passenger > 0"
						draggable="true"
						@remove-member="system.updateCrew((crew) => removeActor(crew, passenger.uuid))"
						@dragstart="dragStart"
					/>

					<SortSlot
						:active="dragCounters.passenger > 0"
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
