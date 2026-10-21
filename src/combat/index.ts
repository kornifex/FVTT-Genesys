/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysCombat, { register as registerCombatSocket } from '@/combat/GenesysCombat';
import GenesysCombatant from '@/combat/GenesysCombatant';
import GenesysCombatTracker from '@/combat/GenesysCombatTracker';
import GenesysCombatTrackerV13 from '@/combat/GenesysCombatTracker[v13]';
import { isFoundryV13OrLater } from '@/foundryGeneration';

export function register() {
	CONFIG.Combat.documentClass = GenesysCombat;
	CONFIG.Combatant.documentClass = GenesysCombatant;

	if (isFoundryV13OrLater()) {
		// @ts-expect-error
		CONFIG.ui.combat = GenesysCombatTrackerV13;
	} else {
		CONFIG.ui.combat = GenesysCombatTracker;
	}

	registerCombatSocket();
}
