import type { DeepPartial } from 'fvtt-types/utils';
import VueCharacterSheet from '@/vue/sheets/actor/CharacterSheet.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';
import { receiveCharacterDrop } from '@/operations/CharacterDrop';
import { HIDE_MAGIC_TAB_FLAG, practicesMagic } from '@/actor/data/character/MagicTab';
import { isFoundryV13 } from '@/foundryGeneration';

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

	/**
	 * v13: the window builds its menu at its first render only, unless a render is given window options: each render gets
	 * them, so that the menu follows the flag and the character's magic. v14 builds the menu each time it opens.
	 */
	protected override _configureRenderOptions(options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>) {
		super._configureRenderOptions(options);
		if (isFoundryV13()) {
			options.window ??= {};
		}
	}
}
