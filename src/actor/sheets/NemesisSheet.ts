import { AdversarySheet } from '@/actor/sheets/AdversarySheet';
import VueNemesisSheet from '@/vue/sheets/actor/NemesisSheet.vue';

/**
 * Actor sheet used for Nemeses.
 */
export class NemesisSheet extends AdversarySheet {
	override get vueComponent() {
		return VueNemesisSheet;
	}
}
