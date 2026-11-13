import type { SheetsContext } from './shared.ts';



export async function promptsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	await gm.evaluate(() => window.sheetsE2E.open('Hero'));
	await e2e.step('#95 GM opens the dice prompt with /gendr and the award XP prompt from the journal', async () => {
		await gm.evaluate(() => ui.chat.processMessage('/gendr'));
		await gm.evaluate(() => window.sheetsE2E.clickTab('Hero', 'journal'));
		await gm.evaluate(() => window.sheetsE2E.click('Hero', '.xp-journal .columns button'));
	});
	e2e.expect(
		'#95 A4 every prompt and the story point tracker is an ApplicationV2 window',
		await gm.evaluate(() => ({
			dicePrompt: window.sheetsE2E.prompts('app-dice-prompt'),
			awardXP: window.sheetsE2E.prompts('app-award-xp-prompt'),
			storyPointTracker:
				foundry.applications.instances.get('story-point-tracker') instanceof foundry.applications.api.ApplicationV2,
		})),
		{
			dicePrompt: [{ appV2: true, title: 'Dice Pool' }],
			awardXP: [{ appV2: true, title: 'Rewards' }],
			storyPointTracker: true,
		},
	);
	await gm.evaluate(() => window.sheetsE2E.closePrompts('app-dice-prompt'));

	// Enter in a prompt answers it (§#581), with no native form submission, which would reload the page. The prompt is
	// opened apart from the journal, so that its answer of 0 XP writes no entry.
	await gm.evaluate(() => window.sheetsE2E.openDetachedAwardXP());
	await gm.evaluate(() => {
		(window as unknown as { e2eMarker: boolean }).e2eMarker = true;
	});
	await gm.page.focus('.app-award-xp-prompt .amount input');
	await e2e.step('#95 GM presses Enter in the award XP prompt', () => gm.page.keyboard.press('Enter'));
	e2e.expect(
		'#95 A5 Enter in a prompt submits no native form, and answers the prompt with what it shows',
		{
			nativeSubmit: !(await gm.evaluate(() => (window as unknown as { e2eMarker?: boolean }).e2eMarker ?? false)),
			...(await gm.evaluate(() => window.sheetsE2E.detachedAwardXP())),
		},
		{ nativeSubmit: false, answer: { amount: 0, reason: '' }, open: 0 },
	);
	await gm.evaluate(() => window.sheetsE2E.click('Hero', '.xp-journal .columns button'));
	e2e.expect('#95 A6 a prompt resolves when it starts closing', await gm.evaluate(() => window.sheetsE2E.promptResolution()), {
		resolved: true,
		value: null,
		elementStillShown: true,
	});

	// Render hooks.
	e2e.expect(
		'#95 A7 an actor sheet fires the AppV2 render hooks with an element, not renderActorSheet',
		await gm.evaluate(() => window.sheetsE2E.renderHooks('Hero')),
		{
			fired: [
				'renderApplicationV2',
				'renderDocumentSheetV2',
				'renderActorSheetV2',
				'renderGenesysActorSheet',
				'renderCharacterSheet',
			],
			htmlIsElement: true,
		},
	);
	e2e.expect(
		'#95 A8 an item sheet fires the AppV2 render hooks with an element, not renderItemSheet',
		await gm.evaluate(() => window.sheetsE2E.renderHooks('gear')),
		{ fired: ['renderApplicationV2', 'renderDocumentSheetV2', 'renderItemSheetV2', 'renderGenesysItemSheet'], htmlIsElement: true },
	);
}
