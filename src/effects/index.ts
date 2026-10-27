import { GenesysEffect } from '@/effects/GenesysEffect';
import { GenesysEffectSheet as GenesysEffectSheetV12 } from '@/effects/GenesysEffectSheet.v12';
import { GenesysEffectSheetV2 } from '@/effects/GenesysEffectSheet';
import { isFoundryV12 } from '@/foundryGeneration';

export function register() {
	CONFIG.ActiveEffect.documentClass = GenesysEffect;

	// v12: legacy transferral is on by default; v13 turns it off and v14 no longer reads it. Item effects stay on their item
	// and apply to its actor from there, as on later versions (ADR 0001).
	CONFIG.ActiveEffect.legacyTransferral = false;

	DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', ActiveEffectConfig);
	if (isFoundryV12()) {
		// v12: the effect sheet is a FormApplication.
		DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheetV12, {
			makeDefault: true,
		});
	} else {
		DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheetV2, {
			makeDefault: true,
		});
	}
}
