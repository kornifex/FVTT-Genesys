<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { type DocumentSheetContext, useSheetContext } from '@/vue/SheetContext';
import type { GenesysActor } from '@/actor/GenesysActor';
import type { GenesysItem } from '@/item/GenesysItem';
import { enrich } from '@/enrich';
import { usePendingContent } from '@/vue/PendingContent';

type HTMLProseMirrorElement = foundry.applications.elements.HTMLProseMirrorElement;

const props = defineProps<{
	/**
	 * The path of the edited field in the sheet's document, under which the sheet's form submits the text.
	 */
	name: string;

	/**
	 * Saves the text instead of the sheet's form, for a field the form can't submit by its path: an element of a list,
	 * such as a weapon's quality, which Foundry would replace the whole list with.
	 */
	save?: (text: string) => unknown;
}>();

const context = useSheetContext<DocumentSheetContext<GenesysActor | GenesysItem>>();

const container = ref<HTMLDivElement | null>(null);
const pendingContent = usePendingContent();

/**
 * The `<prose-mirror>` element shown, and what it was built from.
 */
let editor: HTMLProseMirrorElement | undefined;
let shown: { text: string; editable: boolean } | undefined;

/**
 * Counts the builds, so that a build whose enrichment ends after a later one started is dropped.
 */
let builds = 0;

// Each render of the sheet sets its context again: the editor watches it as its render tick. The text is read from the
// document rather than passed as a prop: Foundry updates the document's data in place, so a parent passing the same
// object (the Motivations) doesn't re-render. The sheet measures its content once the first text shows.
onMounted(() => pendingContent(show()));
watch(context, show);

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

	const stored: unknown = foundry.utils.getProperty(context.value.document._source, props.name);
	const text = typeof stored === 'string' ? stored : '';
	const editable = context.value.editable;
	if (shown?.text === text && shown.editable === editable) {
		return;
	}

	const build = ++builds;
	const enriched = await enrich(text);
	if (build !== builds || !container.value || editor?.open) {
		return;
	}

	// The element saves through the sheet's form: its `change` event submits it, under its name. Given its own save, it
	// has no name, which the form would submit it under, and its `change` event stops at it.
	const save = props.save;
	const element = foundry.applications.elements.HTMLProseMirrorElement.create({
		name: save ? '' : props.name,
		value: text,
		enriched,
		toggled: true,
		disabled: !editable,
	});
	if (save) {
		element.addEventListener('change', (event) => {
			event.stopPropagation();
			void save(element.value);
		});
	}
	// Once a toggled editor saves and closes, show what the document stores now.
	element.addEventListener('close', () => void show());
	container.value.replaceChildren(element);
	editor = element;
	shown = { text, editable };
}
</script>

<template>
	<div class="editor" ref="container"></div>
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
	// Foundry's `--min-height` of its editors, which the previous editor took through its `prosemirror` class, its border
	// included.
	min-height: 150px;
	overflow: auto;
}

:deep(prose-mirror) {
	// The element grows with its text and never shrinks below it: the wrapper scrolls instead. The wrapper holds the
	// minimum height, which would otherwise count a call site's border twice.
	flex: 1 0 auto;
	min-height: 0;

	.editor-content * {
		user-select: text;
	}

	// Foundry draws a content link or an inline roll with a border and a top padding, 3px taller than a line of the sheets'
	// `normal` height, so that the links of two lines overlapped. The text's line height leaves room for them, open or
	// closed. Unitless, so that a heading or a smaller text keeps it in proportion.
	.editor-content {
		line-height: 1.5;
	}

	// Foundry shows the toggle button under the pointer as a block, where its base `button` is a centring flex box. As a
	// block, the button's padding leaves its icon less room than the icon's width, and the icon overflows to the right:
	// 2px off-centre on v13, 4px on v14's wider icon. A flex box centres it over the padding.
	&:hover > button.toggle:enabled {
		display: flex;
	}

	// Foundry positions the text in a box of the element's height, which it scrolls. The text flows instead, closed or open,
	// so that the editor takes the height of its text, as the previous editor did. Closed, its blocks are spaced by the
	// editor's gap, as the previous editor laid them out.
	&.active .editor-content {
		position: static;
		overflow: visible;
	}

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

	// The HTML source mode's <code-mirror> grows with its HTML, as the rich text does: v14 positions its scroller in a box of
	// the element's height, at least 150px, which then scrolls, where v13's flows. The scroller stays positioned as
	// CodeMirror's base theme sets it, the containing block and stacking context of its cursor and selection layers.
	code-mirror.source-editor .cm-scroller {
		position: relative;
		inset: auto;
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
