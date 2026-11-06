<script lang="ts" setup>
import { computed, ref } from 'vue';
import { steppedValue, typedValue } from '@/data/CounterValue';
import { useEditable } from '@/vue/SheetContext';
import ActionButton from '@/vue/components/ActionButton.vue';

/**
 * A value that counts up from 0, such as wounds, a quantity or Story Points: the value alone, a spin button the keyboard
 * steps with its arrows, with − and + buttons that show on hover and focus. A right-click takes one off, and a value
 * typed into it goes through the counter's parsing. On a sheet the user can't edit, and where none of its changes is
 * allowed, it shows the value alone. The − and + take no focus on a press, which stays in the value being typed (and
 * out of a button, where Foundry would skip its keybindings).
 */
const props = withDefaults(
	defineProps<{
		/**
		 * The counter's value.
		 */
		value: number;

		/**
		 * The localization key of the counter's name, which is its tooltip too.
		 */
		label: string;

		/**
		 * The highest value the counter steps or is typed up to, such as twice a character's wound threshold. Left out
		 * when nothing caps it.
		 */
		max?: number;

		/**
		 * The localization key of the words the counter shows in place of its number, such as an item's damage.
		 */
		valueLabel?: string;

		/**
		 * Whether the user may take one off, may add one, and may type a value. The counter checks on top of them that
		 * the sheet is editable.
		 */
		canDecrease?: boolean;
		canIncrease?: boolean;
		canType?: boolean;

		/**
		 * Whether a number typed below 0 writes nothing, rather than 0, as for the Story Point pools (#263).
		 */
		refusesNegative?: boolean;

		/**
		 * The localization keys of the − and + buttons' names.
		 */
		decreaseLabel?: string;
		increaseLabel?: string;
	}>(),
	{
		canDecrease: true,
		canIncrease: true,
		canType: true,
		refusesNegative: false,
		decreaseLabel: 'Genesys.Counter.Decrease',
		increaseLabel: 'Genesys.Counter.Increase',
	},
);

const emit = defineEmits<{
	/**
	 * A step one up or down: the counter's owner writes it, and decides what a step past its bounds does, such as
	 * deleting an item whose quantity goes down to 0.
	 */
	(e: 'step', direction: 1 | -1): void;
	/**
	 * A value typed into the counter, already parsed and within its bounds, and different from its value.
	 */
	(e: 'type', value: number): void;
}>();

const editable = useEditable();

const decreases = computed(() => editable.value && props.canDecrease);
const increases = computed(() => editable.value && props.canIncrease);
// A counter that can't be typed into is a span marked for the keyboard: Foundry skips its keybindings (Escape, the
// arrows' token moves) while it has focus, as it does while an input has.
const types = computed(() => editable.value && props.canType);
const interactive = computed(() => decreases.value || increases.value || types.value);

// The − and the + show where a step moves the value their way within its bounds: a value already past its cap, from
// older data, only goes down. What a step does is the owner's, such as a quantity stepped down to 0, which deletes the
// item.
const showsDecrease = computed(() => decreases.value && steppedValue(props.value, -1, props.max) < props.value);
const showsIncrease = computed(() => increases.value && steppedValue(props.value, 1, props.max) > props.value);

const name = computed(() => game.i18n.localize(props.label));
const shownValue = computed(() => (props.valueLabel ? game.i18n.localize(props.valueLabel) : String(props.value)));

// The text being typed, until Enter or a blur writes it and Escape drops it: a render meanwhile keeps it.
const draft = ref<string>();

function typed(text: string) {
	return typedValue(text, { max: props.max, refuseNegative: props.refusesNegative });
}

function step(direction: 1 | -1) {
	if (!(direction === 1 ? increases.value : decreases.value)) {
		return;
	}

	// A step while a value is typed steps from that value, written as a typed one: writing the typed value, then a step
	// from the value stored before it lands, would leave the step alone (3, 10 typed, then + gave 4).
	const typedBefore = draft.value === undefined ? undefined : typed(draft.value);
	draft.value = undefined;
	if (typedBefore !== undefined) {
		const value = steppedValue(typedBefore, direction, props.max);
		if (value !== props.value) {
			emit('type', value);
		}
		return;
	}

	if (direction === 1 ? showsIncrease.value : showsDecrease.value) {
		emit('step', direction);
	}
}

