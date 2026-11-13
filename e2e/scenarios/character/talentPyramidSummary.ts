import type { ScenarioContext } from '../../scenario.ts';
import { installCharacterHelpers, type Evaluate } from './shared.ts';

/** §#110: the Talent Pyramid summary under Ignore Talent Pyramid. */
export async function talentPyramidSummary(e2e: ScenarioContext, page: Evaluate) {
	const P = 'Pyramid';
	const pyramid = () => page((name) => window.characterE2E.pyramid(name), P);
	const talentsTop = async () => {
		await page((name) => window.e2e.showTab(name, 'talents'), P);
		return page((name) => window.characterE2E.talentsTop(name), P);
	};
	const counts = ['2/∞', '1/1', '0/0', '0/0', '0/0'];
	await e2e.step('#110 K1 a character with two tier 1 talents and one tier 2 talent, its sheet open', async () => {
		await page((name) => window.characterE2E.create(name), P);
		await page(
			(names) =>
				window.characterE2E.createItems(
					'Pyramid',
					names.map((name) => game.items.getName(`E2E ${name}`).toObject()),
				),
			['Quick', 'Swift', 'Bold'],
		);
		await page((name) => window.characterE2E.open(name), P);
	});
	e2e.expect('#110 K1 the Talents tab shows the tier counts and limits', await pyramid(), { summary: counts, roundedTop: false });
	// The open sheet keeps its summary until the reload Foundry asks for; the purchase checks read the new value at once.
	let reload = { reloadAsked: null as unknown, applied: false };
	await e2e.step('#110 K2 Ignore Talent Pyramid turned on in the game settings, with the sheet open', async () => {
		reload = await page(async (key) => {
			const app = game.settings.sheet;
			await window.e2e.render(app, () => app.form?.[key]);
			// Confirming the reload would reload every client and end the scenario: the step records the request instead.
			const settingsConfig = app.constructor;
			const reloadConfirm = settingsConfig.reloadConfirm;
			let asked: unknown = null;
			settingsConfig.reloadConfirm = async (options: unknown) => {
				asked = options;
			};
			// Only this setting is submitted: rewriting the others runs core onChanges, such as the performance mode's,
			// that need the canvas this scenario doesn't draw.
			for (const field of app.form.elements) field.disabled = field.name !== key;
			try {
				app.form[key].checked = true;
				await app.submit();
			} finally {
				settingsConfig.reloadConfirm = reloadConfirm;
			}
			await app.close();
			await window.e2e.settle();
			return { reloadAsked: asked, applied: CONFIG.genesys.settings.ignoreTalentPyramid as boolean };
		}, 'genesys.ignoreTalentPyramid');
	});
	e2e.expect('#110 K2 the game settings ask to reload every client', reload.reloadAsked, { world: true });
	e2e.expect('#110 K2 the purchase checks read the new value at once', reload.applied, true);
	await e2e.step('#110 K3 the sheet reopened', () => page((name) => window.characterE2E.reopen(name), P));
	e2e.expect(
		'#110 K3 under Ignore Talent Pyramid, the Talents tab shows no summary, and the block below takes its rounded top',
		await pyramid(),
		{
			summary: null,
			roundedTop: true,
		},
	);
	e2e.expect('#110 K3 the block below takes both rounded top corners, with no gap above it', await talentsTop(), {
		gapAbove: 0,
		roundedCorners: true,
	});
	await e2e.step('#110 K4 Ignore Talent Pyramid turned off and the sheet reopened', async () => {
		await page((rules) => window.e2e.setSettings(rules), { ignoreTalentPyramid: false });
		await page((name) => window.characterE2E.reopen(name), P);
	});
	e2e.expect('#110 K4 the summary is back with its counts and limits', await pyramid(), { summary: counts, roundedTop: false });

	// §#365: the reload the game settings ask for, as the GM confirms it: the page loads again, and the sheet with it.
	const changedAndReloaded = async (ignoreTalentPyramid: boolean) => {
		await page((rules) => window.e2e.setSettings(rules), { ignoreTalentPyramid });
		await e2e.gm.reload();
		await e2e.gm.evaluate(installCharacterHelpers);
		await page((name) => window.characterE2E.open(name), P);
	};
	await e2e.step('#110 K5 Ignore Talent Pyramid turned on with the sheet open, then the page reloaded and the sheet opened', async () => {
		await page((name) => window.characterE2E.open(name), P);
		await changedAndReloaded(true);
	});
	e2e.expect(
		'#110 K5 after the reload, the Talents tab shows no summary, and the block below takes its rounded top with no gap above it',
		{ summary: (await pyramid()).summary, ...(await talentsTop()) },
		{ summary: null, gapAbove: 0, roundedCorners: true },
	);
	await e2e.step('#110 K6 Ignore Talent Pyramid turned off with the sheet open, then the page reloaded and the sheet opened', () =>
		changedAndReloaded(false),
	);
	e2e.expect('#110 K6 after the reload, the Talents tab shows the summary again, with its counts and limits', await pyramid(), {
		summary: counts,
		roundedTop: false,
	});
	await page((name) => window.characterE2E.close(name), P);
}
