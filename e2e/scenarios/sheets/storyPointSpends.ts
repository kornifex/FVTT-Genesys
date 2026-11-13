import type { Client, ScenarioContext } from '../../scenario.ts';
import { installSheetsHelpers, type SheetsContext } from './shared.ts';

/**
 * §#335: a player's Story Point spend is written by the Acting GM, who renders its message: in the GM's language, and one
 * spend after the other when two players spend at once.
 */
async function storyPointSpends(e2e: ScenarioContext, player: Client) {
	const { gm } = e2e;
	const message = (client: Client) => client.evaluate(() => game.i18n.localize('Genesys.StoryPoints.ChatMessagePlayerPool'));
	// Setting the pools renders the GM's tracker alone.
	const setStoryPoints = async (points: { gm: number; player: number }, players: Client[]) => {
		await gm.evaluate((points) => window.sheetsE2E.setStoryPoints(points), points);
		for (const client of players) {
			await client.evaluate(async () => {
				await foundry.applications.instances.get('story-point-tracker')?.render(true);
				await window.e2e.settle();
			});
		}
	};
	const playerLanguage = (language: string) => async () => {
		await player.evaluate((language) => game.settings.set('core', 'language', language), language);
		await player.reload();
		await player.evaluate(installSheetsHelpers);
	};

	// The player plays in French, the GM in the world's language.
	const language = await player.evaluate(() => game.settings.get('core', 'language') as string);
	await e2e.step('#335 player reloads in French', playerLanguage('fr'));
	await setStoryPoints({ gm: 0, player: 1 }, [player]);
	await player.evaluate(() => window.sheetsE2E.storyPointLog());
	const languages = { gm: await message(gm), player: await message(player) };
	await e2e.step('#335 A1 player spends a Story Point, in French', () =>
		player.evaluate(() => window.sheetsE2E.clickStoryPoints('.player button.points')),
	);
	e2e.expect(
		"#335 A1 the message of a player's spend reads in the GM's language, not the player's",
		{
			languagesDiffer: languages.gm !== languages.player,
			pools: await player.evaluate(() => window.sheetsE2E.storyPoints()),
			...(await player.evaluate(() => window.sheetsE2E.storyPointLog())),
		},
		{ languagesDiffer: true, pools: { gm: 1, player: 0 }, writes: [gm.user], messages: [`${e2e.playerUser}: ${languages.gm}`] },
	);
	await e2e.step('#335 player reloads in their own language', playerLanguage(language));

	// Both players click at the same moment, by the clock their pages share.
	const second = await e2e.secondPlayer();
	await second.evaluate(installSheetsHelpers);
	await setStoryPoints({ gm: 0, player: 2 }, [player, second]);
	await player.evaluate(() => window.sheetsE2E.storyPointLog());
	const at = Date.now() + 1000;
	await e2e.step('#335 B1 two players spend a Story Point at once', () =>
		Promise.all(
			[player, second].map((client) =>
				client.evaluate(async (at) => {
					await window.e2e.sleep(at - Date.now());
					await window.sheetsE2E.clickStoryPoints('.player button.points');
				}, at),
			),
		),
	);
	const log = await player.evaluate(() => window.sheetsE2E.storyPointLog());
	e2e.expect(
		'#335 B1 two players spending at once move two points to the GM pool, each written by the GM, with a message from each',
		{ pools: await gm.evaluate(() => window.sheetsE2E.storyPoints()), writes: log.writes, messages: [...log.messages].sort() },
		{
			pools: { gm: 2, player: 0 },
			writes: [gm.user, gm.user],
			messages: [`${e2e.playerUser}: ${languages.gm}`, `${second.user}: ${languages.gm}`].sort(),
		},
	);
	await e2e.step('#335 second player leaves', () => second.leave());
}

