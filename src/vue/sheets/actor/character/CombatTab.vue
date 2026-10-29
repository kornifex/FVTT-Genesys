<script lang="ts" setup>
import { computed } from 'vue';
import { EquipmentState } from '@/item/data/EquipmentState';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { wornArmor } from '@/actor/data/Inventory';
import { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';
import Localized from '@/vue/components/Localized.vue';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import Enriched from '@/vue/components/Enriched.vue';
import { InjuryDataModel } from '@/item/data/InjuryDataModel';
import { severityDifficulty } from '@/item/data/Injuries';
import CriticalInjuryList from '@/vue/components/CriticalInjuryList.vue';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { DicePrompt } from '@/app/DicePrompt';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';
import QualityList from '@/vue/components/QualityList.vue';
import AttackSkillSelect from '@/vue/components/AttackSkillSelect.vue';
import { attackSkillChoices, skillToRoll } from '@/data/Skills';
import { attackSkill, attackWith, openSheet } from '@/operations/ItemActions';
import { RANGE_LABELS, weaponDamage } from '@/item/Weapons';

const { document: actor } = useSheetDocument<GenesysActor<CharacterDataModel>>();

const weapons = computed(() => itemsOfType(actor.value, 'weapon').filter((i) => i.systemData.state === EquipmentState.Equipped));
const armors = computed(() => wornArmor(itemsOfType(actor.value, 'armor')));
const injuries = computed(() => itemsOfType(actor.value, 'injury'));

async function healInjury(injury: GenesysItem<InjuryDataModel>) {
	await DicePrompt.promptForRoll(actor.value, CONFIG.genesys.settings.skillForHealingInjury, {
		difficulty: severityDifficulty(injury.systemData.severity),
	});
}

/**
 * The Attack Skill the character rolls the weapon with, and the skill and its rank when the character or the Skills
 * Compendium has it: a rank of 0 for an Unranked Skill Check. Undefined when the weapon lists no skill.
 */
function skillForWeapon(
	weapon: GenesysItem<WeaponDataModel>,
): { name: string; skill?: GenesysItem<SkillDataModel>; rank: number } | undefined {
	const skillName = attackSkill(actor.value, weapon);
	if (!skillName) {
		return undefined;
	}

	const rolledSkill = skillToRoll(actor.value.skills, CONFIG.genesys.skills, skillName);
	return {
		name: rolledSkill?.skill.name ?? skillName,
		skill: rolledSkill?.skill,
		rank: rolledSkill && !rolledSkill.unranked ? rolledSkill.skill.systemData.rank : 0,
	};
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
						<a v-if="weapon.systemData.skills.length > 0" @click="attackWith(actor, weapon)">{{ weapon.name }}</a>
						<span v-else>{{ weapon.name }}</span>
					</div>
					<div class="skill" v-for="weaponSkill in [skillForWeapon(weapon)]" :key="weaponSkill?.name ?? 'skill'">
						<template v-if="weaponSkill">
							<!-- A choice the character can't roll stays changeable here. -->
							<AttackSkillSelect
								:weapon="weapon"
								:choices="attackSkillChoices(weapon.systemData.skills)"
								:attack-skill="weaponSkill.name"
							/>
							<SkillRanks
								v-if="weaponSkill.skill"
								:skill-value="weaponSkill.rank"
								:characteristic-value="actor.systemData.characteristics[weaponSkill.skill.systemData.characteristic]"
							/>
							<span v-else><Localized label="Genesys.Labels.SkillNotFound" /></span>
						</template>
						<span v-else><Localized label="Genesys.Labels.SkillNotFound" /></span>
					</div>
					<div class="damage">{{ weaponDamage(weapon.systemData, actor.systemData.characteristics) }}</div>
					<div class="crit">{{ weapon.systemData.critical }}</div>
					<div class="range"><Localized :label="RANGE_LABELS[weapon.systemData.range]" /></div>
					<QualityList :qualities="weapon.systemData.qualities" tags class="qualities" />
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
						<a @click="openSheet(armor)">{{ armor.name }}</a>
					</div>
					<div class="soak">{{ armor.systemData.soak }}</div>
					<div class="defense">{{ armor.systemData.defense }}</div>
					<QualityList :qualities="armor.systemData.qualities" tags class="qualities" />
					<div class="description"><Enriched :value="armor.systemData.description" /></div>
				</div>
			</div>
		</div>

		<div class="block">
			<div class="header"><Localized label="Genesys.Labels.CriticalInjuries" /></div>
			<CriticalInjuryList kind="injury" :injuries="injuries" @roll="healInjury" />
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/combat-tab.scss';

.tab-combat {
	@include combat-tab.tab;

	.armor,
	.weapon {
		@include combat-tab.item-row;
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

		.qualities {
			grid-column: 1 / span all;
			grid-row: 2 / span 1;
		}
	}
}
</style>
