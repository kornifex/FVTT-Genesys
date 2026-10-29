/**
 * @file Provides overridden, system-specific type data for Foundry's CONFIG global.
 */

import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { GenesysItem } from '@/item/GenesysItem';
import { GenesysCombat } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';
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
	// v12: the Foundry types we have are v12's, whose Combat Tracker is an Application; `GenesysConfig` declares the system's.
	CombatTracker<GenesysCombat>,
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
	// v12: the Foundry types we have are v12's, whose `ui.combat` is the Application Combat Tracker.
	const ui: Omit<
		FoundryUI<
			GenesysActor,
			GenesysActorDirectory<GenesysActor>,
			GenesysItem,
			GenesysItemDirectory<GenesysItem>,
			ChatMessage<GenesysActor>,
			ChatLog<ChatMessage<GenesysActor>>,
			CompendiumDirectory,
			CombatTracker<GenesysCombat>
		>,
		'combat'
	> & { combat: GenesysCombatTracker };
	const canvas: Canvas;

	interface GenesysConfig extends Omit<FoundryConfig, 'ui'> {
		ui: Omit<FoundryConfig['ui'], 'combat'> & {
			combat: typeof GenesysCombatTracker;
		};

		genesys: typeof GENESYS_CONFIG;
	}

	// Override the typings for various CONFIG values in order to provide strongly-typed config within the system.
	const CONFIG: GenesysConfig;

	const game: Game<
		GenesysActor,
		foundry.documents.collections.Actors<GenesysActor>,
		ChatMessage<GenesysActor>,
		GenesysCombat,
		GenesysItem,
		Macro,
		Scene,
		User<GenesysActor>
	>;
}
