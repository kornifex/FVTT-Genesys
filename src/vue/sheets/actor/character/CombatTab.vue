<script lang="ts" setup>
import { computed, inject, toRaw } from 'vue';
import { EquipmentDataModel, EquipmentState } from '@/item/data/EquipmentDataModel';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import Localized from '@/vue/components/Localized.vue';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { ArmorDataModel } from '@/item/data/ArmorDataModel';
import Enriched from '@/vue/components/Enriched.vue';
import { InjuryDataModel } from '@/item/data/InjuryDataModel';
import { severityDifficulty } from '@/item/data/Injuries';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { DicePrompt, RollType } from '@/app/DicePrompt';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';
import Tooltip from '@/vue/components/Tooltip.vue';
import { skillToRoll, weaponSkillName } from '@/data/Skills';

const rootContext = inject<ActorSheetContext<CharacterDataModel>>(RootContext)!;

const actor = computed(() => toRaw(rootContext.data.actor));

const weapons = computed(
	() =>
		toRaw(rootContext.data.actor).items.filter(
			(i) => i.type === 'weapon' && (i.system as EquipmentDataModel).state === EquipmentState.Equipped,
		) as GenesysItem<WeaponDataModel>[],
);
const armors = computed(
	() =>
		toRaw(rootContext.data.actor).items.filter(
			(i) => i.type === 'armor' && (i.system as EquipmentDataModel).state === EquipmentState.Equipped,
		) as GenesysItem<ArmorDataModel>[],
);
const injuries = computed(() => toRaw(rootContext.data.actor).items.filter((i) => i.type === 'injury') as GenesysItem<InjuryDataModel>[]);

async function openItem(item: GenesysItem) {
	await item.sheet?.render(true);
}

async function deleteItem(item: GenesysItem) {
	await item.delete();
}

async function rollAttack(weapon: GenesysItem<WeaponDataModel>) {
	const skillName = weaponSkillName(actor.value.skills, weapon.systemData.skills);
	if (!skillName) {
		return;
	}

	await DicePrompt.promptForRoll(actor.value, skillName, {
		rollType: RollType.Attack,
		rollData: {
			weapon,
		},
	});
}

async function healInjury(injury: GenesysItem<InjuryDataModel>) {
	await DicePrompt.promptForRoll(toRaw(rootContext.data.actor), CONFIG.genesys.settings.skillForHealingInjury, {
		difficulty: severityDifficulty(injury.systemData.severity),
	});
}

/**
 * The skill the character rolls the weapon with, and its rank: none for an Unranked Skill Check.
 */
function skillForWeapon(weapon: GenesysItem<WeaponDataModel>): { skill: GenesysItem<SkillDataModel>; rank: number } | undefined {
	const skillName = weaponSkillName(actor.value.skills, weapon.systemData.skills);
	const rolledSkill = skillName ? skillToRoll(actor.value.skills, CONFIG.genesys.skills, skillName) : undefined;

	return rolledSkill && { skill: rolledSkill.skill, rank: rolledSkill.unranked ? 0 : rolledSkill.skill.systemData.rank };
}

