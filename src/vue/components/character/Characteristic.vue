<script lang="ts" setup>
import { computed } from 'vue';
import { useEditable } from '@/vue/SheetContext';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import MenuItem from '@/vue/components/MenuItem.vue';
import RollLink from '@/vue/components/RollLink.vue';
import { vLocalize } from '@/vue/directives';

const props = withDefaults(
	defineProps<{
		/**
		 * Localization key for the characteristic label.
		 */
		label: string;

		/**
		 * Can the characteristic be upgraded?
		 */
		canUpgrade?: boolean;

		/**
		 * Can the field be directly edited?
		 */
		canEdit?: boolean;

		/**
		 * Can the characteristic be used to directly roll a Characteristic Check?
		 */
		canRollCharacteristicCheck?: boolean;

		/**
		 * Can the characteristic be marked as a super-characteristic?
		 */
		canMarkSuper?: boolean;

		/**
		 * Is this a super-characteristic?
		 */
		isSuper?: boolean;

		/**
		 * If the field can be directly edited, what is the field name for the input?
		 */
		name?: string;

		/**
		 * Value to display for the Characteristic.
		 */
		value: number | string;
	}>(),
	{
		canUpgrade: false,
		canEdit: false,
		canRollCharacteristicCheck: false,
		canMarkSuper: false,
		isSuper: false,
	},
);

const emit = defineEmits<{
	(e: 'upgrade'): void;
	(e: 'rollCharacteristicCheck'): void;
	(e: 'toggleSuper'): void;
}>();

// Raising a characteristic edits the sheet's document: a sheet the user can't edit shows no ↑ beside the label, which
// rolls either way. `canUpgrade` only weighs the character's XP.
const editable = useEditable();
const upgradable = computed(() => props.canUpgrade && editable.value);

// The characteristic the label's tooltip names: "Roll Brawn".
const characteristicName = computed(() => game.i18n.localize(props.label));

const allowSuperCharacteristics = CONFIG.genesys.settings.useSuperCharacteristics;
</script>

<template>
	<div class="characteristic-field">
		<div class="box">
			<div class="box-inner"></div>
		</div>

		<!-- Its ⋮ opens the Mark Superior menu from the keyboard too, as a right-click on the label does. -->
		<ContextMenu :disable-menu="!(allowSuperCharacteristics && canMarkSuper)" class="super-char" trigger>
			<template v-slot:menu-items>
				<MenuItem
					:icon="`${isSuper ? 'far' : 'fas'} fa-star`"
					:label="isSuper ? 'Genesys.Labels.UnmarkSuperCharacteristic' : 'Genesys.Labels.MarkSuperCharacteristic'"
					@click="emit('toggleSuper')"
				/>
			</template>

			<!-- Not a label, which would pass a click on its margin to the button. -->
			<span class="characteristic-label">
				<RollLink
					v-if="canRollCharacteristicCheck"
					label="Genesys.Tooltips.RollCharacteristic"
					:label-data="{ characteristic: characteristicName }"
					@roll="emit('rollCharacteristicCheck')"
				>
					<Localized :label="label" />
				</RollLink>

				<span v-else>
					<Localized :label="label" />
				</span>

				<ActionButton
					v-if="upgradable"
					class="raise"
					icon="fas fa-arrow-circle-up"
					label="Genesys.Labels.RaiseCharacteristic"
					edits
					@click="emit('upgrade')"
				/>
			</span>
		</ContextMenu>

		<div class="value">
			<i v-if="allowSuperCharacteristics && isSuper" class="fas fa-star super-star"></i>

			<!-- Named by the characteristic: its label above may be a button, which a label can't name a field with. -->
			<input v-if="canEdit" type="text" data-dtype="Number" :name="name" :value="value" v-localize:aria-label="label" />
			<div v-else>{{ value }}</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

