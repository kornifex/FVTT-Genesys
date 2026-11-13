import type { SheetsContext } from './shared.ts';

export async function createdDocumentsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	for (const documentName of ['Actor', 'Item'] as const) {
		const { position, asked, types, declaredTypes, groups, warnings } = await gm.evaluate(
			(name) => window.sheetsE2E.createDialog(name),
			documentName,
		);
		e2e.expect(
			`#262 A1 the ${documentName} directory's create dialog opens where the directory asks, lists every type ungrouped, and logs no createDialog warning`,
			{ position, types, groups, warnings },
			{ position: asked, types: declaredTypes, groups: 0, warnings: [] },
		);
	}

	// §#258: with no template.json, a field's initial is the only default Foundry gives a created document.
	const blank = { gender: '', age: '', height: '', build: '', hair: '', eyes: '', notableFeatures: '' };
	e2e.expect(
		'#258 A1 an actor or an item created with no system data stores the defaults template.json gave, an item outside any Container',
		await gm.evaluate(() => window.sheetsE2E.emptyDefaults()),
		{
			character: { illustration: 'icons/svg/mystery-man.svg', details: blank },
			vehicle: { illustration: 'icons/svg/mystery-man.svg', complement: '', consumables: '' },
			containers: Object.fromEntries(
				['armor', 'consumable', 'container', 'gear', 'weapon', 'vehicleWeapon'].map((type) => [type, ['', '']]),
			),
			activationDetail: { ability: '', talent: '' },
		},
	);

	// §#97: the Default Difficulty setting's hint.
	e2e.expect(
		"#97 A2 the Default Difficulty hint links to the fork's wiki page of the glyphs",
		await gm.evaluate(() => window.sheetsE2E.settingsHintLink()),
		'https://github.com/kornifex/FVTT-Genesys/wiki/Dice-Pool-Modification-Glyphs',
	);
}
