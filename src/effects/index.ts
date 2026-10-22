import { GenesysEffect } from '@/effects/GenesysEffect';
import { GenesysEffectSheet as GenesysEffectSheetV12 } from '@/effects/GenesysEffectSheet.v12';
import { GenesysEffectSheetV2 } from '@/effects/GenesysEffectSheet';
import { isFoundryV12, isFoundryV13OrLater } from '@/foundryGeneration';

export function register() {
	CONFIG.ActiveEffect.documentClass = GenesysEffect;

	if (isFoundryV13OrLater()) {
		CONFIG.ActiveEffect.legacyTransferral = true;
	}

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
