<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useSheetContext } from '@/vue/SheetContext';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';

/**
 * A tab of a sheet: the name of its panel's slot, and the localization key of its label.
 */
type SheetTab = { id: string; label: string };

/**
 * What the tabs read of their sheet: where ApplicationV2 keeps each group's active tab, the tab the sheet opens on, and
 * its id, which the ids tying a tab to its panel start with.
 */
type TabbedSheet = Pick<foundry.applications.api.ApplicationV2.Any, 'id' | 'tabGroups'> & { initialTab?: string };

/**
 * A sheet's tabs, following the WAI-ARIA tabs pattern: a tab list, `nav.sheet-tabs`, and the panels it shows one at a
 * time, `section.sheet-body`, each from the slot named after its tab. The inactive panels stay rendered, hidden by their
 * missing `active` class. The active tab lives in the sheet's `tabGroups`, which outlive its Vue app: a sheet reopens on
 * the tab it was closed on.
 */
const props = withDefaults(
	defineProps<{
		/**
		 * The tabs, in their order.
		 */
		tabs: SheetTab[];

		/**
		 * The group the tabs make in the sheet's `tabGroups`.
		 */
		group?: string;
	}>(),
	{ group: 'primary' },
);

const context = useSheetContext<{ sheet: TabbedSheet }>();
const sheet = computed(() => context.value.sheet);

const exists = (id: string | null | undefined): id is string => props.tabs.some((tab) => tab.id === id);

/**
 * The tab the sheet shows when the tabs mount: the one its `tabGroups` keeps, else the one it opens on, else the first.
 */
function shownFirst() {
	const { tabGroups, initialTab } = sheet.value;
	const kept = tabGroups[props.group];
	if (exists(kept)) {
		return kept;
	}
	return exists(initialTab) ? initialTab : props.tabs[0]?.id;
}

const selected = ref(shownFirst());
// A tab that leaves the list, such as an item's Effects tab, leaves the first one shown.
const active = computed(() => (exists(selected.value) ? selected.value : props.tabs[0]?.id));

const nav = ref<HTMLElement>();

const tabId = (id: string) => `${sheet.value.id}-tab-${id}`;
const panelId = (id: string) => `${sheet.value.id}-panel-${id}`;

function activate(id: string) {
	selected.value = id;
	sheet.value.tabGroups[props.group] = id;
}

/**
 * Move to another tab from the keyboard, showing its panel: the arrow keys move to the tab beside the focused one,
 * wrapping round the ends, and Home and End to the first and the last. The listener sits on the tabs, inside the sheet's
 * element: on v14 a window can be detached into another document. A key held with Alt, Ctrl or Meta is left to the
 * browser and the system, as Alt+Left goes back.
 */
function moveFrom(index: number, event: KeyboardEvent) {
	if (event.altKey || event.ctrlKey || event.metaKey) {
		return;
	}

	const last = props.tabs.length - 1;
	const target = {
		ArrowLeft: index === 0 ? last : index - 1,
		ArrowRight: index === last ? 0 : index + 1,
		Home: 0,
		End: last,
	}[event.key];
	if (target === undefined) {
		return;
	}

	event.preventDefault();
	const { id } = props.tabs[target];
	activate(id);
	[...(nav.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])].find((tab) => tab.dataset.tab === id)?.focus();
}
</script>

<template>
	<nav ref="nav" class="sheet-tabs" role="tablist">
		<div class="spacer" aria-hidden="true"></div>

		<ActionButton
			v-for="(tab, index) in tabs"
			:key="tab.id"
			:id="tabId(tab.id)"
			:class="['item', { active: tab.id === active }]"
			:data-tab="tab.id"
			role="tab"
			:aria-selected="tab.id === active"
			:aria-controls="panelId(tab.id)"
			:tabindex="tab.id === active ? 0 : -1"
			@click="activate(tab.id)"
			@keydown="moveFrom(index, $event)"
		>
			<Localized :label="tab.label" />
		</ActionButton>

		<div class="spacer" aria-hidden="true"></div>
	</nav>

	<section class="sheet-body">
		<div
			v-for="tab in tabs"
			:key="tab.id"
			:id="panelId(tab.id)"
			:class="['tab', { active: tab.id === active }]"
			:data-tab="tab.id"
			role="tabpanel"
			:aria-labelledby="tabId(tab.id)"
		>
			<slot :name="tab.id" />
		</div>
	</section>
</template>
