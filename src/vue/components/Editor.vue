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
 * Keep the height the editor has when its toggle opens it. Closed, its enriched text sets its height; open, ProseMirror
 * fills whatever height it has, which would otherwise shrink to its minimum.
 */
function keepHeight(event: MouseEvent) {
	if (editor && (event.target as Element | null)?.closest('button.toggle')) {
		editor.style.minHeight = `${editor.offsetHeight}px`;
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
.editor {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

:deep(prose-mirror) {
	flex: 1;

	// Foundry positions the text in a box of the editor's height. Closed, the text flows instead, so that the editor grows
	// with it as the sheets lay it out.
	&.inactive > .editor-content {
		position: static;
		padding: 0 0.5em;
	}

	.ProseMirror {
		padding: 0 0.5em;
	}
}
</style>
