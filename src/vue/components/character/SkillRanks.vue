<script lang="ts" setup>
import { computed } from 'vue';
import { DIE_GLYPHS } from '@/dice/GenesysPoolModifications';
import Glyphs from '@/vue/components/Glyphs.vue';

const props = defineProps<{
	skillValue: number;
	characteristicValue: number;
}>();

const abilityDice = computed(() => Math.abs(props.skillValue - props.characteristicValue));
// Neither value has a minimum: an Active Effect can lower a characteristic below 0, and a rank can be stored as -1. A
// negative count shows no Proficiency die, as the row always did.
const proficiencyDice = computed(() => Math.max(Math.min(props.skillValue, props.characteristicValue), 0));
// The dice in words, in the order the row shows them: it lays them out from the right, so the Proficiency dice show
// first, on the left.
const glyphs = computed(() => DIE_GLYPHS.Proficiency.repeat(proficiencyDice.value) + DIE_GLYPHS.Ability.repeat(abilityDice.value));
</script>

<template>
	<Glyphs tag="div" class="skill-ranks" :glyphs>
		<div v-for="i in Math.max(0, 5 - Math.max(skillValue, characteristicValue))" :key="i" class="rank" />
		<div v-for="i in abilityDice" :key="i" class="rank ability" />
		<div v-for="i in proficiencyDice" :key="i" class="rank proficiency" />
	</Glyphs>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.skill-ranks {
	display: flex;
	flex-direction: row-reverse;
	align-items: center;
	padding-left: 6px;

	.rank {
		display: block;
		height: 12px;
		width: 20px;
		background: colors.$field;
		border: 1px solid colors.$ink;
		border-top-left-radius: 4px;
		border-bottom-left-radius: 4px;
		margin-left: -6px;

		&:first-of-type {
			border-radius: 4px;
		}

		&.proficiency {
			background: colors.$skill-rank-proficiency;
		}

		&.ability {
			background: colors.$die-ability;
		}
	}
}
</style>
