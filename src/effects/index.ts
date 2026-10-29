import { GenesysEffect } from '@/effects/GenesysEffect';
import { GenesysEffectSheetV2 } from '@/effects/GenesysEffectSheet';

export function register() {
	CONFIG.ActiveEffect.documentClass = GenesysEffect;

	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', foundry.applications.sheets.ActiveEffectConfig);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheetV2, {
		makeDefault: true,
	});
}
