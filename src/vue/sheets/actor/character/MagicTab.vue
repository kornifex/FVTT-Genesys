<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import { itemsOfType } from '@/item/ItemTypes';
import { SPELL_ACTION_LABELS } from '@/item/data/Spells';
import { difficultyGlyphs } from '@/dice/Difficulty';
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

const glyphsOf = (level: number) => difficultyGlyphs({ level, upgrades: 0 });
</script>

<template>
	<section class="tab-magic">
		<div class="block">
			<h3><Localized label="Genesys.Labels.Spells" /></h3>
			<div v-if="spells.length > 0" class="spells">
				<div class="spell header columns" aria-hidden="true">
					<div class="name"><Localized label="Genesys.Labels.Name" /></div>
					<div><Localized label="Genesys.Labels.SpellAction" /></div>
					<div><Localized label="Genesys.Labels.Difficulty" /></div>
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
					<Glyphs class="difficulty die die-Difficulty" :glyphs="glyphsOf(spell.system.difficulty)" />
					<RowActions class="actions" :document="spell" />
					<ul v-if="spell.system.additionalEffects.length > 0" class="additional-effects qualities">
						<li v-for="effect in spell.system.additionalEffects" :key="effect.id">
							{{ effect.name }}
							<Glyphs class="die die-Difficulty" :glyphs="`+${glyphsOf(effect.difficulty)}`" />
						</li>
					</ul>
				</div>
			</div>
			<ListEmpty v-else />
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/combat-tab.scss';
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
		@include combat-tab.item-row;
		grid-template-columns: /* Icon */ 2em /* Name */ 2fr /* Action */ 1fr /* Difficulty */ 1fr /* Actions */ auto;
		column-gap: 0.5em;
		padding: 0.25em;

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

		.additional-effects {
			list-style: none;
			margin: 0;
			padding: 0;
			justify-self: left;
			display: flex;
			flex-wrap: wrap;
			gap: 0.25em;

			li {
				@include combat-tab.tag;
			}
		}
	}
}
</style>
