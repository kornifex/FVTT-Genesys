import { CharacterSheet } from '@/actor/sheets/CharacterSheet';
import { MinionSheet } from '@/actor/sheets/MinionSheet';
import { RivalSheet } from '@/actor/sheets/RivalSheet';
import { NemesisSheet } from '@/actor/sheets/NemesisSheet';
import { VehicleSheet } from '@/actor/sheets/VehicleSheet';

/**
 * Registers an actor sheet of the system.
 */
function registerSheet(
	sheetClass: foundry.applications.api.DocumentSheetV2.AnyConstructor,
	options: foundry.applications.apps.DocumentSheetConfig.RegisterSheetOptions<Actor.ImplementationClass>,
) {
	foundry.documents.collections.Actors.registerSheet('genesys', sheetClass, options);
}

/**
 * Register the actor sheets in place of Foundry's own.
 */
export function register() {
	foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);

	registerSheet(CharacterSheet, {
		types: ['character'],
		makeDefault: true,
	});

	registerSheet(MinionSheet, {
		types: ['minion'],
		makeDefault: true,
	});

	registerSheet(RivalSheet, {
		types: ['rival'],
		makeDefault: true,
	});

	registerSheet(NemesisSheet, {
		types: ['nemesis'],
		makeDefault: true,
	});

	registerSheet(VehicleSheet, {
		types: ['vehicle'],
		makeDefault: true,
	});
}
