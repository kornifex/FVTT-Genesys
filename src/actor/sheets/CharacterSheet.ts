import VueCharacterSheet from '@/vue/sheets/actor/CharacterSheet.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import { receiveCharacterDrop } from '@/operations/CharacterDrop';

/**
 * Actor sheet used for Player Characters
 */
export class CharacterSheet extends GenesysActorSheet<'character'> {
	override get vueComponent() {
		return VueCharacterSheet;
	}

	override get initialTab() {
		return 'skills';
	}

	protected override async receiveItem(droppedItem: GenesysItem) {
		return receiveCharacterDrop(this.actor, droppedItem);
	}
}
