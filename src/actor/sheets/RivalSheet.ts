import { AdversarySheet } from '@/actor/sheets/AdversarySheet';
import VueRivalSheet from '@/vue/sheets/actor/RivalSheet.vue';

/**
 * Actor sheet used for Rivals.
 */
export class RivalSheet extends AdversarySheet {
	override get vueComponent() {
		return VueRivalSheet;
	}
}
