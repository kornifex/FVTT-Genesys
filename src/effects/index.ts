import { GenesysEffect } from '@/effects/GenesysEffect';
import { GenesysEffectSheetV2 } from '@/effects/GenesysEffectSheet';

/**
 * Register the Active Effect document and its sheet in place of Foundry's own.
 */
export function register() {
	CONFIG.ActiveEffect.documentClass = GenesysEffect;

	DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', ActiveEffectConfig);
	DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheetV2, {
		makeDefault: true,
	});
}
