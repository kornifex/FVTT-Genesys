import GenesysEffect from '@/effects/GenesysEffect';
import GenesysEffectSheet from '@/effects/GenesysEffectSheet';
import GenesysEffectSheetV2 from './GenesysEffectSheetV2';
import { isFoundryV12, isFoundryV13OrLater } from '@/foundryGeneration';

export function register() {
	CONFIG.ActiveEffect.documentClass = GenesysEffect;

	if (isFoundryV13OrLater()) {
		// @ts-expect-error -- The types we have lack the legacyTransferral setting.
		CONFIG.ActiveEffect.legacyTransferral = true;
	}

	DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', ActiveEffectConfig);
	if (isFoundryV12()) {
		DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheet, {
			makeDefault: true,
		});
	} else {
		DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheetV2, {
			makeDefault: true,
		});
	}
}
