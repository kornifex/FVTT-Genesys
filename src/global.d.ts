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
import type { Recovery } from '@/actor/Recovery';
import type { VehicleDataModel } from '@/actor/data/VehicleDataModel';
import type { CombatantDataModel } from '@/combat/CombatantDataModel';
import type { CombatDataModel } from '@/combat/CombatDataModel';
import type { GenesysCombat } from '@/combat/GenesysCombat';
import type { GenesysCombatant } from '@/combat/GenesysCombatant';
import type { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';
import type { GENESYS_CONFIG } from '@/config';
import type { GenesysEffect } from '@/effects/GenesysEffect';
import type { GenesysItem } from '@/item/GenesysItem';
import type { ItemDataModels } from '@/item/ItemTypes';
import type { QueryHandlers } from '@/queries';
import type { NAMESPACE } from '@/settings';
import type { storyPointsField } from '@/settings/storyPoints';
import type { SETTINGS } from '@/settings/table';
import type { GenesysActorDirectory } from '@/sidebar/GenesysActorDirectory';
import type { GenesysItemDirectory } from '@/sidebar/GenesysItemDirectory';
import type { GenesysTokenDocument } from '@/token/GenesysTokenDocument';

/** The settings of the table in `src/settings/table.ts`, each stored by the DataField its type builds. */
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

	// The documents Foundry hands out (`Actor.Stored`, an embedded collection's contents) are read from these: actors and
	// items by their subtype, the others whatever their subtype.
	interface ConfiguredActor<SubType extends Actor.SubType> {
		document: GenesysActor<SubType>;
	}
	interface ConfiguredItem<SubType extends Item.SubType> {
		document: GenesysItem<SubType>;
	}
	/* eslint-disable @typescript-eslint/no-unused-vars -- Each merges with fvtt-types' own, whose type parameter it must name. */
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
		// On the `base` type, as `src/combat/index.ts` registers them.
		Combat: { base: typeof CombatDataModel };
		Combatant: { base: typeof CombatantDataModel };
	}

	interface FlagConfig {
		Actor: { genesys: { independentMinion?: boolean } };
		ActiveEffect: { genesys: { expired?: boolean } };
		// The recovery of a check that heals, which its card's Apply button reads (`src/dice/recoveryCard.ts`).
		ChatMessage: { genesys: { recovery?: Recovery } };
	}

	interface SettingConfig extends TableSettings {
		'genesys.storyPoints': ReturnType<typeof storyPointsField>;
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
		}

		// The queries the Acting GM answers, which `src/queries` registers.
		interface Queries {
			'genesys.spendStoryPoint': QueryHandlers['genesys.spendStoryPoint'];
			'genesys.claimInitiativeSlot': QueryHandlers['genesys.claimInitiativeSlot'];
			'genesys.writeExtraSlotInitiative': QueryHandlers['genesys.writeExtraSlotInitiative'];
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
