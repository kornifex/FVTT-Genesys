import { GenesysCombat, register as registerCombatSocket } from '@/combat/GenesysCombat';
import { GenesysCombatant } from '@/combat/GenesysCombatant';
import { GenesysCombatTracker } from '@/combat/GenesysCombatTracker';
import { GenesysCombatTracker as GenesysCombatTrackerV12 } from '@/combat/GenesysCombatTracker.v12';
import { isFoundryV13OrLater } from '@/foundryGeneration';

export function register() {
	CONFIG.Combat.documentClass = GenesysCombat;
	CONFIG.Combatant.documentClass = GenesysCombatant;

	if (isFoundryV13OrLater()) {
		// @ts-expect-error -- The types we have are v12's, whose Combat Tracker is no ApplicationV2.
		CONFIG.ui.combat = GenesysCombatTracker;
	} else {
		// v12: the Combat Tracker is an Application.
		CONFIG.ui.combat = GenesysCombatTrackerV12;
	}

	registerCombatSocket();
}
