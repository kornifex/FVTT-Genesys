<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import { itemsOfType } from '@/item/ItemTypes';
import { SPELL_ACTION_LABELS } from '@/item/data/Spells';
import { DIE_GLYPHS } from '@/dice/GenesysPoolModifications';
import { castSpell, openSheet } from '@/operations/ItemActions';
import RollLink from '@/vue/components/RollLink.vue';
import Localized from '@/vue/components/Localized.vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';
import Glyphs from '@/vue/components/Glyphs.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';
import RowActions from '@/vue/components/RowActions.vue';

const { document: actor } = useSheetDocument<GenesysActor<'character'>>();

const spells = computed(() => itemsOfType(actor.value, 'spell'));

const difficultyGlyphs = (difficulty: number) => DIE_GLYPHS.Difficulty.repeat(difficulty);
</script>

<template>
	<section class="tab-magic">
		<div class="block">
			<h3><Localized label="Genesys.Labels.Spells" /></h3>
			<div v-if="spells.length > 0" class="spells">
				<div class="spell header" aria-hidden="true">
					<div></div>
					<div><Localized label="Genesys.Labels.Name" /></div>
					<div><Localized label="Genesys.Labels.SpellAction" /></div>
					<div><Localized label="Genesys.Labels.Difficulty" /></div>
					<div><Localized label="Genesys.Labels.AdditionalEffects" /></div>
					<div></div>
				</div>
				<div v-for="spell in spells" :key="spell.id" class="spell" :data-item-id="spell.id">
					<ActionButton class="icon" label="Genesys.Tooltips.OpenItem" @click="openSheet(spell)">
						<img :src="spell.img ?? undefined" alt="" />
					</ActionButton>
					<DescriptionFold class="name" :description="spell.system.description">
						<RollLink label="Genesys.Tooltips.CastSpell" :label-data="{ spell: spell.name }" @roll="castSpell(actor, spell)">{{
							spell.name
						}}</RollLink>
					</DescriptionFold>
					<div class="action"><Localized :label="SPELL_ACTION_LABELS[spell.system.action]" /></div>
					<Glyphs class="difficulty" :glyphs="difficultyGlyphs(spell.system.difficulty)" />
					<ul class="additional-effects">
						<li v-for="effect in spell.system.additionalEffects" :key="effect.id">
							{{ effect.name }}
							<Glyphs :glyphs="`+${difficultyGlyphs(effect.difficulty)}`" />
						</li>
					</ul>
					<RowActions class="actions" :document="spell" />
				</div>
			</div>
			<ListEmpty v-else />
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.tab-magic {
	padding: 0.5em;

	.block {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		background: colors.alpha(colors.$light-blue, 0.2);
		border-radius: 1em;
		padding: 0.5em 0.5em 1em 0.5em;
	}

	.spells {
		border: 1px solid colors.$blue;
	}

	.spell {
		display: grid;
		grid-template-columns:
			/* Icon */
			2em /* Name */ 2fr /* Action */ 1fr /* Difficulty */ 1fr /* Additional Effects */ 2fr
			/* Actions */ auto;
		align-items: center;
		column-gap: 0.5em;
		padding: 0.25em;

		& + .spell {
			border-top: 1px dashed colors.$ink;
		}

		&.header {
			background: colors.$blue;
			color: colors.$text-on-dark;
			font-weight: bold;
		}

		.icon {
			padding: 0;
			margin: 0;
			border: none;
			background: none;

			img {
				width: 2em;
				aspect-ratio: 1;
				object-fit: contain;
			}
		}

		// The name's fold is the second root of its `DescriptionFold`, which takes no scope attribute from the row: it
		// opens under the row, across its columns, while every other cell stays on the first line.
		& > :deep(*) {
			grid-row: 1 / span 1;
		}

		& > :deep(.description-fold) {
			grid-column: 1 / span all;
			grid-row: 2 / span 1;
			padding-left: 0.5em;
		}

		.additional-effects {
			list-style: none;
			margin: 0;
			padding: 0;
		}
	}
}
</style>
