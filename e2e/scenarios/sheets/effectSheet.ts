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
			await waitFor('the effect sheet', () => effectSheet.rendered && htmlOf(effectSheet)?.querySelector('[name$="changes.0.key"]'));
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
			group: keyGroup('Modify Characteristic', ['Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence'], 'Silhouette', [
				'Speed',
				'Handling',
				'Defense',
				'Armor',
			]),
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
				'genesys.pool.combat.target=🎯 Combat Check',
				'genesys.pool.melee.target=🎯 Melee Attack',
				'genesys.pool.ranged.target=🎯 Ranged Attack',
			],
		},
		{
			label: 'Modify Critical Injuries',
			options: ['genesys.critical.inflicted=🎯 Inflicted on Others', 'genesys.critical.suffered=👇 Suffered'],
		},
		{
			label: 'Modify Healing',
			options: ['genesys.healing.wounds=👇 Wounds Healed by a Medicine Check'],
		},
		{
			label: 'Modify Attacks',
			options: [
				'genesys.attack.damage.combat=👇 Damage: Combat Check',
				'genesys.attack.damage.melee=👇 Damage: Melee Attack',
				'genesys.attack.damage.ranged=👇 Damage: Ranged Attack',
				'genesys.attack.critical.combat=👇 Critical: Combat Check',
				'genesys.attack.critical.melee=👇 Critical: Melee Attack',
				'genesys.attack.critical.ranged=👇 Critical: Ranged Attack',
			],
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

	// v14 parses a value that holds JSON. #294: the sheet gives a Pool Modification its own type, which the system
	// registers, in place of the custom type it was set up with.
	const POOL = 'genesys.poolModification';
	const asStored = (changes: [string, string, string][]): ChangeRow[] =>
		changes.map(([key, type, value]) => [key, type, /^\d+$/.test(value) ? Number(value) : value]);
	const savedChanges = asStored([
		['system.characteristics.cunning', 'add', '1'],
		['genesys.pool.char.self.willpower', POOL, 'B'],
		['genesys.pool.check.self.', POOL, 'S'],
		['genesys.pool.skill.self.E2E Custom Skill', POOL, 'A'],
		['genesys.pool.skill.target.ranged (light)', POOL, 'D'],
		['genesys.pool.check.target.', POOL, ''],
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
		['system.characteristics.presence', 'override', '1'],
		['genesys.pool.char.self.presence', POOL, 'B'],
		['genesys.pool.check.self.', POOL, 'SS'],
		['genesys.pool.skill.self.Cool', POOL, 'A'],
		['genesys.pool.skill.target.ranged (light)', POOL, 'D'],
		['genesys.pool.check.target.', POOL, 'B'],
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
	await e2e.step('#832 GM types 10 as the value of a change to the Critical Injuries the actor suffers', () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.setChange('Hero', 5, 'genesys.critical.suffered', '10');
			await effectSheet.submit('Hero');
		}),
	);
	e2e.expect(
		'#832 A1 the value of a change to Critical Injury rolls is saved, though v14 parses it as a number',
		(await gm.evaluate(() => window.sheetsE2E.effectSheet.changes('Hero')))[5],
		['genesys.critical.suffered', 'custom', '10'],
	);
	await e2e.step('#895 GM picks the Combat Check that targets the actor as the key of a change, upgrading the difficulty', () =>
		gm.evaluate(async () => {
			const effectSheet = window.sheetsE2E.effectSheet;
			await effectSheet.setChange('Hero', 5, 'genesys.pool.combat.target', '*');
			await effectSheet.submit('Hero');
		}),
	);
	e2e.expect(
		'#895 A1 a change to the combat checks that target the actor is saved as a Pool Modification',
		(await gm.evaluate(() => window.sheetsE2E.effectSheet.changes('Hero')))[5],
		['genesys.pool.combat.target.', POOL, '*'],
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
