<script lang="ts" setup>
import { computed } from 'vue';
import type { Stored } from '@/data/Stored';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Localized from '@/vue/components/Localized.vue';
import { GenesysItem } from '@/item/GenesysItem';
import Talent from '@/vue/components/character/Talent.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';
import { advance, advancementCharacter, buyTalentRank, isAllowed } from '@/actor/data/character/Advancement';
import { tierLimit } from '@/actor/data/character/TalentPyramid';
import { talentGroups, TIERS } from '@/item/data/Talents';
import { heldNonSkillsGrantedBy } from '@/actor/data/character/Archetype';
import { itemsOfType } from '@/item/ItemTypes';

const { document: actor } = useSheetDocument<GenesysActor<'character'>>();

const abilityItems = computed(() => itemsOfType(actor.value, 'ability'));
const abilities = computed(() => talentGroups(abilityItems.value, game.i18n.lang));
// The ids of the items the Archetype granted, which only go away with it.
const grantedItemIds = computed(() => {
	const character = actor.value;
	const [archetype] = itemsOfType(character, 'archetype');
	return new Set(
		archetype ? heldNonSkillsGrantedBy(character.items.contents, archetype.system.grantedItems, character.id).map((i) => i.id) : [],
	);
});

const talentItems = computed(() => itemsOfType(actor.value, 'talent'));
const talents = computed(() => talentGroups(talentItems.value, game.i18n.lang));
// Under the Ignore Talent Pyramid house rule a talent's tier only sets its cost, so the pyramid's limits mean nothing.
const SHOW_PYRAMID_SUMMARY = !CONFIG.genesys.settings.ignoreTalentPyramid;
const talentTotals = computed(() => actor.value.system.talentPyramidTotals);

function tierLimitText(tier: number) {
	const limit = tierLimit(talentTotals.value, tier);
	return limit === Infinity ? '∞' : limit;
}

const advancement = computed(() => advancementCharacter(actor.value));

function canUpgradeTalent(talent: Stored<GenesysItem<'talent'>>) {
	return isAllowed(buyTalentRank(advancement.value, talent.id));
}

async function upgradeTalent(talent: Stored<GenesysItem<'talent'>>) {
	await advance(actor.value, (character) => buyTalentRank(character, talent.id));
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
			<h3><Localized label="Genesys.Labels.SpecialAbilities" /></h3>
			<div v-if="abilityItems.length > 0" class="talents-container">
				<h4 v-if="abilities.active.length + abilities.activeByDetail.length > 0" class="bar">
					<Localized label="Genesys.Labels.Active" />
				</h4>
				<Talent
					v-for="ability in abilities.active"
					:key="ability.id"
					:item="ability"
					:can-delete="!grantedItemIds.has(ability.id)"
				/>

				<template v-for="group in abilities.activeByDetail" :key="group.detail">
					<h5 class="bar">{{ group.detail }}</h5>
					<Talent
						v-for="ability in group.talents"
						:key="ability.id"
						:item="ability"
						:can-delete="!grantedItemIds.has(ability.id)"
					/>
				</template>

				<h4 v-if="abilities.passive.length > 0" class="bar"><Localized label="Genesys.Labels.Passive" /></h4>
				<Talent
					v-for="ability in abilities.passive"
					:key="ability.id"
					:item="ability"
					:can-delete="!grantedItemIds.has(ability.id)"
				/>
			</div>
			<ListEmpty v-else />

			<h3><Localized label="Genesys.Labels.Talents" /></h3>
			<div v-if="talentItems.length > 0" class="talents-container">
				<h4 v-if="talents.active.length + talents.activeByDetail.length > 0" class="bar">
					<Localized label="Genesys.Labels.Active" />
				</h4>
				<Talent
					v-for="talent in talents.active"
					:key="talent.id"
					:item="talent"
					:can-upgrade="canUpgradeTalent(talent)"
					@upgrade="upgradeTalent(talent)"
				/>

				<template v-for="group in talents.activeByDetail" :key="group.detail">
					<h5 class="bar">{{ group.detail }}</h5>
					<Talent
						v-for="talent in group.talents"
						:key="talent.id"
						:item="talent"
						:can-upgrade="canUpgradeTalent(talent)"
						@upgrade="upgradeTalent(talent)"
					/>
				</template>

				<h4 v-if="talents.passive.length > 0" class="bar"><Localized label="Genesys.Labels.Passive" /></h4>
				<Talent
					v-for="talent in talents.passive"
					:key="talent.id"
					:item="talent"
					:can-upgrade="canUpgradeTalent(talent)"
					@upgrade="upgradeTalent(talent)"
				/>
			</div>
			<ListEmpty v-else />
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
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

		// The Talents section starts apart from the Special Abilities above it.
		& > h3:not(:first-child) {
			margin-top: 0.5em;
		}
	}

	// The talents of a section, its groups' headings among them, in a frame.
	.talents-container {
		border: 1px solid colors.$blue;

		// The groups' headings are bars across the frame, which the table scans the tab by (#623): an activation's on the
		// blue, an activation detail's on a lighter one. White text keeps 4.5:1 on the blue in every Style, but not on the
		// lighter bar, which takes the ink. The lighter bar is opaque, so that its contrast doesn't hang on what lies under it.
		.bar {
			padding: 1px 0.25em 0;

			&:is(h4) {
				background: colors.$blue;
				color: colors.$text-on-dark;
			}

			&:is(h5) {
				border-top: 1px solid colors.$blue;
				background: color-mix(in srgb, colors.$blue 50%, colors.$paper);
				color: colors.$ink;
			}
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
		@include headings.font;
		padding-right: 1em;
		padding-top: 0.25em;
	}
}
</style>
