<script lang="ts" setup>
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { computed, inject } from 'vue';
import { ItemSheetContext, RootContext } from '@/vue/SheetContext';
import { CareerDataModel } from '@/item/data/CareerDataModel';
import Editor from '@/vue/components/Editor.vue';
import Enriched from '@/vue/components/Enriched.vue';
import { withoutIndex } from '@/arrays';

const context = inject<ItemSheetContext<CareerDataModel>>(RootContext)!;
const system = computed(() => context.data.item.systemData);

const careerSkillsHeaderWords = game.i18n.localize('Genesys.Career.Skills').split(' ');

async function removeSkill(index: number) {
	await context.data.item.update({ 'system.careerSkills': withoutIndex(system.value.careerSkills, index) });
}
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:description>
			<section class="overview">
				<section class="description">
					<Editor name="system.description" :content="system.description" button />
					<Enriched class="source" :value="system.source" />
				</section>

				<section class="stats">
					<div class="header">
						<div v-for="word in careerSkillsHeaderWords" :key="word">{{ word }}</div>
					</div>

					<ul>
						<li v-for="skill in system.careerSkills" :key="skill.name">
							<div class="career-skill">
								<img :src="skill.img" :alt="skill.name" />
								<strong>{{ skill.name }}</strong>
								<em>{{ skill.system.source }}</em>
							</div>
						</li>
					</ul>
				</section>
			</section>
		</template>

		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />

				<DataRow label="Genesys.Career.Skills">
					<div v-for="(skill, index) in system.careerSkills" :key="skill.name" class="career-skill">
						<img :src="skill.img" :alt="skill.name" />
						<span class="name">{{ skill.name }}</span>
						<div v-if="context.data.editable">
							<a @click="removeSkill(index)"><i class="fas fa-trash"></i></a>
						</div>
					</div>
				</DataRow>
			</section>
		</template>
	</BasicItemSheet>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

section.overview {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	font-family: 'Roboto Slab', serif;

	.description {
		min-height: 120px;
	}

	.header {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.25em;
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.75em;
		color: colors.$blue;

		& > div:first-letter {
			font-size: 1.25em;
		}
	}

	li {
		display: flex;
		align-items: center;
		position: relative;
		gap: 0.25em;
		padding-right: 0.5em;

		&:nth-of-type(2n) {
			background: colors.alpha(colors.$blue, 0.2);
		}

		&::before {
			display: block;
			content: '';
			position: absolute;
			$size: 4px;
			top: calc(1em - $size);
			left: -1em;
			height: $size;
			width: $size;
			background: colors.$gold;
		}
	}

	.career-skill {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		column-gap: 0.25em;
		align-items: center;
		width: 100%;

		img {
			border: none;
			height: 1.5em;
			grid-column: 1 / span 1;
		}

		strong {
			grid-column: 2 / span 1;
		}

		em {
			grid-column: 4 / span 1;
			font-size: 0.8em;
			font-family: 'Roboto', sans-serif;
		}
	}
}

.data-grid .career-skill {
	display: grid;
	grid-template-columns: auto auto 1fr auto;
	align-items: center;
	gap: 0.25em;
	padding: 0.25em;

	&:nth-of-type(2n) {
		background: colors.alpha(colors.$blue, 0.2);
	}

	img {
		grid-column: 1 / span 1;
		border: none;
		height: 1.5em;
	}

	& > .name {
		grid-column: 2 / span 1;
		font-family: 'Roboto Serif', serif;
	}

	& > div {
		grid-column: 4 / span 1;
	}
}
</style>