function keydown(event: KeyboardEvent) {
	switch (event.key) {
		case 'ArrowUp':
			event.preventDefault();
			step(1);
			break;
		case 'ArrowDown':
			event.preventDefault();
			step(-1);
			break;
		case 'Enter':
			// Enter writes the value typed, and submits no form.
			event.preventDefault();
			commit();
			break;
		case 'Escape':
			draft.value = undefined;
			break;
	}
}

function commit() {
	if (draft.value === undefined) {
		return;
	}

	// Text that is no number, or the value the counter already holds, writes nothing (#277, #528).
	const value = typed(draft.value);
	draft.value = undefined;
	if (value !== undefined && value !== props.value) {
		emit('type', value);
	}
}

// A right-click on the counter takes one off, rather than opening the menu of the row it sits in.
function contextmenu(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	step(-1);
}
</script>

<template>
	<span v-if="!interactive" class="counter" :data-tooltip="label"
		>{{ shownValue }}<template v-if="$slots.default">{{ ' ' }}<slot /></template
	></span>
	<span v-else class="counter interactive" @contextmenu="contextmenu">
		<ActionButton
			v-if="showsDecrease"
			class="step decrease"
			icon="fas fa-minus"
			:label="decreaseLabel"
			tabindex="-1"
			@mousedown.prevent
			@click="step(-1)"
		/>
		<input
			v-if="types"
			class="value"
			type="text"
			inputmode="numeric"
			role="spinbutton"
			:aria-label="name"
			data-tooltip=""
			:aria-valuenow="value"
			aria-valuemin="0"
			:aria-valuemax="max"
			:aria-valuetext="valueLabel ? shownValue : undefined"
			:value="draft ?? shownValue"
			:size="Math.max((draft ?? shownValue).length, 1)"
			@input="draft = ($event.currentTarget as HTMLInputElement).value"
			@keydown="keydown"
			@blur="commit"
		/>
		<span
			v-else
			class="value"
			role="spinbutton"
			tabindex="0"
			aria-readonly="true"
			data-keyboard-focus="true"
			:aria-label="name"
			data-tooltip=""
			:aria-valuenow="value"
			aria-valuemin="0"
			:aria-valuemax="max"
			:aria-valuetext="valueLabel ? shownValue : undefined"
			@keydown="keydown"
			>{{ shownValue }}</span
		>
		<template v-if="$slots.default">{{ ' ' }}<slot /></template>
		<ActionButton
			v-if="showsIncrease"
			class="step increase"
			icon="fas fa-plus"
			:label="increaseLabel"
			tabindex="-1"
			@mousedown.prevent
			@click="step(1)"
		/>
	</span>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.counter {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	white-space: nowrap;
}

.value {
	font: inherit;
	color: inherit;
	text-align: center;
}

input.value {
	width: auto;
	min-width: 1ch;
	height: auto;
	margin: 0;
	padding: 0;
	background: none;
	border: none;
	border-radius: 0;
	box-shadow: none;
	line-height: inherit;
}

// The − and + sit over the counter's neighbours, on each side, without moving them, and show while the pointer is on
// the counter or the focus is in it.
.step {
	position: absolute;
	top: 50%;
	z-index: 1;
	display: none;
	align-items: center;
	justify-content: center;
	width: 1.25em;
	height: 1.25em;
	font-size: 0.6em;
	line-height: 1;
	background: colors.$paper;
	color: colors.$dark-blue;
	border: 1px solid colors.$gold;
	border-radius: 50%;
	transform: translateY(-50%);

	&.decrease {
		right: 100%;
	}

	&.increase {
		left: 100%;
	}
}

.counter:is(:hover, :focus-within) .step {
	display: inline-flex;
}
</style>
