import { GenesysCombat, register as registerCombatSocket } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';

/**
 * Register the combat, its combatants and its tracker with Foundry.
 */
export function register() {
	CONFIG.Combat.documentClass = GenesysCombat;
	CONFIG.Combatant.documentClass = GenesysCombatant;

	CONFIG.ui.combat = GenesysCombatTracker;

	registerCombatSocket();
}
