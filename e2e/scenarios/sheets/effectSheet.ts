import type { ChangeRow, SheetsContext } from './shared.ts';



export async function effectSheetPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	await e2e.step('effect sheet setup', () => gm.evaluate(() => window.sheetsE2E.effectSheet.create()));
	await e2e.step('#85 GM opens the effect sheet from the Effects tab of a character', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			const { htmlOf, waitFor, effectRows, editEffect } = window.e2e;
			await sheets.open('Hero');
			await sheets.clickTab('Hero', 'effects');
			const hero = game.actors.getName('E2E Hero');
			await editEffect(effectRows(hero.sheet).find((row) => row.name === 'E2E Edited')!);
			const effectSheet = hero.effects.getName('E2E Edited').sheet;
			await waitFor(
				'the effect sheet',
				() => effectSheet.rendered && htmlOf(effectSheet)?.querySelector('[name$="changes.0.key"]'),
			);
		}),
	);
	const englishCharacteristics = {
		options: ['Agility', 'Brawn', 'Cunning', 'Intellect', 'Presence', 'Willpower'],
		values: ['agility', 'brawn', 'cunning', 'intellect', 'presence', 'willpower'],
		selected: 'willpower',
	};
	const keyValues = [
		'system.characteristics.brawn',
		'system.characteristics.agility',
		'system.characteristics.intellect',
		'system.characteristics.cunning',
		'system.characteristics.willpower',
		'system.characteristics.presence',
		'system.silhouette',
		'system.speed',
		'system.handling',
		'system.defense',
		'system.armor',
	];
	// §#380: the silhouette applies to any actor.
	const keyGroup = (label: string, names: string[], silhouette: string, vehicle: string[]) => ({
		label,
		options: [...names.map((name) => `🧑 ${name}`), `🌐 ${silhouette}`, ...vehicle.map((name) => `🚗 ${name}`)],
		values: keyValues,
	});
	const state = await gm.evaluate(() => window.sheetsE2E.effectSheet.state('Hero'));
	e2e.expect(
		'#85 A1 the effect sheet renders from its template',
		state.template,
		'systems/genesys/templates/sheets/effect-changes-tab.hbs',
	);
	e2e.expect(
		"#140 A1 the dice pool characteristic select shows the characteristics' names sorted, and keeps its selection",
		state.charSelect,
		englishCharacteristics,
	);
	e2e.expect(
		'#140 A2 the key select lists the six characteristics in their order, then the vehicle characteristics, and keeps its selection',
		{ group: state.keyGroup, selected: state.keySelected },
		{
			group: keyGroup(
				'Modify Characteristic',
				['Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'],
				'Silhouette',
				['Speed', 'Handling', 'Defense', 'Armor'],
			),
			selected: 'system.characteristics.cunning',
		},
	);
	e2e.expect('#243 A1 the key select offers no key, then every key by group', state.keyOptions, [
		'=—',
		{
			label: 'Modify Characteristic',
			options: [
				'system.characteristics.brawn=🧑 Brawn',
				'system.characteristics.agility=🧑 Agility',
				'system.characteristics.intellect=🧑 Intellect',
				'system.characteristics.cunning=🧑 Cunning',
				'system.characteristics.willpower=🧑 Willpower',
				'system.characteristics.presence=🧑 Presence',
				'system.silhouette=🌐 Silhouette',
				'system.speed=🚗 Speed',
				'system.handling=🚗 Handling',
				'system.defense=🚗 Defense',
				'system.armor=🚗 Armor',
			],
		},
		{
			label: 'Modify Stat',
			options: [
				'system.soak=🧑 Soak Value',
				'system.wounds.max=🧑 Wound Threshold',
				'system.strain.max=🧑 Strain Threshold',
				'system.defense.melee=🧑 Melee Defense',
				'system.defense.ranged=🧑 Ranged Defense',
				'system.pilotedVehicleDefense=🧑 Piloted Vehicle Defense',
				'system.hullTrauma.max=🚗 Hull Trauma Threshold',
				'system.systemStrain.max=🚗 System Strain Threshold',
				'system.passengers.value=🚗 Passengers',
				'system.passengers.threshold=🚗 Passenger Capacity',
				'system.encumbrance.value=🌐 Encumbrance',
				'system.encumbrance.threshold=🌐 Encumbrance Threshold',
			],
		},
		{
			label: 'Provide Defense (best kept)',
			options: ['system.providedDefense.melee=🧑 Melee Defense', 'system.providedDefense.ranged=🧑 Ranged Defense'],
		},
		{
			label: 'Modify Dice Pool',
			options: [
				'genesys.pool.check.self=👇 Any Check',
				'genesys.pool.char.self=👇 Uses Characteristic',
				'genesys.pool.skill.self=👇 Uses Skill',
				'genesys.pool.combat.self=👇 Combat Check',
				'genesys.pool.melee.self=👇 Melee Attack',
				'genesys.pool.ranged.self=👇 Ranged Attack',
				'genesys.pool.check.target=🎯 Any Check',
				'genesys.pool.char.target=🎯 Uses Characteristic',
				'genesys.pool.skill.target=🎯 Uses Skill',
				'genesys.pool.melee.target=🎯 Melee Attack',
				'genesys.pool.ranged.target=🎯 Ranged Attack',
			],
		},
		{
			label: 'Modify Critical Injuries',
			options: ['genesys.critical.inflicted=🎯 Inflicted on Others', 'genesys.critical.suffered=👇 Suffered'],
		},
		{
			label: 'Modify Item',
			options: [
				'genesys.item.baseDamage=🔧 Damage',
				'genesys.item.critical=🔧 Critical',
				'genesys.item.defense=🔧 Defense',
				'genesys.item.soak=🔧 Soak',
				'genesys.item.encumbrance=🔧 Encumbrance',
			],
		},
	]);
	const skillSelect = (index: number, selected: string) => ({
		index,
		selected,
		custom: true,
		changeCase: true,
		compendiumCase: false,
	});
	e2e.expect(
		"#40 A1 every skill select lists the skills the effect's changes apply to, a compendium skill once with the change's case",
		state.skillSelects,
		[skillSelect(0, state.skillSelects[0]?.selected ?? ''), skillSelect(3, 'E2E Custom Skill'), skillSelect(4, 'ranged (light)')],
	);

	// v13: a change has a mode, which v14 replaced with a type; v14 also parses a value that holds JSON.
	const v14Types: Record<number, string> = { 0: 'custom', 2: 'add', 5: 'override' };
	const asStored = (changes: [string, number, string][]): ChangeRow[] =>
		e2e.version < 14
			? changes
			: changes.map(([key, mode, value]) => [key, v14Types[mode], /^\d+$/.test(value) ? Number(value) : value]);
	const savedChanges = asStored([
		['system.characteristics.cunning', 2, '1'],
		['genesys.pool.char.self.willpower', 0, 'B'],
		['genesys.pool.check.self.', 0, 'S'],
		['genesys.pool.skill.self.E2E Custom Skill', 0, 'A'],
		['genesys.pool.skill.target.ranged (light)', 0, 'D'],
		['genesys.pool.check.target.', 0, ''],
	]);
	await e2e.step('#32 GM saves the effect sheets of an actor and an item unchanged', () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.submit('Hero');
			await effectSheet.open('Bearer/Charm');
			await effectSheet.submit('Bearer/Charm');
		}),
	);
	e2e.expect(
		'#32 A1 saving an effect sheet keeps its Pool Modification keys and values, a skill outside the compendium included, and blanks a non-glyph value',
		await gm.evaluate(() => ({
			actor: window.sheetsE2E.effectSheet.changes('Hero'),
			item: window.sheetsE2E.effectSheet.changes('Bearer/Charm'),
		})),
		{ actor: savedChanges, item: savedChanges },
	);
	const editedChanges = asStored([
		['system.characteristics.presence', 5, '1'],
		['genesys.pool.char.self.presence', 0, 'B'],
		['genesys.pool.check.self.', 0, 'SS'],
		['genesys.pool.skill.self.Cool', 0, 'A'],
		['genesys.pool.skill.target.ranged (light)', 0, 'D'],
		['genesys.pool.check.target.', 0, 'B'],
	]);
	await e2e.step('#85 GM edits the key, mode, characteristic, skill and value of changes, adds one and deletes one', () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.open('Hero');
			await effectSheet.edit('Hero');
			await effectSheet.submit('Hero');
		}),
	);
	e2e.expect(
		'#85 A2 the edited changes are saved, a Pool Modification without characteristic or skill with an empty subject',
		await gm.evaluate(() => window.sheetsE2E.effectSheet.changes('Hero')),
		editedChanges,
	);
	await e2e.step('#140 GM opens the effect sheet in French', () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.closeAll();
			await window.sheetsE2E.setLanguage('fr');
			await window.sheetsE2E.effectSheet.open('Bearer/Charm');
		}),
	);
	const french = await gm.evaluate(() => window.sheetsE2E.effectSheet.state('Bearer/Charm'));
	e2e.expect(
		"#140 A3 in French, the dice pool characteristic select shows the characteristics' French names sorted in French",
		french.charSelect,
		{
			options: ['Agilité', 'Intelligence', 'Présence', 'Ruse', 'Vigueur', 'Volonté'],
			values: ['agility', 'intellect', 'presence', 'cunning', 'brawn', 'willpower'],
			selected: 'willpower',
		},
	);
	e2e.expect(
		'#140 A4 in French, the key select lists the six characteristics in their order, then the vehicle characteristics',
		{ group: french.keyGroup, selected: french.keySelected },
		{
			group: keyGroup(
				'Caractéristique à modifier',
				['Vigueur', 'Agilité', 'Intelligence', 'Ruse', 'Volonté', 'Présence'],
				'Gabarit',
				['Vitesse', 'Maniabilité', 'Défense', 'Armure'],
			),
			selected: 'system.characteristics.cunning',
		},
	);
	await e2e.step("#85 GM edits, adds and deletes the changes of an item's effect", () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.edit('Bearer/Charm');
			await effectSheet.submit('Bearer/Charm');
		}),
	);
	e2e.expect(
		"#85 A3 the edited changes of an item's effect are saved",
		await gm.evaluate(() => window.sheetsE2E.effectSheet.changes('Bearer/Charm')),
		editedChanges,
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.closeAll();
		await window.sheetsE2E.setLanguage('en');
	});
}
