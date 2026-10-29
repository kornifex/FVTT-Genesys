<script lang="ts" setup>
import { inject, onMounted, ref, watch } from 'vue';
import { BaseSheetContext, RootContext } from '@/vue/SheetContext';
import { enrich } from '@/enrich';

type HTMLProseMirrorElement = foundry.applications.elements.HTMLProseMirrorElement;

const props = defineProps<{
	/**
	 * The path of the edited field in the sheet's document, under which the sheet's form submits the text.
	 */
	name: string;
}>();

const context = inject<BaseSheetContext>(RootContext)!;

const container = ref<HTMLDivElement | null>(null);

/**
 * The `<prose-mirror>` element shown, and what it was built from.
 */
let editor: HTMLProseMirrorElement | undefined;
let shown: { text: string; editable: boolean } | undefined;

/**
 * Counts the builds, so that a build whose enrichment ends after a later one started is dropped.
 */
let builds = 0;

// Each render of the sheet replaces its context's data. The text is read from the document rather than passed as a prop:
// Foundry updates the document's data in place, so a parent passing the same object (the Motivations) doesn't re-render.
onMounted(show);
watch(() => context.data, show);

/**
 * Show the field's stored text in a toggled `<prose-mirror>` element. The element reads its value and enriched text only
 * when it is constructed, so a new one replaces it when they change; Vue can't create it from the template, since it
 * sets attributes after construction.
 */
async function show() {
	// An open editor holds what the user is typing: it is rebuilt once it closes.
	if (editor?.open) {
		return;
	}

	const stored: unknown = foundry.utils.getProperty(context.sheet.document._source, props.name);
	const text = typeof stored === 'string' ? stored : '';
	const editable = context.data.editable;
	if (shown?.text === text && shown.editable === editable) {
		return;
	}

	const build = ++builds;
	const enriched = await enrich(text);
	if (build !== builds || !container.value || editor?.open) {
		return;
	}

	// The element saves through the sheet's form: its `change` event submits it, under its name.
	const element = foundry.applications.elements.HTMLProseMirrorElement.create({
		name: props.name,
		value: text,
		enriched,
		toggled: true,
		disabled: !editable,
	});
	element.addEventListener('close', onClose);
	container.value.replaceChildren(element);
	editor = element;
	shown = { text, editable };
}

/**
 * Keep the height the editor shows when its toggle opens it. Closed, its enriched text sets its height, and the wrapper
 * scrolls what its box can't show; open, ProseMirror fills whatever height the element has, and scrolls itself, so the
 * element would otherwise shrink to its minimum.
 */
function keepHeight(event: MouseEvent) {
	if (editor && container.value && (event.target as Element | null)?.closest('button.toggle')) {
		editor.style.minHeight = `${container.value.clientHeight}px`;
	}
}

/**
 * Once a toggled editor saves and closes, let its text set its height again, and show what the document stores now.
 */
function onClose() {
	if (editor) {
		editor.style.minHeight = '';
	}
	void show();
}
</script>

<template>
	<div class="editor" ref="container" @click.capture="keepHeight"></div>
</template>

<style lang="scss" scoped>
// The wrapper keeps the box of the previous editor: it fills the call site, which may bound its height (the vehicle's
// description), and scrolls the text that box can't show.
.editor {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	max-width: 100%;
	max-height: 100%;
	// Foundry's `--min-height` of its editors, which the previous editor took through its `prosemirror` class.
	min-height: 150px;
	overflow: auto;
}

:deep(prose-mirror) {
	// The element grows with its text and never shrinks below it: the wrapper scrolls instead.
	flex: 1 0 auto;

	.editor-content * {
		user-select: text;
	}

	// Foundry positions the text in a box of the element's height, which it scrolls. Closed, the text flows instead, so that
	// the editor grows with it, its blocks spaced by the editor's gap as the previous editor laid them out.
	&.inactive > .editor-content {
		position: static;
		display: flex;
		flex-direction: column;
		gap: 0.5rem 0;
		padding: 0;
		overflow: visible;

		> * {
			padding-left: 0.5em;
			padding-right: 0.5em;
		}

		> :is(ul, ol) {
			padding-left: 2em;
		}
	}

	.editor-container {
		margin: 0 0 1em;
	}

	.ProseMirror {
		padding-left: 0.5em;
		padding-right: 0.5em;
	}
}
</style>
