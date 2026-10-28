import { CharacterSheet } from '@/actor/sheets/CharacterSheet';
import { MinionSheet } from '@/actor/sheets/MinionSheet';
import { RivalSheet } from '@/actor/sheets/RivalSheet';
import { NemesisSheet } from '@/actor/sheets/NemesisSheet';
import { VehicleSheet } from '@/actor/sheets/VehicleSheet';
import { GenesysActorSheet } from '@/actor/GenesysActorSheet';

/**
 * Registers an actor sheet of the system. The Foundry types we have only register AppV1 sheets, though Foundry takes ApplicationV2
 * ones (ADR 0005).
 */
function registerSheet(sheetClass: ConstructorOf<GenesysActorSheet>, options: RegisterSheetOptions) {
	Actors.registerSheet('genesys', sheetClass as unknown as ConstructorOf<ActorSheet>, options);
}

export function register() {
	Actors.unregisterSheet('core', ActorSheet);

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