.characteristic-field {
	$row-size: 1.5rem;

	display: grid;
	// As wide as its label, name and ↑, and never narrower than its value (#621): the label's width is the column's least,
	// which the row can't squeeze. Each box of a row has its own width (#644).
	grid-template-columns: minmax(max-content, 1fr);
	min-width: $row-size * 2;
	grid-template-rows: repeat(2, $row-size) auto;
	justify-content: center;
	align-items: center;
	position: relative;

	& > * {
		grid-column: 1 / span 1;
	}

	.value {
		grid-row: 1 / span 2;
		justify-self: center;
		// The star of a super-characteristic sits on the value's corner.
		position: relative;
		border: 2px solid colors.$blue;
		border-radius: 50%;
		width: $row-size * 2;
		height: $row-size * 2;
		background: colors.$field;
		@include headings.font;
		font-size: 2em;
		text-align: center;
		// Help vertically center the Bebas Neue font.
		padding-top: 0.15em;
		z-index: 1;

		@include reset.input;
		input {
			z-index: 3;
			// An input doesn't inherit text-align, and Foundry v13's field styles leave it at the browser's start.
			text-align: center;
		}

		&:focus-within {
			border: 2px solid colors.$gold;
		}
	}

	.box {
		position: relative;
		$clip-size: 0.5rem;
		grid-row: 1 / span 3;
		height: 100%;
		background: colors.$blue;
		margin-left: -1em;
		width: calc(100% + 2em);

		$clip-path: polygon(
			0% 100%,
			0% ($clip-size + $row-size),
			$clip-size $row-size,
			calc(100% - $clip-size) $row-size,
			100% ($clip-size + $row-size),
			100% 100%
		);
		clip-path: $clip-path;

		.box-inner {
			position: absolute;
			top: 1px;
			left: 1px;
			width: calc(100% - 2px);
			height: calc(100% - 2px);

			background: colors.$field;

			clip-path: $clip-path;

			&::after {
				display: block;
				content: ' ';
				position: absolute;
				top: 1px;
				left: 1px;
				width: calc(100% - 2px);
				height: 100%;
				background: radial-gradient(colors.$field 50%, colors.$blue 50%);
				background-size: ($row-size * 3) calc(($row-size * 3));
				background-repeat: no-repeat;
				background-position: 50% -14px;
				background-color: colors.$blue;
				clip-path: $clip-path;
			}
		}
	}

	// The star of a super-characteristic sits on the value's corner (#644): centred on the middle of its border, at the
	// top left. That point lies 1 − 1/√2 of the circle's radius in from its box's corner on each axis: the radius runs
	// to the middle of the 2px border, past the padding box the percentages measure. A blue outline keeps it apart from
	// the value's white.
	.super-star {
		position: absolute;
		padding: 0;
		font-size: 0.55em;
		line-height: 1;
		top: calc(50% - (50% + 1px) * 0.7071);
		left: calc(50% - (50% + 1px) * 0.7071);
		transform: translate(-50%, -50%);
		color: colors.$gold;
		filter: drop-shadow(0 0 1px colors.$blue);
		// Over the value's field, which a click on it still reaches.
		z-index: 4;
		pointer-events: none;
	}

	.super-char {
		display: contents;
		white-space: nowrap;

		// The menu's ⋮, its own, which :deep() reaches, sits beside the value's top, over the sheet's background, across
		// from the star of a super-characteristic: its right edge 1.25em past the value's, which the field centres.
		:deep(.menu-trigger) {
			position: absolute;
			top: 0;
			left: calc(50% + #{$row-size} + 1.25em);
			transform: translateX(-100%);
			z-index: 2;
		}
	}

	// It fills its column, without a percentage width: its text sets the column's least width, so the box never gets
	// narrower than its label where the row runs short of room.
	.characteristic-label {
		grid-row: 3 / span 1;
		grid-column: 1 / span 1;
		color: colors.$text-on-dark;
		@include headings.font;
		text-transform: uppercase;
		text-align: center;
		position: relative;
		z-index: 1;
		margin-top: 2px;
		margin-bottom: 2px;

		// The name, which rolls, centred under the value, and its ↑ right beside it (#644). The first column, as wide as
		// the ↑'s, keeps the name centred; the box, fitted to the label, holds both.
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;

		& > :first-child {
			grid-column: 2;
		}

		.raise {
			grid-column: 3;
			justify-self: start;
			margin-left: 0.25em;
			// As the skills' ↑ badge is sized (#620).
			font-size: 0.75em;
			line-height: 1;
		}
	}
}
</style>
