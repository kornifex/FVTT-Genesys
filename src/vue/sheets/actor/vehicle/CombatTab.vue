<script lang="ts" setup>
import { computed, inject, toRaw } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';

import { GenesysItem } from '@/item/GenesysItem';
import { InjuryDataModel } from '@/item/data/InjuryDataModel';
import { severityDifficulty } from '@/item/data/Injuries';
import { RollType } from '@/app/DicePrompt';
import { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { EquipmentState } from '@/item/data/EquipmentState';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';

import Localized from '@/vue/components/Localized.vue';
import Enriched from '@/vue/components/Enriched.vue';
import QualityList from '@/vue/components/QualityList.vue';

import { rollForCrew } from '@/operations/CrewRoll';
import { crewForSkills } from '@/actor/data/CrewRoster';
import { damageFormula, firingArcLabels } from '@/item/Weapons';

const rootContext = inject<ActorSheetContext<VehicleDataModel>>(RootContext)!;

const actor = computed(() => toRaw(rootContext.data.actor));
const weapons = computed(
	() =>
		toRaw(rootContext.data.actor).items.filter(
			(i) => i.type === 'vehicleWeapon' && (i.system as EquipmentDataModel).state === EquipmentState.Equipped,
		) as GenesysItem<VehicleWeaponDataModel>[],
);
const criticalHits = computed(
	() => toRaw(rootContext.data.actor).items.filter((i) => i.type === 'injury') as GenesysItem<InjuryDataModel>[],
);

async function openItem(item: GenesysItem) {
	await item.sheet?.render(true);
}

async function deleteItem(item: GenesysItem) {
	await item.delete();
}

async function rollAttack(weapon: GenesysItem<VehicleWeaponDataModel>) {
	await rollForCrew(crewForSkills(actor.value.systemData.crew, weapon.systemData.skills), {
		rollType: RollType.Attack,
		rollData: { weapon },
	});
}

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
						<a @click="rollAttack(weapon)">{{ weapon.name }}</a>
					</div>

					<div class="skill" v-if="weapon.systemData.skills.length > 0">
						{{ weapon.systemData.skills.join(', ') }}
					</div>
					<div class="skill" v-else><Localized label="Genesys.Labels.SkillNotFound" /></div>

					<div class="damage">{{ damageFormula(weapon.systemData).baseDamage }}</div>

					<div class="crit">{{ weapon.systemData.critical }}</div>

					<div class="range"><Localized :label="`Genesys.Range.${weapon.systemData.range.capitalize()}`" /></div>

					<div class="firing-arc">
						<span v-for="label in firingArcLabels(weapon.systemData.firingArc)" :key="label"><Localized :label="label" /></span>
					</div>

					<QualityList :qualities="weapon.systemData.qualities" tags class="qualities" />
				</div>
			</div>
		</div>

		<div class="block">
			<div class="header"><Localized label="Genesys.Labels.CriticalHits" /></div>
			<div class="critical-hits">
				<div class="critical-hit header">
					<div><Localized label="Genesys.Labels.Severity" /></div>
					<div><Localized label="Genesys.Labels.Hit" /></div>
				</div>

				<div v-for="criticalHit in criticalHits" :key="criticalHit.id" class="critical-hit">
					<div class="severity">
						<a @click="repairHit(criticalHit)">{{ severityDifficulty(criticalHit.systemData.severity) }}</a>
					</div>
					<div class="name">
						<a @click="openItem(criticalHit)">{{ criticalHit.name }}</a>
					</div>
					<div v-if="rootContext.data.editable" class="actions">
						<a @click="openItem(criticalHit)"><i class="fas fa-edit"></i></a>
						<a @click="deleteItem(criticalHit)"><i class="fas fa-trash"></i></a>
					</div>
					<div v-else />
					<div class="description"><Enriched :value="criticalHit.systemData.description" /></div>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.tab-combat {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	gap: 0.5em;
	padding: 0.5em;

	.weapon {
		display: grid;
		grid-template-rows: auto auto;
		grid-template-columns: 1.5rem 2fr 1fr repeat(4, 80px);
		border-bottom: 1px dashed colors.$blue;
		align-items: center;
		justify-items: center;

		& > .header {
			grid-template-rows: auto;
		}

		.name {
			justify-self: left;
		}

		&:not(.header) {
			grid-template-rows: auto auto;

			& > .name {
				font-family: 'Roboto Serif', serif;
			}
		}

		&.header > .name {
			grid-column: 1 / span 2;
		}

		&:last-child {
			border-bottom: none;
		}

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

		.description {
			grid-column: 1 / span all;
			justify-self: left;
			border-left: 4px solid colors.$light-blue;
			margin-left: 0.5em;
			padding-left: 0.5em;

			grid-row: 2 / span 1;
			max-height: 0;
			transition: max-height 0.5s ease-in-out;
			overflow: hidden;
			padding-right: 0.5em;

			&.active {
				max-height: 200px;
			}
		}

		.qualities {
			grid-column: 1 / span all;
			grid-row: 2 / span 1;
		}
	}

	.qualities {
		justify-self: left;
		padding-left: 1em;
	}

	.skill {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		white-space: nowrap;
		gap: 0.25em;
	}

	.block {
		background: colors.alpha(colors.$light-blue, 0.2);
		padding: 0.5em;
		border-radius: 0.5em;

		.header {
			font-family: 'Bebas Neue', sans-serif;
		}

		& > .header {
			font-size: 1.25em;
		}

		img {
			border: none;
			padding: 2px;
			border-radius: 0.25rem;
		}

		.critical-hits {
			display: flex;
			flex-direction: column;
			flex-wrap: nowrap;
			padding: 0.25em;

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

			.critical-hit {
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
					grid-column: 1 / span all;
					justify-self: left;
					border-left: 4px solid colors.$light-blue;
					margin-left: 1em;
					padding-left: 0.5em;

					grid-row: 2 / span 1;
					max-height: 0;
					transition: max-height 0.5s ease-in-out;
					overflow: hidden;
					padding-right: 0.5em;

					&.active {
						max-height: 200px;
					}
				}
			}
		}
	}

	.actions {
		display: flex;
		gap: 0.25em;
	}
}
</style>
