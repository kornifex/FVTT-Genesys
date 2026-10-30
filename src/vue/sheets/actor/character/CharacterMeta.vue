<script lang="ts" setup>
import { toRef } from 'vue';

import { canRemoveArchetype } from '@/actor/data/character/Archetype';
import { vLocalize } from '@/vue/directives';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Localized from '@/vue/components/Localized.vue';
import { itemsOfType } from '@/item/ItemTypes';
import { openSheet, removeArchetype, removeCareer } from '@/operations/ItemActions';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';

const { document: actor, system, editable } = useSheetDocument<GenesysActor<'character'>>();

const archetype = toRef(() => itemsOfType(actor.value, 'archetype').at(0));
const career = toRef(() => itemsOfType(actor.value, 'career').at(0));
</script>

<template>
	<header class="character-meta">
		<div class="data">
			<div class="title"><Localized label="TYPES.Actor.character" /></div>

			<label><Localized label="Genesys.Labels.CharacterName" /></label>
			<input type="text" name="name" :value="actor.name" v-localize:placeholder="'Genesys.Labels.CharacterName'" />

			<div class="underline"></div>

			<label><Localized label="Genesys.Labels.SpeciesArchetype" /></label>
			<div>
				<span v-if="archetype" class="archetype">
					<ContextMenu>
						<template v-slot:menu-items>
							<MenuItem icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(archetype)" />

							<MenuItem
								v-if="editable && canRemoveArchetype(system)"
								icon="fas fa-trash"
								label="Genesys.Labels.Delete"
								@click="removeArchetype(actor, archetype)"
							/>
						</template>

						<a @click="openSheet(archetype)">{{ archetype.name }} <i class="fas fa-arrow-up-right-from-square"></i></a>
					</ContextMenu>
				</span>
				<span v-else><Localized label="Genesys.Labels.NoArchetype" /></span>
			</div>

			<div class="underline"></div>

			<label><Localized label="Genesys.Labels.Career" /></label>
			<div>
				<span v-if="career" class="career">
					<ContextMenu>
						<template v-slot:menu-items>
							<MenuItem icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(career)" />

							<MenuItem
								v-if="editable"
								icon="fas fa-trash"
								label="Genesys.Labels.Delete"
								@click="removeCareer(actor, career)"
							/>
						</template>

						<a @click="openSheet(career)">{{ career.name }} <i class="fas fa-arrow-up-right-from-square"></i></a>
					</ContextMenu>
				</span>
				<span v-else><Localized label="Genesys.Labels.NoCareer" /></span>
			</div>

			<div class="underline"></div>
		</div>

		<img :src="actor.img ?? undefined" data-edit="img" :alt="actor.name" />
	</header>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

// Container for the character's meta information; name, archetype, career, etc. as well as the Actor's image
.character-meta {
	display: grid;
	grid-template-columns: 1fr min(110px, 20%);
	gap: 1rem;
	margin-bottom: 0.5em;

	@include reset.input;

	// Actor's image
	img {
		border: 1px solid colors.$gold;
		background: colors.alpha(colors.$gold, 0.5);
		border-radius: 1em;
	}

	// Container for the input fields to actually handle inputting character data.
	.data {
		// Pull the data container to be flush with the top, matching the official sheet.
		margin-top: -8px;
		$padding: 8px;
		padding: $padding;

		// Ensure the input fields are evenly aligned.
		display: grid;
		grid-template-columns: auto 1fr;
		grid-auto-rows: auto 1.5em;
		column-gap: 1em;
		align-items: center;

		// Style-match the original sheet's meta box.
		background: colors.alpha(colors.$light-blue, 0.2);
		border-bottom-left-radius: 1rem;
		border-bottom-right-radius: 1rem;

		label,
		.title {
			font-family: 'Bebas Neue', sans-serif;
		}

		.title {
			grid-column: 1 / span 2;
			color: colors.$blue-gray;
			text-transform: uppercase;
		}

		// An empty div that provides an underline effect for each row.
		// Allows us to have the benefits of both the alignment from display: grid and underlining we could get by containing each row in its own div.
		.underline {
			grid-column: 1 / span 2;
			border-top: 1px solid black;

			// Style-match the originals; pull the underline to the left side of the box and ensure it fills to the right side.
			margin-left: -1 * $padding;
			width: calc(100% + ($padding * 2));
		}

		// All non-label elements should appear in the second column; expect them to be input fields.
		* {
			grid-column: 2 / span 1;
		}

		// Labels should only be used as the row label.
		label {
			grid-column: 1 / span 1;
		}
	}
}
</style>
