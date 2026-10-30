<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';

import { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';
import { severityDifficulty } from '@/item/data/Injuries';
import { EquipmentState } from '@/item/data/EquipmentState';

import Localized from '@/vue/components/Localized.vue';
import Enriched from '@/vue/components/Enriched.vue';
import DescriptionToggle from '@/vue/components/DescriptionToggle.vue';
import CriticalInjuryList from '@/vue/components/CriticalInjuryList.vue';
import QualityList from '@/vue/components/QualityList.vue';
import { useOpenRows } from '@/vue/useOpenRows';

import { rollForCrew } from '@/operations/CrewRoll';
import { attackWithVehicleWeapon } from '@/operations/ItemActions';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { damageFormula, firingArcLabels, RANGE_LABELS } from '@/item/Weapons';

const { document: actor } = useSheetDocument<GenesysActor<'vehicle'>>();

const weapons = computed(() => itemsOfType(actor.value, 'vehicleWeapon').filter((i) => i.system.state === EquipmentState.Equipped));
const criticalHits = computed(() => itemsOfType(actor.value, 'injury'));
const openWeapons = useOpenRows();

async function repairHit(criticalHit: GenesysItem<'injury'>) {
	await rollForCrew(crewForSkills(actor.value.system.crew, [CONFIG.genesys.settings.skillForRepairingHit]), {
		difficulty: severityDifficulty(criticalHit.system.severity),
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
					<img :src="weapon.img ?? undefined" :alt="weapon.name" />

					<div class="name">
						<a @click="attackWithVehicleWeapon(actor, weapon)">{{ weapon.name }}</a>
						<DescriptionToggle
							:description="weapon.system.description"
							:open="openWeapons.isOpen(weapon.id)"
							@toggle="openWeapons.toggle(weapon.id)"
						/>
					</div>

					<div class="skill" v-if="weapon.system.skills.length > 0">
						{{ weapon.system.skills.join(', ') }}
					</div>
					<div class="skill" v-else><Localized label="Genesys.Labels.SkillNotFound" /></div>

					<div class="damage">{{ damageFormula(weapon.system).baseDamage }}</div>

					<div class="crit">{{ weapon.system.critical }}</div>

					<div class="range"><Localized :label="RANGE_LABELS[weapon.system.range]" /></div>

					<div class="firing-arc">
						<span v-for="label in firingArcLabels(weapon.system.firingArc)" :key="label"><Localized :label="label" /></span>
					</div>

					<QualityList :qualities="weapon.system.qualities" tags class="qualities" />

					<div :class="['description', { active: openWeapons.isOpen(weapon.id) }]">
						<Enriched :value="weapon.system.description" />
					</div>
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
	}
}
</style>
