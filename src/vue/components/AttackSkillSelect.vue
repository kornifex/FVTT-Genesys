<script lang="ts" setup>
import { toRaw } from 'vue';
import { GenesysItem } from '@/item/GenesysItem';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { skillNamesMatch } from '@/data/Skills';

const props = defineProps<{
	weapon: GenesysItem<WeaponDataModel>;
	/**
	 * The skills the Attack Skill can be chosen from, as `attackSkillChoices` gives them.
	 */
	choices: string[];
	attackSkill: string;
}>();

async function chooseAttackSkill(event: Event) {
	await toRaw(props.weapon).update({ 'system.attackSkill': (event.currentTarget as HTMLSelectElement).value });
}
</script>

<template>
	<!-- Unnamed, so the sheet's form doesn't submit it as actor data. A click on it mustn't reach the attack link around
	 it on the adversary sheet. -->
	<select v-if="choices.length > 1" class="attack-skill" @change="chooseAttackSkill" @click.stop>
		<option v-for="name in choices" :key="name" :value="name" :selected="skillNamesMatch(name, attackSkill)">
			{{ name }}
		</option>
	</select>
	<template v-else>{{ attackSkill }}</template>
</template>

<style lang="scss" scoped>
.attack-skill {
	// Foundry stretches a select to its container: keep the skill names whole in a sheet's narrow skill cell.
	flex: none;
	width: auto;
}
</style>
