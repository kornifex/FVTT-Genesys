import { installSheetsHelpers, type SheetsContext } from './shared.ts';



export async function welcomePart(ctx: Pick<SheetsContext, 'e2e' | 'gm'>) {
	const { e2e, gm } = ctx;
	await e2e.step('#97 GM reloads after an update', async () => {
		await gm.evaluate(() => game.settings.set('genesys', 'alphaVersion', '0.0.0'));
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	e2e.expect(
		"#97 A1 the welcome message's Project Documentation link opens the fork's wiki",
		await gm.evaluate(() => window.sheetsE2E.welcomeLink()),
		'https://github.com/kornifex/FVTT-Genesys/wiki',
	);
	// §#506: the welcome message's summary of the changes ends with a link to all of them, in the running version's
	// GitHub Release.
	const version = await gm.evaluate(() => game.system.version);
	e2e.expect(
		"#506 A1 the welcome message's release notes link opens the running version's GitHub Release",
		await gm.evaluate(() => window.sheetsE2E.welcomeReleaseNotes()),
		{ href: `https://github.com/kornifex/FVTT-Genesys/releases/tag/v${version}`, text: `All the changes of ${version}` },
	);

	// §#347: the welcome shows for a version newer than the last one welcomed only. A GM back on an older version, as
	// after a downgrade, isn't welcomed again.
	const welcomes = await gm.evaluate(() => window.sheetsE2E.welcomeCount());
	await e2e.step('#347 GM reloads on a version older than the last one welcomed', async () => {
		await gm.evaluate(() => game.settings.set('genesys', 'alphaVersion', '99.0.0'));
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	e2e.expect(
		'#347 A1 a GM back on an older version is not welcomed again',
		(await gm.evaluate(() => window.sheetsE2E.welcomeCount())) - welcomes,
		0,
	);

	// §#348: the welcome message is written in the language of the GM, from the language files.
	const language = await gm.evaluate(() => game.settings.get('core', 'language'));
	await e2e.step('#348 A2 GM reloads in French after an update', async () => {
		await gm.evaluate(async () => {
			await game.settings.set('core', 'language', 'fr');
			await game.settings.set('genesys', 'alphaVersion', '0.0.0');
		});
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	e2e.expect(
		"#348 A2 in French, the welcome message's documentation link reads Documentation du projet",
		await gm.evaluate(() => window.sheetsE2E.welcomeDocumentationText()),
		'Documentation du projet',
	);
	e2e.expect(
		"#506 A2 in French, the welcome message's release notes link reads Tous les changements de la",
		(await gm.evaluate(() => window.sheetsE2E.welcomeReleaseNotes()))?.text,
		`Tous les changements de la ${version}`,
	);
	await e2e.step('GM reloads in their own language', async () => {
		await gm.evaluate((language) => game.settings.set('core', 'language', language), language);
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	await gm.evaluate(() => game.settings.set('genesys', 'alphaVersion', game.system.version));
}
