<script lang="ts" setup>
import { computed, inject, toRaw } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';
import { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import Localized from '@/vue/components/Localized.vue';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { GenesysItem } from '@/item/GenesysItem';
import Talent from '@/vue/components/character/Talent.vue';
import { AbilityDataModel } from '@/item/data/AbilityDataModel';
import { advance, advancementCharacter, buyTalentRank, isAllowed } from '@/actor/data/character/Advancement';
import { tierLimit } from '@/actor/data/character/TalentPyramid';
import { TIERS } from '@/item/data/Talents';
import { heldNonSkillsGrantedBy } from '@/actor/data/character/Archetype';
import { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';

const context = inject<ActorSheetContext<CharacterDataModel>>(RootContext)!;

const activeAbilities = computed(
	() =>
		toRaw(context.data.actor)
			.items.filter((i) => i.type === 'ability' && (i.system as AbilityDataModel).activation.type === 'active')
			.sort((a, b) => {
				return a.name.localeCompare(b.name);
			}) as GenesysItem<AbilityDataModel>[],
);
const activeAbilityTypes = computed(() =>
	Array.from(new Set(activeAbilities.value.map((t) => t.systemData.activation.detail.toLowerCase()))).filter((t) => t !== ''),
);
const passiveAbilities = computed(
	() =>
		toRaw(context.data.actor)
			.items.filter((i) => i.type === 'ability' && (i.system as AbilityDataModel).activation.type === 'passive')
			.sort((a, b) => {
				return a.name.localeCompare(b.name);
			}) as GenesysItem<AbilityDataModel>[],
);
// The ids of the items the Archetype granted, which only go away with it.
const grantedItemIds = computed(() => {
	const actor = toRaw(context.data.actor);
	const archetype = actor.items.find((i) => i.type === 'archetype') as GenesysItem<ArchetypeDataModel> | undefined;
	return new Set(
		archetype ? heldNonSkillsGrantedBy(actor.items.contents, archetype.systemData.grantedItems, actor.id).map((i) => i.id) : [],
	);
});

const allTalents = computed(() => toRaw(context.data.actor).items.filter((i) => i.type === 'talent') as GenesysItem<TalentDataModel>[]);
const activeTalents = computed(() => {
	return allTalents.value
		.filter((i) => i.systemData.activation.type === 'active')
		.sort((a, b) => {
			const tierA = a.systemData.effectiveTier;
			const tierB = b.systemData.effectiveTier;
			if (tierA !== tierB) return tierA - tierB;
			return a.name.localeCompare(b.name);
		});
});
const activeTalentTypes = computed(() =>
	Array.from(
		new Set(
			activeTalents.value
				.filter((t) => t.systemData.activation.detail.trim() !== '')
				.map((t) => t.systemData.activation.detail.toLowerCase()),
		),
	),
);
const passiveTalents = computed(() => {
	return allTalents.value
		.filter((i) => i.systemData.activation.type === 'passive')
		.sort((a, b) => {
			const tierA = a.systemData.effectiveTier;
			const tierB = b.systemData.effectiveTier;
			if (tierA !== tierB) return tierA - tierB;
			return a.name.localeCompare(b.name);
		});
});
// Under the Ignore Talent Pyramid house rule a talent's tier only sets its cost, so the pyramid's limits mean nothing.
const SHOW_PYRAMID_SUMMARY = !CONFIG.genesys.settings.ignoreTalentPyramid;
const talentTotals = computed(() => toRaw(context.data.actor).systemData.talentPyramidTotals);

function tierLimitText(tier: number) {
	const limit = tierLimit(talentTotals.value, tier);
	return limit === Infinity ? '∞' : limit;
}

const advancement = computed(() => advancementCharacter(toRaw(context.data.actor)));

function canUpgradeTalent(talent: GenesysItem<TalentDataModel>) {
	return isAllowed(buyTalentRank(advancement.value, talent.id));
}

async function upgradeTalent(talent: GenesysItem<TalentDataModel>) {
	await advance(toRaw(context.data.actor), (character) => buyTalentRank(character, talent.id));
}

async function openItem(item: GenesysItem) {
	await toRaw(item).sheet?.render(true);
}
</script>

<template>
	<section class="tab-talents">
		<div v-if="SHOW_PYRAMID_SUMMARY" class="pyramid">
			<div v-for="tier in TIERS" :key="tier">
				<Localized label="Genesys.Labels.TierCount" :format-args="{ tier }" />: {{ talentTotals[tier] }}/{{ tierLimitText(tier) }}
			</div>
		</div>

		<div class="block">
			<div class="header"><Localized label="Genesys.Labels.SpecialAbilities" /></div>
			<div class="talents-container">
				<!-- Active Abilities -->
				<div v-if="activeAbilities.length > 0" class="category-header"><Localized label="Genesys.Labels.Active" /></div>
				<Talent
					v-for="ability in activeAbilities.filter((t) => t.systemData.activation.detail === '')"
					:key="ability.id"
					:item="ability"
					@open="openItem(ability)"
					:can-delete="!grantedItemIds.has(ability.id)"
					@delete="ability.delete()"
				/>

				<!-- Active Abilities w/Description -->
				<template v-for="activeType in activeAbilityTypes" :key="activeType">
					<div class="sub-category-header">{{ activeType }}</div>
					<Talent
						v-for="ability in activeAbilities.filter((t) => t.systemData.activation.detail.toLowerCase() === activeType)"
						:key="ability.id"
						:item="ability"
						@open="openItem(ability)"
						:can-delete="!grantedItemIds.has(ability.id)"
						@delete="ability.delete()"
					/>
				</template>

				<!-- Passive Abilities -->
				<div v-if="passiveAbilities.length > 0" class="category-header"><Localized label="Genesys.Labels.Passive" /></div>
				<Talent
					v-for="ability in passiveAbilities"
					:key="ability.id"
					:item="ability"
					@open="openItem(ability)"
					:can-delete="!grantedItemIds.has(ability.id)"
					@delete="ability.delete()"
				/>
			</div>

			<div class="header"><Localized label="Genesys.Labels.Talents" /></div>
			<div class="talents-container">
				<!-- Active Talents -->
				<div v-if="activeTalents.length > 0" class="category-header"><Localized label="Genesys.Labels.Active" /></div>
				<Talent
					v-for="talent in activeTalents.filter((t) => t.systemData.activation.detail === '')"
					:key="talent.id"
					:item="talent"
					:can-upgrade="canUpgradeTalent(talent)"
					@upgrade="upgradeTalent(talent)"
					@open="openItem(talent)"
				/>

				<!-- Active Talents w/Description -->
				<template v-for="activeType in activeTalentTypes" :key="activeType">
					<div class="sub-category-header">{{ activeType }}</div>
					<Talent
						v-for="talent in activeTalents.filter((t) => t.systemData.activation.detail.toLowerCase() === activeType)"
						:key="talent.id"
						:item="talent"
						:can-upgrade="canUpgradeTalent(talent)"
						@upgrade="upgradeTalent(talent)"
						@open="openItem(talent)"
					/>
				</template>

				<!-- Passive Talents -->
				<div v-if="passiveTalents.length > 0" class="category-header"><Localized label="Genesys.Labels.Passive" /></div>
				<Talent
					v-for="talent in passiveTalents"
					:key="talent.id"
					:item="talent"
					:can-upgrade="canUpgradeTalent(talent)"
					@upgrade="upgradeTalent(talent)"
					@open="openItem(talent)"
				/>
			</div>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.tab-talents {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	padding: 0.5em;

	.block {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		background: colors.alpha(colors.$light-blue, 0.2);
		border-bottom-left-radius: 1em;
		border-bottom-right-radius: 1em;
		padding: 0.5em 0.5em 1em 0.5em;
		gap: 0.25em;

		// Without the pyramid above it, the block is the top of the tab.
		&:first-child {
			border-top-left-radius: 1em;
			border-top-right-radius: 1em;
		}

		.header {
			font-family: 'Bebas Neue', sans-serif;
			font-size: 1.25em;
			margin-top: 0.5em;
			margin-bottom: -0.4em;

			&:first-of-type {
				margin-top: 0;
			}
		}
	}

	.talents-container {
		border: 1px solid colors.$blue;
		border-top: none;

		.category-header,
		.sub-category-header {
			font-family: 'Bebas Neue', sans-serif;
			color: white;
			padding-left: 0.25em;
			padding-top: 1px;
		}

		.category-header {
			background: colors.$blue;
			font-size: 1.1em;
		}

		.sub-category-header {
			border-top: 1px solid colors.$blue;
			background: colors.alpha(colors.$blue, 0.5);
			font-size: 1em;
		}

		&:empty {
			border: 1px dashed black;
			opacity: 0.25;
			height: 1em;
		}
	}

	.pyramid {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.5em;
		align-items: center;
		justify-content: right;
		border-top-left-radius: 1em;
		border-top-right-radius: 1em;
		background: colors.alpha(colors.$light-blue, 0.2);
		font-family: 'Bebas Neue', sans-serif;
		padding-right: 1em;
		padding-top: 0.25em;
	}
}
</style>
