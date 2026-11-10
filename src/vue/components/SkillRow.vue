<script lang="ts" setup>
import { CHARACTERISTIC_ABBREVIATIONS, type Characteristic } from '@/data/Characteristics';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import RollLink from '@/vue/components/RollLink.vue';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';

/**
 * The cells of a skill's row, as the character's Skills tab, an Adversary's skills and a vehicle's crew skills show
 * them: an icon that opens the skill's sheet (or, on a vehicle, the crew member's), a name that rolls the check, the
 * rank, with the button that buys one where an Advancement can, and the dice of the pool. The cells are the component's
 * roots, so that each list lays them out in its own row, which holds its menu.
 */
const props = withDefaults(
	defineProps<{
		/**
		 * What the name shows: the skill's name, or the crew member's who rolls it.
		 */
		name: string;

		/**
		 * The skill the check rolls, which the name's tooltip names.
		 */
		skill: string;

		/**
		 * The characteristic the skill uses, whose abbreviation follows the name.
		 */
		characteristic?: Characteristic;

		/**
		 * Whether the skill is a career skill, which a star marks.
		 */
		career?: boolean;

		/**
		 * The icon's image.
		 */
		image?: string | null;

		/**
		 * The localization key of the icon's name: the skill's sheet by default.
		 */
		openLabel?: string;

		/**
		 * Whether the icon opens a sheet: the user may not see a crew member, nor their skills. Otherwise it shows the
		 * image alone.
		 */
		canOpen?: boolean;

		/**
		 * The rank shown in a cell of its own. Left out where it shows elsewhere, as a Minion Group's group rank.
		 */
		rank?: number;

		/**
		 * Whether a rank can be bought with XP: its button then follows the rank.
		 */
		canBuyRank?: boolean;

		/**
		 * The rank the dice of the pool count: the skill's, or a Minion Group's group rank.
		 */
		skillValue: number;

		/**
		 * The rating of the characteristic the dice of the pool count.
		 */
		characteristicValue: number;
	}>(),
	{ career: false, openLabel: 'Genesys.Tooltips.OpenSkill', canOpen: true, canBuyRank: false },
);

const emit = defineEmits<{
	/**
	 * The name was clicked, to roll the check.
	 */
	(e: 'roll'): void;

	/**
	 * The icon was clicked, to open the skill's sheet or the crew member's.
	 */
	(e: 'open'): void;

	/**
	 * The rank's button was clicked, to buy a rank with XP.
	 */
	(e: 'buyRank'): void;
}>();
</script>

<template>
	<ActionButton v-if="canOpen" class="skill-icon" :image="image ?? undefined" :label="openLabel" @click="emit('open')" />
	<img v-else class="skill-icon" :src="image ?? undefined" alt="" />

	<RollLink class="skill-name" label="Genesys.Tooltips.RollSkill" :label-data="{ skill: props.skill }" @roll="emit('roll')">
		<span
			>{{ name
			}}<template v-if="characteristic"> (<Localized :label="CHARACTERISTIC_ABBREVIATIONS[characteristic]" />)</template></span
		>
		<i v-if="career" class="fas fa-star career-skill" aria-hidden="true"></i>
	</RollLink>

	<slot name="after-name" />

	<!-- prettier-ignore -->
	<span v-if="rank !== undefined" class="skill-rank">{{ rank }}<ActionButton v-if="canBuyRank" class="buy-rank" icon="fas fa-arrow-circle-up" label="Genesys.Labels.BuySkillRank" edits @click="emit('buyRank')" /></span>

	<SkillRanks :skill-value="skillValue" :characteristic-value="characteristicValue" />
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

// The ↑ sits on the rank's top-right corner rather than beside the number: the rank keeps one width whether a rank can
// be bought or not, so the column lines up and the name keeps its room (#620).
.skill-rank {
	position: relative;
}

.buy-rank {
	position: absolute;
	top: -0.3em;
	right: -0.45em;
	z-index: 1;
	display: inline-flex;
	font-size: 0.75em;
	line-height: 1;
	background: colors.$field;
	border-radius: 50%;
}
</style>
