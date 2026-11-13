import type { DicePromptContext } from './shared.ts';

export async function qualityAttachmentDescriptionsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, attack } = ctx;
	// A Lance holding a quality with a description, an attachment with none, and an effect written on it, each adding a
	// Boost to its attacks.
	await gm.evaluate(async () => {
		const { CUSTOM } = CONST.ACTIVE_EFFECT_MODES;
		const boost = [{ key: 'genesys.pool.combat.self.', value: 'B', mode: CUSTOM }];
		await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
			{
				name: 'E2E Lance',
				type: 'weapon',
				system: {
					skills: ['Melee'],
					range: 'engaged',
					state: 'equipped',
					baseDamage: 5,
					qualities: [
						{
							id: 'lanceq',
							name: 'Keen',
							description: 'Cuts deep.',
							activation: 'passive',
							advantageCost: 2,
							isRated: false,
							rating: 1,
						},
					],
					attachments: [{ id: 'lancea', name: 'Enchanted', description: '', hardPointsRequired: 1 }],
				},
				effects: [
					{ name: 'E2E Keen', changes: boost, flags: { genesys: { quality: 'lanceq' } } },
					{ name: 'E2E Enchanted', changes: boost, flags: { genesys: { attachment: 'lancea' } } },
					{ name: 'E2E Mounted', changes: boost },
				],
			},
		]);
	});
	await opened(gm, attack('Lance'));
	const rows = await gm.evaluate(() => window.dicePromptE2E.promptSourceLinks());
	e2e.expect(
		"#768 D1 a quality's and an attachment's rows have no link, the effect written on the weapon links to it",
		rows
			.filter(({ name }) => name.includes('E2E Lance'))
			.map(({ name, link }) => ({ name, link: link ? link.text : null }))
			.sort((left, right) => left.name.localeCompare(right.name, 'en')),
		[
			{ name: 'From Self: E2E Enchanted (E2E Lance)', link: null },
			{ name: 'From Self: E2E Keen (E2E Lance)', link: null },
			{ name: 'From Self: E2E Mounted (E2E Lance)', link: 'E2E Mounted (E2E Lance)' },
		],
	);

	// What hovering a row's name with the mouse shows as a tooltip.
	const hovered = async (name: string) => {
		await gm.page.locator('.dice-prompt .pool-modifications-effects', { hasText: name }).locator('.effect-name > div').hover();
		const text = await gm.evaluate(async () => {
			await window.e2e.waitFor('the tooltip', () => game.tooltip.tooltip.textContent.trim() !== '');
			return game.tooltip.tooltip.textContent.trim();
		});
		await gm.page.mouse.move(0, 0);
		return text;
	};
	e2e.expect(
		"#768 D2 hovering a quality's row shows its description, an attachment's without one shows that it has none",
		[await hovered('E2E Keen'), await hovered('E2E Enchanted')],
		['Cuts deep.', 'No Description Available'],
	);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
}
