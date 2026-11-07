<script lang="ts" setup>
import { useId } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Localized from '@/vue/components/Localized.vue';
import Editor from '@/vue/components/Editor.vue';

const { system } = useSheetDocument<GenesysActor<'vehicle'>>();

// The illustration is named for what it is: it shows whatever image the user picked.
const illustrationName = game.i18n.localize('Genesys.Labels.Illustration');

const fieldId = useId();
</script>

<template>
	<section class="tab-details">
		<div class="description-section">
			<section class="description">
				<h3><Localized label="Genesys.Tabs.Description" /></h3>
				<Editor name="system.description" />
			</section>

			<section class="illustration">
				<h3><Localized label="Genesys.Labels.Illustration" /></h3>
				<img :src="system.illustration" data-edit="system.illustration" :alt="illustrationName" />
			</section>
		</div>

		<section class="info-section">
			<h3><Localized label="Genesys.Labels.Information" /></h3>

			<div class="details">
				<label :for="`${fieldId}-complement`"><Localized label="Genesys.Labels.Complement" /></label>
				<input :id="`${fieldId}-complement`" type="text" name="system.complement" :value="system.complement" />
				<div class="underline" />

				<label :for="`${fieldId}-consumables`"><Localized label="Genesys.Labels.Consumables" /></label>
				<input :id="`${fieldId}-consumables`" type="text" name="system.consumables" :value="system.consumables" />
				<div class="underline" />

				<div class="double-details">
					<label :for="`${fieldId}-price`"><Localized label="Genesys.Labels.Price" /></label>
					<input :id="`${fieldId}-price`" type="number" name="system.price" :value="system.price" />

					<label :for="`${fieldId}-rarity`"><Localized label="Genesys.Labels.Rarity" /></label>
					<input :id="`${fieldId}-rarity`" type="number" name="system.rarity" :value="system.rarity" />
				</div>

				<div class="split-underline"><span /><span /></div>

				<div class="double-details">
					<label :for="`${fieldId}-passengers`"><Localized label="Genesys.Labels.PassengerCapacity" /></label>
					<input
						:id="`${fieldId}-passengers`"
						type="number"
						name="system.passengers.threshold"
						:value="system.passengers.threshold"
					/>

					<label :for="`${fieldId}-encumbrance`"><Localized label="Genesys.Labels.EncumbranceCapacity" /></label>
					<input
						:id="`${fieldId}-encumbrance`"
						type="number"
						name="system.encumbrance.threshold"
						:value="system.encumbrance.threshold"
					/>
				</div>

				<div class="split-underline"><span /><span /></div>

				<label :for="`${fieldId}-source`"><Localized label="Genesys.Labels.Source" /></label>
				<input :id="`${fieldId}-source`" type="text" name="system.source" :value="system.source" />
			</div>
		</section>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

.tab-details {
	display: grid;
	grid-template-rows: auto auto;
	gap: 0.5em;
	padding: 0.5em;

	section {
		background: colors.alpha(colors.$light-blue, 0.2);
		border-radius: 1em;
		padding: 0.75em;
	}

	img {
		border: none;
		object-fit: cover;
		width: 100%;
		height: 100%;
		min-height: 100px;

		&[src=''] {
			background: colors.alpha(colors.$gold, 0.5);
		}
	}

	.description-section {
		display: grid;
		grid-template-columns: 1fr min(33%, 250px);
		grid-row: 1 / span 1;
		gap: 0.5em;

		.description {
			grid-column: 1 / span 1;
			display: flex;
			flex-direction: column;
			min-height: 15rem;
			max-height: 20rem;

			.editor {
				background: colors.$field;
				border: 1px solid colors.$ink;
			}
		}

		.illustration {
			grid-column: 2 / span 1;
			display: grid;
			grid-template-rows: auto 1fr;
		}
	}

	.info-section {
		grid-row: 2 / span 1;

		.details {
			display: grid;
			grid-template-columns: auto 1fr auto 1fr;
			grid-template-rows: repeat(4, auto 1px) auto 1fr;
			border: 1px solid colors.$ink;
			background: colors.$field;
			align-items: center;
			column-gap: 0.5em;

			label {
				grid-column: 1 / span 1;
				margin-left: 0.25em;
				font-family: 'Roboto Condensed', sans-serif;
				text-transform: uppercase;
				font-weight: 600;
				font-size: 0.8em;
			}

			@include reset.input;
			input {
				grid-column: 2 / span 3;
				padding-left: 0.25em;
				font-family: 'Roboto', sans-serif;
			}

			.underline,
			.split-underline {
				grid-column: 1 / span all;
				width: 92%;
				height: 100%;
				background: colors.$ink;
			}

			.split-underline {
				display: grid;
				grid-template-columns: auto auto;
				background: transparent;
				gap: 0 7%;

				& > span {
					grid-column: auto / span 1;
					background: colors.$ink;
				}
			}

			.double-details {
				display: contents;

				& > label,
				& > input {
					grid-column: auto / span 1;
				}
			}
		}
	}
}
</style>
