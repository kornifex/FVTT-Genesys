import type { SheetsContext } from './shared.ts';

export async function frenchCardsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	await e2e.step('#82 GM sends a passive and an active ability to chat in French, and creates a character without skills', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.closeAll();
			await sheets.setLanguage('fr');
			sheets.readMessages();
			await sheets.open('Nemesis');
			await sheets.sendToChat('Nemesis', 'Passive');
			await sheets.sendToChat('Nemesis', 'Active');
		}),
	);
	const frenchCards = await gm.evaluate(() => window.sheetsE2E.cards().map((card) => card.content.activation));
	const noSkills = await gm.evaluate(() => window.sheetsE2E.charactersSkillsEmptied('Skilless'));
	e2e.expect(
		"#82 A1 in French, the abilities' cards read Passif and Actif, and a character created without skills is notified",
		{ cards: frenchCards, noSkills, notification: await gm.evaluate(() => window.sheetsE2E.notification('compendium')) },
		{
			cards: ['Passif', 'Actif (Maneuver)'],
			noSkills: { skills: 0 },
			notification:
				"Le personnage a été créé sans compétence initiale, car le compendium de compétences configuré n'en contient aucune.",
		},
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.closeAll();
		await window.sheetsE2E.setLanguage('en');
	});
}
