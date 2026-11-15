import VueCharacterSheet from '@/vue/sheets/actor/CharacterSheet.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import { receiveCharacterDrop } from '@/operations/CharacterDrop';
import { HIDE_MAGIC_TAB_FLAG, practicesMagic } from '@/actor/data/character/MagicTab';

/**
 * Actor sheet used for Player Characters
 */
export class CharacterSheet extends GenesysActorSheet<'character'> {
	// Wide enough for two columns of the Skills tab, at 340px each (#620).
	static override DEFAULT_OPTIONS = {
		position: { width: 780 },
	};

	override get vueComponent() {
		return VueCharacterSheet;
	}

	override get initialTab() {
		return 'skills';
	}

	protected override async receiveItem(droppedItem: GenesysItem) {
		return receiveCharacterDrop(this.actor, droppedItem);
	}

	/**
	 * The window's menu hides or shows the Magic tab of a character who practices magic, for the users who can edit them.
	 */
	protected override _getHeaderControls() {
		const hidden = () => this.actor.getFlag('genesys', HIDE_MAGIC_TAB_FLAG) === true;
		const toggle = async () => {
			await this.actor.setFlag('genesys', HIDE_MAGIC_TAB_FLAG, !hidden());
		};
		// Each entry shows while the tab is in the state it changes.
		const shownWhenHidden = (state: boolean) => () => this.isEditable && practicesMagic(this.actor.items) && hidden() === state;

		return [
			...super._getHeaderControls(),
			{
				action: 'hideMagicTab',
				icon: 'fas fa-eye-slash',
				label: 'Genesys.Labels.HideMagicTab',
				visible: shownWhenHidden(false),
				onClick: toggle,
			},
			{
				action: 'showMagicTab',
				icon: 'fas fa-eye',
				label: 'Genesys.Labels.ShowMagicTab',
				visible: shownWhenHidden(true),
				onClick: toggle,
			},
		];
	}
}
