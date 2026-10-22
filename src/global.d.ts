/**
 * @file Provides overridden, system-specific type data for Foundry's CONFIG global.
 */

import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { GenesysItem } from '@/item/GenesysItem';
import { GenesysCombat } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';
// v12: the Foundry types we have are v12's, so `ui.combat` has the v12 Combat Tracker's type.
import { GenesysCombatTrackerV12 } from '@/combat/GenesysCombatTracker.v12';
import { GENESYS_CONFIG } from '@/config';
import { GenesysActorDirectory } from '@/sidebar/GenesysActorDirectory';
import { GenesysItemDirectory } from '@/sidebar/GenesysItemDirectory';

// The CONFIG of the types we have, which GenesysConfig completes with the v13 entries of `types/foundry-v13` (ADR 0005).
type FoundryConfig = Config<
	AmbientLightDocument,
	GenesysEffect,
	GenesysActor,
	GenesysActorDirectory<GenesysActor>,
	ChatLog,
	ChatMessage,
	GenesysCombat,
	GenesysCombatant,
	GenesysCombatTrackerV12,
	CompendiumDirectory,
	Hotbar,
	GenesysItem,
	GenesysItemDirectory<GenesysItem>,
	Macro,
	MeasuredTemplateDocument,
	TileDocument,
	TokenDocument,
	Scene,
	User,
	EffectsCanvasGroup
>;

declare global {
	const ui: FoundryUI<
		GenesysActor,
		GenesysActorDirectory<GenesysActor>,
		GenesysItem,
		GenesysItemDirectory<GenesysItem>,
		ChatMessage<GenesysActor>,
		ChatLog<ChatMessage<GenesysActor>>,
		CompendiumDirectory,
		GenesysCombatTrackerV12<GenesysCombat>
	>;
	const canvas: Canvas;

	interface GenesysConfig extends Omit<FoundryConfig, 'ui'> {
		ActiveEffect: FoundryConfig['ActiveEffect'] & {
			/** Whether an item's effects are copied onto its actor rather than applied from the item (ADR 0001). */
			legacyTransferral: boolean;
		};

		ui: Omit<FoundryConfig['ui'], 'combat'> & {
			// v12: the Foundry types we have are v12's, so the v13 Combat Tracker is declared beside the v12 one.
			combat: ConstructorOf<GenesysCombatTrackerV12> | typeof GenesysCombatTracker;
		};

		genesys: typeof GENESYS_CONFIG;
	}

	// Override the typings for various CONFIG values in order to provide strongly-typed config within the system.
	const CONFIG: GenesysConfig;

	const game: Game<
		GenesysActor,
		Actors<GenesysActor>,
		ChatMessage<GenesysActor>,
		GenesysCombat,
		GenesysItem,
		Macro,
		Scene,
		User<GenesysActor>
	>;
}
