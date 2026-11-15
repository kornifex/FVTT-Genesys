import { GenesysEffect, registerCombatantEffects } from '@/effects/GenesysEffect';
import { GenesysEffectSheetV2 } from '@/effects/GenesysEffectSheet';
import { registerTokenStates } from '@/effects/tokenStateMenu';
import { registerUsedUpEffects } from '@/effects/maneuverEffects';
import { POOL_MODIFICATION_TYPE } from '@/effects/PoolModifications';

/**
 * Register the Active Effect document and its sheet in place of Foundry's own, and the change type of Pool
 * Modifications.
 */
export function register() {
	CONFIG.ActiveEffect.documentClass = GenesysEffect;
	CONFIG.ActiveEffect.changeTypes[POOL_MODIFICATION_TYPE] = {
		label: 'Genesys.ActiveEffects.Types.ModifyDicePool.GroupLabel',
		defaultPriority: 0,
		// A Pool Modification changes no data of its actor: the system reads it when it builds a dice pool.
		handler: () => {},
	};
	registerTokenStates();
	registerUsedUpEffects();

	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', foundry.applications.sheets.ActiveEffectConfig);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheetV2, {
		makeDefault: true,
	});

	Hooks.once('ready', registerCombatantEffects);
}
