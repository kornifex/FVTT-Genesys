import { CombatantDataModel } from '@/combat/CombatantDataModel';
import { CombatDataModel } from '@/combat/CombatDataModel';
import { GenesysCombat, register as registerCombatSocket } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';

/**
 * Register the combat, its combatants and its tracker with Foundry.
 */
export function register() {
	CONFIG.Combat.documentClass = GenesysCombat;
	CONFIG.Combatant.documentClass = GenesysCombatant;
	// Core reserves the `base` type, which a manifest can't declare, but its data model is read from CONFIG.
	CONFIG.Combat.dataModels.base = CombatDataModel;
	CONFIG.Combatant.dataModels.base = CombatantDataModel;

	// The types take the core class, whose generic constructor no subclass of a fixed instantiation matches.
	CONFIG.ui.combat = GenesysCombatTracker as typeof foundry.applications.sidebar.tabs.CombatTracker;

	registerCombatSocket();
}
