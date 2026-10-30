import { GenesysCombat, register as registerCombatSocket } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';

/**
 * Register the combat, its combatants and its tracker with Foundry.
 */
export function register() {
	CONFIG.Combat.documentClass = GenesysCombat;
	CONFIG.Combatant.documentClass = GenesysCombatant;

	// The types take the core class, whose generic constructor no subclass of a fixed instantiation matches.
	CONFIG.ui.combat = GenesysCombatTracker as typeof foundry.applications.sidebar.tabs.CombatTracker;

	registerCombatSocket();
}
