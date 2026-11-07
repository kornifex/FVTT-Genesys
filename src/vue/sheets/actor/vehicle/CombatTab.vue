<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';

import { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';
import { severityDifficulty } from '@/item/data/Injuries';
import { EquipmentState } from '@/item/data/EquipmentState';

import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';
import CriticalInjuryList from '@/vue/components/CriticalInjuryList.vue';
import QualityList from '@/vue/components/QualityList.vue';
import RollLink from '@/vue/components/RollLink.vue';
import WeaponProfileStats from '@/vue/components/WeaponProfileStats.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';

import { rollForCrew } from '@/operations/CrewRoll';
import { attackWithVehicleWeapon, openSheet } from '@/operations/ItemActions';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { firingArcLabels } from '@/item/Weapons';

const { document: actor } = useSheetDocument<GenesysActor<'vehicle'>>();

const weapons = computed(() => itemsOfType(actor.value, 'vehicleWeapon').filter((i) => i.system.state === EquipmentState.Equipped));
const criticalHits = computed(() => itemsOfType(actor.value, 'injury'));

async function repairHit(criticalHit: GenesysItem<'injury'>) {
	await rollForCrew(crewForSkills(actor.value.system.crew, [CONFIG.genesys.settings.skillForRepairingHit]), {
		difficulty: severityDifficulty(criticalHit.system.severity),
	});
}
</script>

<template>
	<section class="tab-combat">
		<div class="block">
			<h3><Localized label="Genesys.Labels.Attacks" /></h3>
			<div v-if="weapons.length > 0" class="weapons">
				<div class="weapon columns">
					<div class="name"><Localized label="Genesys.Labels.Name" /></div>
					<div class="skill"><Localized label="Genesys.Labels.Skill" /></div>
					<WeaponProfileStats layout="grid" labels />
					<div class="firing-arc"><Localized label="Genesys.Labels.FiringArc" /></div>
				</div>

				<div v-for="weapon in weapons" :key="weapon.id" class="weapon">
					<ActionButton
						class="item-icon"
						:image="weapon.img ?? undefined"
						label="Genesys.Tooltips.OpenItem"
						@click="openSheet(weapon)"
					/>

					<DescriptionFold class="name" :description="weapon.system.description">
						<RollLink
							label="Genesys.Tooltips.RollAttack"
							:label-data="{ weapon: weapon.name }"
							@roll="attackWithVehicleWeapon(actor, weapon)"
							>{{ weapon.name }}</RollLink
						>
					</DescriptionFold>

					<div class="skill" v-if="weapon.system.skills.length > 0">
						{{ weapon.system.skills.join(', ') }}
					</div>
					<div class="skill" v-else><Localized label="Genesys.Labels.SkillNotFound" /></div>

					<WeaponProfileStats layout="grid" :profile="weapon.system" />

					<div class="firing-arc">
						<span v-for="label in firingArcLabels(weapon.system.firingArc)" :key="label"><Localized :label="label" /></span>
					</div>

					<QualityList :qualities="weapon.system.qualities" tags class="qualities" />
				</div>
			</div>
			<ListEmpty v-else />
		</div>

		<div class="block">
			<h3><Localized label="Genesys.Labels.CriticalHits" /></h3>
			<CriticalInjuryList kind="hit" :injuries="criticalHits" @roll="repairHit" />
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/combat-tab.scss';

.tab-combat {
	@include combat-tab.tab;

	.weapon {
		grid-template-columns: 1.5rem 2fr 1fr repeat(4, 80px);
		@include combat-tab.item-row;

		.firing-arc {
			text-align: center;

			& > span {
				display: inline-flex;
				flex-direction: row;
				flex-wrap: nowrap;
				gap: 0.5em;

				&::after {
					content: ',';
					margin-right: 0.25em;
					margin-left: -0.4em;
				}

				&:last-of-type::after {
					display: none;
				}
			}
		}
	}
}
</style>