function damageForWeapon(weapon: GenesysItem<WeaponDataModel>) {
	if (weapon.systemData.damageCharacteristic === '-') {
		return weapon.systemData.baseDamage;
	}

	return weapon.systemData.baseDamage + rootContext.data.actor.systemData.characteristics[weapon.systemData.damageCharacteristic];
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
				</div>

				<div v-for="weapon in weapons" :key="weapon.id" class="weapon">
					<img :src="weapon.img" :alt="weapon.name" />
					<div class="name">
						<a v-if="weapon.systemData.skills.length > 0" @click="rollAttack(weapon)">{{ weapon.name }}</a>
						<span v-else>{{ weapon.name }}</span>
					</div>
					<div class="skill" v-for="weaponSkill in [skillForWeapon(weapon)]" :key="weaponSkill?.skill.id ?? 'skill'">
						<template v-if="weaponSkill">
							{{ weaponSkill.skill.name }}
							<SkillRanks
								:skill-value="weaponSkill.rank"
								:characteristic-value="actor.systemData.characteristics[weaponSkill.skill.systemData.characteristic]"
							/>
						</template>
						<span v-else><Localized label="Genesys.Labels.SkillNotFound" /></span>
					</div>
					<div class="damage">{{ damageForWeapon(weapon) }}</div>
					<div class="crit">{{ weapon.systemData.critical }}</div>
					<div class="range"><Localized :label="`Genesys.Range.${weapon.systemData.range.capitalize()}`" /></div>
					<div v-if="weapon.systemData.qualities.length > 0" class="qualities">
						<Tooltip v-for="quality in weapon.systemData.qualities" :key="quality.name" :content="quality.description">
							<div class="quality">
								{{ quality.name }} <template v-if="quality.isRated">{{ quality.rating }}</template>
							</div>
						</Tooltip>
					</div>
				</div>
			</div>
		</div>

		<div class="block">
			<div class="header"><Localized label="Genesys.Labels.Armor" /></div>
			<div class="armors">
				<div class="armor header">
					<div class="name"><Localized label="Genesys.Labels.Name" /></div>
					<div class="soak"><Localized label="Genesys.Labels.Soak" /></div>
					<div class="defense"><Localized label="Genesys.Labels.Defense" /></div>
				</div>

				<div v-for="armor in armors" :key="armor.id" class="armor">
					<img :src="armor.img" :alt="armor.name" />
					<div class="name">
						<a @click="openItem(armor)">{{ armor.name }}</a>
					</div>
					<div class="soak">{{ armor.systemData.soak }}</div>
					<div class="defense">{{ armor.systemData.defense }}</div>
					<div v-if="armor.systemData.qualities.length > 0" class="qualities">
						<Tooltip v-for="quality in armor.systemData.qualities" :key="quality.name" :content="quality.description">
							<div class="quality">
								{{ quality.name }} <template v-if="quality.isRated">{{ quality.rating }}</template>
							</div>
						</Tooltip>
					</div>
					<div class="description"><Enriched :value="armor.systemData.description" /></div>
				</div>
			</div>
		</div>

		<div class="block">
			<div class="header"><Localized label="Genesys.Labels.CriticalInjuries" /></div>
			<div class="critical-injuries">
				<div class="injury header">
					<div><Localized label="Genesys.Labels.Severity" /></div>
					<div><Localized label="Genesys.Labels.Injury" /></div>
				</div>

				<div v-for="injury in injuries" :key="injury.id" class="injury">
					<div class="severity">
						<a @click="healInjury(injury)">{{ severityDifficulty(injury.systemData.severity) }}</a>
					</div>
					<div class="name">
						<a @click="openItem(injury)">{{ injury.name }}</a>
					</div>
					<div v-if="rootContext.data.editable" class="actions">
						<a @click="openItem(injury)"><i class="fas fa-edit"></i></a>
						<a @click="deleteItem(injury)"><i class="fas fa-trash"></i></a>
					</div>
					<div v-else />
					<div class="description"><Enriched :value="injury.systemData.description" /></div>
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

	.armor,
	.weapon {
		display: grid;
		grid-template-rows: auto auto;
		border-bottom: 1px dashed colors.$blue;
		align-items: center;
		justify-items: center;

		& > .header {
			grid-template-rows: auto;
		}

		.name {
			justify-self: left;
		}

		&:not(.header) > .name {
			font-family: 'Roboto Serif', serif;
		}

		&.header > .name {
			grid-column: 1 / span 2;
		}

		&:last-child {
			border-bottom: none;
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
	}

	.armor {
		grid-template-columns: 1.5rem 1fr repeat(2, 60px);
		grid-template-rows: repeat(3, auto);

		.qualities {
			grid-row: 2 / span 1;
			grid-column: 1 / span all;
		}

		.description {
			grid-row: 3 / span 1;
			grid-column: 1 / span all;
		}
	}

	.weapon {
		grid-template-columns: 1.5rem 2fr 1fr repeat(3, 80px);

		&:not(.header) {
			grid-template-rows: auto auto;
		}

		.qualities {
			grid-column: 1 / span all;
			grid-row: 2 / span 1;
		}
	}

	.qualities {
		justify-self: left;
		padding-left: 1em;

		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.25em;

		.quality {
			background: colors.alpha(colors.$gold, 0.3);
			border: 1px dashed colors.$gold;
			border-radius: 0.25em;
			padding: 0.25em;
			font-family: 'Bebas Neue', sans-serif;
		}
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

		.critical-injuries {
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

			.injury {
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