export async function storyPointSpendsPart(
	ctx: SheetsContext,
	storyPoints: { gm: number; player: number },
	assistantGM: () => Promise<Client>,
) {
	const { e2e, gm, player, recordCompatibilityWarnings } = ctx;
	const assistant = await assistantGM();
	await gm.evaluate(() => window.sheetsE2E.setStoryPoints({ gm: 1, player: 2 }));
	// Setting the pools renders the GM's tracker alone.
	await player.evaluate(async () => {
		await foundry.applications.instances.get('story-point-tracker')?.render(true);
		await window.e2e.settle();
	});
	await player.evaluate(() => window.sheetsE2E.storyPointLog());
	const playerPoolMessage = await gm.evaluate(() => game.i18n.localize('Genesys.StoryPoints.ChatMessagePlayerPool'));
	await e2e.step('#250 player spends a Story Point, with a GM and an Assistant GM online', () =>
		player.evaluate(() => window.sheetsE2E.clickStoryPoints('.player button.points')),
	);
	e2e.expect(
		"#250 A1 with a GM and an Assistant GM online, a player's spend moves one point to the GM pool, written once by the GM, with one message from the player",
		{
			pools: await player.evaluate(() => window.sheetsE2E.storyPoints()),
			...(await player.evaluate(() => window.sheetsE2E.storyPointLog())),
		},
		{ pools: { gm: 2, player: 1 }, writes: [gm.user], messages: [`${e2e.playerUser}: ${playerPoolMessage}`] },
	);
	const noGMWarning = await player.evaluate(() => `warning: ${game.i18n.localize('Genesys.Notifications.NoGMForStoryPoint')}`);
	await e2e.step('#250 Assistant GM and GM leave', async () => {
		await assistant.leave();
		await gm.leave();
	});
	let refusal: string[] = [];
	await e2e.step('#250 player spends a Story Point, with no GM online', async () => {
		refusal = await player.evaluate(async () => {
			const notifications = window.e2e.recordNotifications();
			await window.sheetsE2E.clickStoryPoints('.player button.points');
			return notifications();
		});
	});
	e2e.expect(
		"#250 A2 with no GM online, a player's spend is refused with a warning, leaving the pools unchanged, with no message",
		{
			notifications: refusal,
			pools: await player.evaluate(() => window.sheetsE2E.storyPoints()),
			...(await player.evaluate(() => window.sheetsE2E.storyPointLog())),
		},
		{ notifications: [noGMWarning], pools: { gm: 2, player: 1 }, writes: [], messages: [] },
	);
	await e2e.step('#250 GM joins again', async () => {
		await gm.join();
		await gm.evaluate(installSheetsHelpers);
	});

	// §#412: a spend that reaches the Acting GM once the pool is empty is refused, and the player is told why. The
	// player's client sends the query as is, as one that hasn't seen the pool emptied yet.
	await gm.evaluate(() => window.sheetsE2E.setStoryPoints({ gm: 3, player: 0 }));
	let emptyPoolAnswer = '';
	await e2e.step('#412 player asks the Acting GM to spend a Story Point from the empty player pool', async () => {
		emptyPoolAnswer = await player.evaluate(() =>
			game.users.activeGM.query('genesys.spendStoryPoint', { userId: game.user.id }, { timeout: 10_000 }).then(
				() => 'written',
				(error: Error) => error.message,
			),
		);
	});
	e2e.expect(
		"#412 B1 the Acting GM refuses a player's spend from an empty pool, leaving the pools unchanged, with no message",
		{
			answer: emptyPoolAnswer,
			pools: await player.evaluate(() => window.sheetsE2E.storyPoints()),
			...(await player.evaluate(() => window.sheetsE2E.storyPointLog())),
		},
		{ answer: 'Genesys.Notifications.NotEnoughStoryPoints', pools: { gm: 3, player: 0 }, writes: [gm.user], messages: [] },
	);
	recordCompatibilityWarnings(gm);
	await storyPointSpends(e2e, player);

	// §#619: a click on a pool's count spends one of its points, for anyone who may spend from it, as before 0.6.0, and
	// nothing stands beside it: the GM's + of §#580 went after the table's test of 0.6.0-rc.1. The GM's right-click
	// opens the count for typing, which is how a point is added.
	await gm.evaluate(() => window.sheetsE2E.setStoryPoints({ gm: 2, player: 2 }));
	await player.evaluate(async () => {
		await foundry.applications.instances.get('story-point-tracker')?.render(true);
		await window.e2e.settle();
	});
	const spend = (pool: string) => ({ name: `${pool}: 2`, tooltip: 'Genesys.StoryPoints.Spend' });
	e2e.expect(
		"#619 A1 GM: each pool's count is a button named by its pool and count that spends a point, with no + beside it",
		await gm.evaluate(() => window.sheetsE2E.storyPointPools()),
		{
			gm: { shown: '2', spend: spend('GM Story Points'), beside: [] },
			player: { shown: '2', spend: spend('Player Story Points'), beside: [] },
		},
	);
	e2e.expect(
		"#619 A2 player: the players' count is a button that spends a point, the GM pool shows its count alone, and neither has a +",
		await player.evaluate(() => window.sheetsE2E.storyPointPools()),
		{
			gm: { shown: '2', spend: null, beside: [] },
			player: { shown: '2', spend: spend('Player Story Points'), beside: [] },
		},
	);
	await player.evaluate(() => window.sheetsE2E.storyPointLog());
	await e2e.step("#619 A3 player focuses the players' count and presses Enter", async () => {
		await player.evaluate(() => window.sheetsE2E.focusStoryPoints('player'));
		await player.page.keyboard.press('Enter');
	});
	e2e.expect(
		"#619 A3 a player spends a Story Point with Enter on the players' count, written once by the GM",
		{
			pools: await player.evaluate(() => window.sheetsE2E.storyPoints()),
			...(await player.evaluate(() => window.sheetsE2E.storyPointLog())),
		},
		{ pools: { gm: 3, player: 1 }, writes: [gm.user], messages: [`${e2e.playerUser}: ${playerPoolMessage}`] },
	);
	let opened = {};
	await e2e.step("#619 A4 GM right-clicks the players' count; the player right-clicks it", async () => {
		opened = {
			gm: await gm.evaluate(() => window.sheetsE2E.rightClickStoryPoints('player')),
			player: await player.evaluate(() => window.sheetsE2E.rightClickStoryPoints('player')),
		};
	});
	e2e.expect(
		"#619 A4 GM: a right-click opens the count for typing, spending nothing; a player's opens nothing",
		{ opened, afterRightClick: await gm.evaluate(() => window.sheetsE2E.storyPoints()) },
		{ opened: { gm: true, player: false }, afterRightClick: { gm: 3, player: 1 } },
	);
	await e2e.step("#580 C5 GM clicks the GM pool's count twice, then the players' count, before the tracker renders again", () =>
		gm.evaluate(() => window.sheetsE2E.clickStoryPointsTogether(['.gm button.points', '.gm button.points', '.player button.points'])),
	);
	e2e.expect(
		'#580 C5 GM: three spends before the tracker renders all count, each from the pools the previous one wrote',
		await gm.evaluate(() => window.sheetsE2E.storyPoints()),
		{ gm: 2, player: 2 },
	);

	// §#343: a context menu left open on a sheet that closes.
	await gm.evaluate(async () => {
		await window.sheetsE2E.open('Bearer');
		await window.sheetsE2E.clickTab('Bearer', 'skills');
	});
	let blocked: boolean | undefined;
	await e2e.step('#343 GM opens the context menu of a skill, closes the sheet, then clicks the page', async () => {
		blocked = await gm.evaluate(() => window.sheetsE2E.clickAfterClosingMenu('Bearer', '.tab-skills .skill.menu-container'));
	});
	e2e.expect('#343 A2 GM: a context menu left open on a closed sheet lets the next click through', blocked, false);

	await gm.evaluate((points) => window.sheetsE2E.setStoryPoints(points), storyPoints);
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
