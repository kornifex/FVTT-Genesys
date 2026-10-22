import { AdversarySheet } from '@/actor/sheets/AdversarySheet';
import VueMinionSheet from '@/vue/sheets/actor/MinionSheet.vue';

/**
 * Actor sheet used for Minion Groups.
 */
export class MinionSheet extends AdversarySheet {
	override get vueComponent() {
		return VueMinionSheet;
	}
}
