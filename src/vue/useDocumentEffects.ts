import { onBeforeMount, onBeforeUpdate, ref, toRaw, type Ref } from 'vue';
import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { EffectCategory, newEffectData } from '@/effects/NewEffect';
import { GenesysItem } from '@/item/GenesysItem';

/**
 * The effects of a sheet's document, for its Effects tab, and the creation of an effect in a category of the tab.
 * Call it from the sheet's setup: the list refreshes each time the sheet renders.
 */
export function useDocumentEffects(sheetDocument: () => GenesysActor | GenesysItem) {
	// The sheet re-renders when its document changes, but the document's effects collection isn't reactive: the list is
	// copied before each render instead. The reactive type of a document is also too deep for TypeScript to unwrap.
	const effects = ref([]) as Ref<GenesysEffect[]>;

	function updateEffects() {
		effects.value = [...toRaw(sheetDocument()).effects] as GenesysEffect[];
	}

	onBeforeMount(updateEffects);
	onBeforeUpdate(updateEffects);

	async function addEffect(category: EffectCategory) {
		const target = toRaw(sheetDocument());
		await target.createEmbeddedDocuments('ActiveEffect', [newEffectData(target.name, category)]);
	}

	return { effects, addEffect };
}
