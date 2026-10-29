<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';

import { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';
import { InjuryDataModel } from '@/item/data/InjuryDataModel';
import { severityDifficulty } from '@/item/data/Injuries';
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { EquipmentState } from '@/item/data/EquipmentState';

import Localized from '@/vue/components/Localized.vue';
import CriticalInjuryList from '@/vue/components/CriticalInjuryList.vue';
import QualityList from '@/vue/components/QualityList.vue';

import { rollForCrew } from '@/operations/CrewRoll';
import { attackWithVehicleWeapon } from '@/operations/ItemActions';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { damageFormula, firingArcLabels, RANGE_LABELS } from '@/item/Weapons';

const { document: actor } = useSheetDocument<GenesysActor<VehicleDataModel>>();

const weapons = computed(() => itemsOfType(actor.value, 'vehicleWeapon').filter((i) => i.systemData.state === EquipmentState.Equipped));
const criticalHits = computed(() => itemsOfType(actor.value, 'injury'));

async function repairHit(criticalHit: GenesysItem<InjuryDataModel>) {
	await rollForCrew(crewForSkills(actor.value.systemData.crew, [CONFIG.genesys.settings.skillForRepairingHit]), {
		difficulty: severityDifficulty(criticalHit.systemData.severity),
	});
}
</script>

<template>
	<section class="tab-combat">
		<div class="block">
			<div class="header"><Localized label="Genesys.Labels.Attacks" /></div>
			<div class="weapons">
				<div class="weapon header">
					<div class="name"><Localized label="Genesys.Labels.Name" /></div>
					<div class="skill"><Localized label="Genesys.Labels.Skill" /></div>
					<div class="damage"><Localized label="Genesys.Labels.Damage" /></div>
					<div class="crit"><Localized label="Genesys.Labels.Crit" /></div>
					<div class="range"><Localized label="Genesys.Labels.Range" /></div>
					<div class="firing-arc"><Localized label="Genesys.Labels.FiringArc" /></div>
				</div>

				<div v-for="weapon in weapons" :key="weapon.id" class="weapon">
					<img :src="weapon.img" :alt="weapon.name" />

					<div class="name">
						<a @click="attackWithVehicleWeapon(actor, weapon)">{{ weapon.name }}</a>
					</div>

					<div class="skill" v-if="weapon.systemData.skills.length > 0">
						{{ weapon.systemData.skills.join(', ') }}
					</div>
					<div class="skill" v-else><Localized label="Genesys.Labels.SkillNotFound" /></div>

					<div class="damage">{{ damageFormula(weapon.systemData).baseDamage }}</div>

					<div class="crit">{{ weapon.systemData.critical }}</div>

					<div class="range"><Localized :label="RANGE_LABELS[weapon.systemData.range]" /></div>

					<div class="firing-arc">
						<span v-for="label in firingArcLabels(weapon.systemData.firingArc)" :key="label"><Localized :label="label" /></span>
					</div>

					<QualityList :qualities="weapon.systemData.qualities" tags class="qualities" />
				</div>
			</div>
		</div>

		<div class="block">
			<div class="header"><Localized label="Genesys.Labels.CriticalHits" /></div>
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

		.qualities {
			grid-column: 1 / span all;
			grid-row: 2 / span 1;
		}
	}
}
</style>
