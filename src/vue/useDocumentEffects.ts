import { computed } from 'vue';
import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { EffectCategory, newEffectData } from '@/effects/NewEffect';
import { GenesysItem } from '@/item/GenesysItem';
import { useSheetDocument } from '@/vue/useSheetDocument';

/**
 * The effects of the sheet's document, for its Effects tab, and the creation of an effect in a category of the tab.
 * Call it from the sheet's setup: the list is read again on each render of the sheet.
 */
export function useDocumentEffects() {
	const { document } = useSheetDocument<GenesysActor | GenesysItem>();

	// The document keeps the same effects collection while Foundry changes it: the list is a new copy on each render.
	const effects = computed(() => {
		const sheetDocument = document.value;
		// An actor's effects are those that apply to it: its own, and those its items transfer to it.
		return [
			...(sheetDocument instanceof GenesysActor ? sheetDocument.allApplicableEffects() : sheetDocument.effects),
		] as GenesysEffect[];
	});

	async function addEffect(category: EffectCategory) {
		const target = document.value;
		await target.createEmbeddedDocuments('ActiveEffect', [newEffectData(target.name, category)]);
	}

	return { effects, addEffect };
}
