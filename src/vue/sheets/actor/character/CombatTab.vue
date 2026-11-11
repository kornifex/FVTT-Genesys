<script lang="ts" setup>
import { computed } from 'vue';
import { EquipmentState } from '@/item/data/EquipmentState';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import { wornArmor } from '@/actor/data/Inventory';
import { GenesysItem } from '@/item/GenesysItem';
import { itemsOfType } from '@/item/ItemTypes';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';
import { severityDifficulty } from '@/item/data/Injuries';
import CriticalInjuryList from '@/vue/components/CriticalInjuryList.vue';
import { DicePrompt } from '@/app/DicePrompt';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';
import QualityList from '@/vue/components/QualityList.vue';
import RollLink from '@/vue/components/RollLink.vue';
import AttackSkillSelect from '@/vue/components/AttackSkillSelect.vue';
import { attackSkillChoices, skillToRoll } from '@/data/Skills';
import { attackSkill, attackWith, openSheet } from '@/operations/ItemActions';
import WeaponProfileStats from '@/vue/components/WeaponProfileStats.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';
import { profileRowName, type WeaponProfile, weaponProfiles } from '@/item/WeaponProfiles';
import { aim, takeGuardedStance } from '@/effects/maneuverEffects';

const { document: actor, editable } = useSheetDocument<GenesysActor<'character'>>();

// A row for each Weapon Profile of each equipped weapon, its main profile first: each shows the weapon's description, and
// opens it on its own.
const weaponRows = computed(() =>
	itemsOfType(actor.value, 'weapon')
		.filter((i) => i.system.state === EquipmentState.Equipped)
		.flatMap((weapon) =>
			weaponProfiles(weapon.system).map((profile) => ({
				key: `${weapon.id}-${profile.index}`,
				weapon,
				profile,
				name: profileRowName(weapon.name, profile, game.i18n),
			})),
		),
);
const armors = computed(() => wornArmor(itemsOfType(actor.value, 'armor')));
const injuries = computed(() => itemsOfType(actor.value, 'injury'));

async function healInjury(injury: GenesysItem<'injury'>) {
	await DicePrompt.promptForRoll(actor.value, CONFIG.genesys.settings.skillForHealingInjury, {
		difficulty: severityDifficulty(injury.system.severity),
	});
}

/**
 * The Attack Skill the character rolls a Weapon Profile with, and the skill and its rank when the character or the
 * Skills Compendium has it: a rank of 0 for an Unranked Skill Check. Undefined when the profile lists no skill.
 */
function skillForProfile(profile: WeaponProfile): { name: string; skill?: GenesysItem<'skill'>; rank: number } | undefined {
	const skillName = attackSkill(actor.value, profile);
	if (!skillName) {
		return undefined;
	}

	const rolledSkill = skillToRoll(actor.value.skills, CONFIG.genesys.skills, skillName);
	return {
		name: rolledSkill?.skill.name ?? skillName,
		skill: rolledSkill?.skill,
		rank: rolledSkill && !rolledSkill.unranked ? rolledSkill.skill.system.rank : 0,
	};
}
</script>

<template>
	<section class="tab-combat">
		<div class="block">
			<h3><Localized label="Genesys.Labels.Attacks" /></h3>
			<div v-if="weaponRows.length > 0" class="weapons">
				<div class="weapon columns">
					<div class="name"><Localized label="Genesys.Labels.Name" /></div>
					<div class="skill"><Localized label="Genesys.Labels.Skill" /></div>
					<WeaponProfileStats layout="grid" labels />
				</div>

				<div v-for="{ key, weapon, profile, name } in weaponRows" :key="key" class="weapon">
					<ActionButton
						class="item-icon"
						:image="weapon.img ?? undefined"
						label="Genesys.Tooltips.OpenItem"
						@click="openSheet(weapon)"
					/>
					<DescriptionFold class="name" :description="weapon.system.description">
						<RollLink
							v-if="profile.skills.length > 0"
							label="Genesys.Tooltips.RollAttack"
							:label-data="{ weapon: name }"
							@roll="attackWith(actor, weapon, profile)"
							>{{ name }}</RollLink
						>
						<ActionButton v-else @click="openSheet(weapon)">{{ name }}</ActionButton>
					</DescriptionFold>
					<div class="skill" v-for="weaponSkill in [skillForProfile(profile)]" :key="weaponSkill?.name ?? 'skill'">
						<template v-if="weaponSkill">
							<!-- A choice the character can't roll stays changeable here. -->
							<AttackSkillSelect
								:weapon="weapon"
								:profile-index="profile.index"
								:choices="attackSkillChoices(profile.skills)"
								:attack-skill="weaponSkill.name"
							/>
							<SkillRanks
								v-if="weaponSkill.skill"
								:skill-value="weaponSkill.rank"
								:characteristic-value="actor.system.characteristics[weaponSkill.skill.system.characteristic]"
							/>
							<span v-else><Localized label="Genesys.Labels.SkillNotFound" /></span>
						</template>
						<span v-else><Localized label="Genesys.Labels.SkillNotFound" /></span>
					</div>
					<WeaponProfileStats layout="grid" :profile="profile" :characteristics="actor.system.characteristics" />
					<QualityList :qualities="profile.qualities" tags class="qualities" />
				</div>
			</div>
			<ListEmpty v-else />
		</div>

		<!-- The maneuvers that change the character's next combat checks, which only a user who can edit them performs. -->
		<div v-if="editable" class="block">
			<h3><Localized label="Genesys.Maneuvers.Title" /></h3>
			<div class="maneuvers">
				<ActionButton icon="fa-solid fa-crosshairs" label="Genesys.Maneuvers.Aim.Hint" edits @click="aim(actor)">
					<Localized label="Genesys.Maneuvers.Aim.Name" />
				</ActionButton>
				<ActionButton
					icon="fa-solid fa-shield-halved"
					label="Genesys.Maneuvers.GuardedStance.Hint"
					edits
					@click="takeGuardedStance(actor)"
				>
					<Localized label="Genesys.Maneuvers.GuardedStance.Name" />
				</ActionButton>
			</div>
		</div>

		<div class="block">
			<h3><Localized label="Genesys.Labels.Armor" /></h3>
			<div v-if="armors.length > 0" class="armors">
				<div class="armor columns">
					<div class="name"><Localized label="Genesys.Labels.Name" /></div>
					<div class="soak"><Localized label="Genesys.Labels.Soak" /></div>
					<div class="defense"><Localized label="Genesys.Labels.Defense" /></div>
				</div>

				<div v-for="armor in armors" :key="armor.id" class="armor">
					<ActionButton
						class="item-icon"
						:image="armor.img ?? undefined"
						label="Genesys.Tooltips.OpenItem"
						@click="openSheet(armor)"
					/>
					<DescriptionFold class="name" :description="armor.system.description">
						<ActionButton @click="openSheet(armor)">{{ armor.name }}</ActionButton>
					</DescriptionFold>
					<div class="soak">{{ armor.system.soak }}</div>
					<div class="defense">{{ armor.system.defense }}</div>
					<QualityList :qualities="armor.system.qualities" tags class="qualities" />
				</div>
			</div>
			<ListEmpty v-else />
		</div>

		<div class="block">
			<h3><Localized label="Genesys.Labels.CriticalInjuries" /></h3>
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
	}

	.weapon {
		grid-template-columns: 1.5rem 2fr 1fr repeat(3, 80px);
	}

	.maneuvers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5em;
	}
}
</style>
