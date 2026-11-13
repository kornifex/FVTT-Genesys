import type { Client } from '../../scenario.ts';
import type { DicePromptContext } from './shared.ts';

export async function modificationLinksPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, update, target, attack, seekerCheck } = ctx;
	const sourceLinks = (client: Client) => client.evaluate(() => window.dicePromptE2E.promptSourceLinks());
	const sourceLink = (text: string, opens: string, type: 'item' | 'effect') => ({
		text,
		tooltip: `Open E2E ${opens}`,
		icon: type === 'item' ? 'fa-solid fa-suitcase' : 'fa-solid fa-person-rays',
		cursor: 'pointer',
	});
	const seekerRows = (shade: ReturnType<typeof sourceLink> | null) => [
		{ name: 'From Self: E2E Grit', link: sourceLink('E2E Grit', 'Grit', 'effect') },
		{ name: 'From Self: E2E Fate (E2E Quick Draw)', link: sourceLink('E2E Fate (E2E Quick Draw)', 'Quick Draw', 'item') },
		{ name: 'From Self: E2E Lens', link: sourceLink('E2E Lens', 'Lens', 'item') },
		{ name: 'From Target: E2E Haze (E2E Shade)', link: shade },
	];
	await player.evaluate((name) => window.e2e.target(name), 'Veiled');
	await seekerCheck(player);
	e2e.expect(
		"#495 S1 as a player, the rows link the actor's talent, equipment and effect, name the talent after its effect, and leave the target's talent unlinked",
		await sourceLinks(player),
		seekerRows(null),
	);
	await player.evaluate(() => window.dicePromptE2E.closePrompts());
	await player.evaluate(() => window.e2e.target(null));
	await target('Veiled');
	await seekerCheck(gm);
	e2e.expect(
		"#495 S2 as the GM, the target's talent is linked too",
		await sourceLinks(gm),
		seekerRows(sourceLink('E2E Haze (E2E Shade)', 'Shade', 'item')),
	);
	const openedSources: Record<string, unknown> = {};
	for (const name of ['E2E Fate', 'E2E Grit', 'E2E Haze']) {
		openedSources[name] = await gm.evaluate((name) => window.dicePromptE2E.openPromptSource(name), name);
		await gm.evaluate(() => window.e2e.closeSetUp());
	}
	const openedSource = (type: string, name: string) => ({ opened: { type, name }, prompts: 1, enabled: false });
	e2e.expect(
		"#495 S3 a click on a link opens the talent's sheet, the effect's sheet or the target's talent's sheet, and leaves the prompt open and the row off",
		openedSources,
		{
			'E2E Fate': openedSource('Item', 'Quick Draw'),
			'E2E Grit': openedSource('ActiveEffect', 'Grit'),
			'E2E Haze': openedSource('Item', 'Shade'),
		},
	);
	await target('Rival');
	await update({ actor: 'Rival' }, { 'system.defense': { melee: 1, ranged: 1 } });
	await opened(gm, attack('Pistol'));
	e2e.expect(
		"#495 S4 the target's defense has no link, even for the GM",
		(await sourceLinks(gm)).filter(({ name }) => name.endsWith('Defense')),
		[{ name: 'From Target: Ranged Defense', link: null }],
	);
	await target(null);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await player.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('S end');
}
