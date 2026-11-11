<script lang="ts" setup>
import { computed, ref } from 'vue';
import { steppedValue, typedValue } from '@/data/CounterValue';
import { useEditable } from '@/vue/SheetContext';
import ActionButton from '@/vue/components/ActionButton.vue';

/**
 * A value that counts up from 0, such as wounds, a quantity or Story Points: the value alone, a spin button the keyboard
 * steps with its arrows, with − and + buttons that show on hover and focus. A right-click on it changes nothing: it is
 * left to the row the counter sits in, which opens its menu. A value typed into it goes through the counter's parsing. On a sheet the user can't edit, and where none of its changes is allowed, it shows the value
 * alone. The − and + take no focus on a press, which stays in the value being typed (and out of a button, where
 * Foundry would skip its keybindings).
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
	}>(),
	{
		canDecrease: true,
		canIncrease: true,
		canType: true,
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

// The − and + show while the pointer is on the counter, them included, or the focus is in it; hidden, they are hidden
// from a screen reader too. One state drives both, so that a − or + never shows to the eye alone, as one the focus in
// the value shows would. The pointer leaves through `pointerleave`, which a move between the counter's own parts doesn't
// fire; the focus leaves when it goes out of the counter.
const pointerIn = ref(false);
const focusIn = ref(false);
const revealed = computed(() => pointerIn.value || focusIn.value);

// A pointer that hovers shows the − and +: a mouse, or a pen above the screen. A finger, or a pen that lands without
// hovering first, comes over the counter pressed: showing them then would let one tap show a − and press it, and a tap
// at the edge of a wound threshold would take a wound off. A tap on the value shows them, through its focus.
function pointerover(event: PointerEvent) {
	if (event.pointerType === 'touch' || (event.pointerType === 'pen' && event.buttons !== 0)) {
		return;
	}
	pointerIn.value = true;
}

// A tap on a hidden − or +, where a device that also has a mouse lets it through (see the styles), presses nothing. A
// mouse has shown it on its way there, and a click from code (`element.click()`) names no pointer.
function press(event: MouseEvent, direction: 1 | -1) {
	const tapped = event instanceof PointerEvent && (event.pointerType === 'touch' || event.pointerType === 'pen');
	if (tapped && !revealed.value) {
		return;
	}
	step(direction);
}

function focusout(event: FocusEvent) {
	const counter = event.currentTarget as HTMLElement;
	focusIn.value = event.relatedTarget instanceof Node && counter.contains(event.relatedTarget);
}

// The text being typed, until Enter or a blur writes it and Escape drops it: a render meanwhile keeps it.
const draft = ref<string>();

function typed(text: string) {
	return typedValue(text, { max: props.max });
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
</script>

<template>
	<span v-if="!interactive" class="counter" :data-tooltip="label"
		>{{ shownValue }}<template v-if="$slots.default">{{ ' ' }}<slot /></template
	></span>
	<span
		v-else
		class="counter interactive"
		:class="{ revealed }"
		@pointerover="pointerover"
		@pointerleave="pointerIn = false"
		@focusin="focusIn = true"
		@focusout="focusout"
	>
		<ActionButton
			v-if="showsDecrease"
			class="step decrease"
			label="Genesys.Counter.Decrease"
			tabindex="-1"
			:aria-hidden="revealed ? undefined : 'true'"
			@mousedown.prevent
			@click="press($event, -1)"
		>
			<template #icon><span class="sign" aria-hidden="true"></span></template>
		</ActionButton>
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
			label="Genesys.Counter.Increase"
			tabindex="-1"
			:aria-hidden="revealed ? undefined : 'true'"
			@mousedown.prevent
			@click="press($event, 1)"
		>
			<template #icon><span class="sign" aria-hidden="true"></span></template>
		</ActionButton>
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

// The value shows as text. Its focus ring is the sheets' shared one (`VueSheet.scss`, #575), which this rule leaves alone.
input.value {
	width: auto;
	min-width: 1ch;
	height: auto;
	margin: 0;
	padding: 0;
	background: none;
	border: none;
	border-radius: 0;
	line-height: inherit;
}

// The − and + sit over the counter's neighbours, on each side, without moving them, and show while the counter is
// revealed (see `revealed`). Hidden, they stay where they show and take the pointer, so that a pointer going straight
// there, from any side, is on the counter, which shows them (#645). What they cover of a neighbour is their own small
// circle: the neighbour keeps the rest of its area.
.step {
	position: absolute;
	top: 50%;
	z-index: 1;
	display: inline-flex;
	opacity: 0;
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

// The − and + are drawn, rather than Font Awesome's glyphs: those sit about a tenth of an em above the middle of the
// line they fill, so they showed high in their circle. Two bars, centred by their box, sit in its middle in any font.
.sign {
	position: relative;
	width: 0.8em;
	height: 0.8em;

	&::before,
	&::after {
		position: absolute;
		inset: 0;
		margin: auto;
		background: currentColor;
		border-radius: 0.0625em;
	}

	&::before {
		content: '';
		height: 0.125em;
	}
}

.increase .sign::after {
	content: '';
	width: 0.125em;
}

.counter.revealed .step {
	opacity: 1;
}

// Without hover, a pointer can't reveal them: hidden, they let a tap through to the neighbour under them. A tap on the
// value shows them.
@media (hover: none) {
	.counter:not(.revealed) .step {
		pointer-events: none;
	}
}
</style>
