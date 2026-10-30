/**
 * @file Configures `fvtt-types` with the system's document classes, data models, settings and `CONFIG` entry (ADR 0006).
 *
 * Each entry must match what the system registers at runtime, or the compiler types what Foundry doesn't build.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import type { MinionDataModel } from '@/actor/data/MinionDataModel';
import type { NemesisDataModel } from '@/actor/data/NemesisDataModel';
import type { RivalDataModel } from '@/actor/data/RivalDataModel';
import type { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import type { ClaimData, GenesysCombat } from '@/combat/GenesysCombat';
import type { GenesysCombatant } from '@/combat/GenesysCombatant';
import type { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';
import type { StoredExtraSlot } from '@/combat/InitiativeSlots';
import type { GENESYS_CONFIG } from '@/config';
import type { GenesysEffect } from '@/effects/GenesysEffect';
import type { GenesysItem } from '@/item/GenesysItem';
import type { ItemDataModels } from '@/item/ItemTypes';
import type { NAMESPACE } from '@/settings';
import type { StoryPointData } from '@/settings/storyPoints';
import type { SETTINGS } from '@/settings/table';
import type { GenesysActorDirectory } from '@/sidebar/GenesysActorDirectory';
import type { GenesysItemDirectory } from '@/sidebar/GenesysItemDirectory';
import type { GenesysTokenDocument } from '@/token/GenesysTokenDocument';

/** The settings of the table in `src/settings/table.ts`, each holding the value its type stores. */
type TableSettings = {
	[K in keyof typeof SETTINGS as `${typeof NAMESPACE}.${K}`]: ReturnType<(typeof SETTINGS)[K]['type']>;
};

declare module 'fvtt-types/configuration' {
	interface DocumentClassConfig {
		Actor: typeof GenesysActor;
		Item: typeof GenesysItem;
		ActiveEffect: typeof GenesysEffect;
		Combat: typeof GenesysCombat;
		Combatant: typeof GenesysCombatant;
		Token: typeof GenesysTokenDocument;
	}

	// The documents Foundry hands out (`Actor.Stored`, an embedded collection's contents) are read from these, whatever
	// their subtype: the system's classes take their DataModel rather than their subtype.
	/* eslint-disable @typescript-eslint/no-unused-vars -- Each merges with fvtt-types' own, whose type parameter it must name. */
	interface ConfiguredActor<SubType extends Actor.SubType> {
		document: GenesysActor;
	}
	interface ConfiguredItem<SubType extends Item.SubType> {
		document: GenesysItem;
	}
	interface ConfiguredActiveEffect<SubType extends ActiveEffect.SubType> {
		document: GenesysEffect;
	}
	interface ConfiguredCombat<SubType extends Combat.SubType> {
		document: GenesysCombat;
	}
	interface ConfiguredCombatant<SubType extends Combatant.SubType> {
		document: GenesysCombatant;
	}
	/* eslint-enable @typescript-eslint/no-unused-vars */

	interface DataModelConfig {
		Actor: {
			character: typeof CharacterDataModel;
			minion: typeof MinionDataModel;
			rival: typeof RivalDataModel;
			nemesis: typeof NemesisDataModel;
			vehicle: typeof VehicleDataModel;
		};
		Item: { [T in keyof ItemDataModels]: abstract new (...args: never[]) => ItemDataModels[T] };
	}

	interface FlagConfig {
		Actor: { genesys: { independentMinion?: boolean } };
		Combat: { genesys: { slotClaims?: ClaimData; extraSlots?: StoredExtraSlot[] } };
		Combatant: { genesys: { initiativeSkill?: string } };
	}

	interface SettingConfig extends TableSettings {
		'genesys.storyPoints': StoryPointData;
		'genesys.alphaVersion': string;
		'genesys.migrationVersion': number;
	}

	// The hook of the Dice So Nice module that `src/dice/diceSoNice.ts` registers the dice on.
	namespace Hooks {
		interface HookConfig {
			diceSoNiceReady: (dice3d: Dice3d) => void;
		}
	}

	// The system reads `game`, `ui` and `canvas` from its hooks and the windows they open, which run once Foundry is ready,
	// apart from 'init' and 'setup', which only read what Foundry built before them.
	interface AssumeHookRan {
		ready: never;
	}
}

declare global {
	interface CONFIG {
		genesys: typeof GENESYS_CONFIG;
	}

	namespace CONFIG {
		// The fonts `src/fonts` adds to the text editor.
		interface FontDefinitions {
			'Bebas Neue': Font.FamilyDefinition;
			Roboto: Font.FamilyDefinition;
			'Roboto Condensed': Font.FamilyDefinition;
			'Roboto Slab': Font.FamilyDefinition;
			'Roboto Mono': Font.FamilyDefinition;
			'Roboto Serif': Font.FamilyDefinition;
			'Genesys Symbols': Font.FamilyDefinition;
			'Magical Girl Symbols': Font.FamilyDefinition;
		}
	}

	// `ui` reads its applications' types from the core classes `CONFIG.ui` declares, so the system's classes, which
	// `src/combat` and `src/sidebar` put in their place, are declared here.
	interface UI {
		combat: GenesysCombatTracker;
		actors: GenesysActorDirectory;
		items: GenesysItemDirectory;
	}
}
