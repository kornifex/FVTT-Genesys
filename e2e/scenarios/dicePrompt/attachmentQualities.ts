import type { PromptState, DicePromptContext } from './shared.ts';

export async function attachmentQualitiesPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, roll, update, attack } = ctx;
	// The world's qualities: Superior, unrated, with one Boost on combat checks; Pierce, rated, without effects. Ada's
	// Carbine holds Pierce 2 on its main profile, and has a second profile without qualities.
	await gm.evaluate(async () => {
		await Item.createDocuments([
			{
				name: 'E2E Superior',
				type: 'quality',
				system: { isRated: false },
				effects: [
					{ name: 'E2E Superior', system: { changes: [{ key: 'genesys.pool.combat.self.', value: 'B', type: 'custom' }] } },
				],
			},
			{ name: 'E2E Pierce', type: 'quality', system: { isRated: true } },
			{ name: 'E2E Customization', type: 'attachment', system: { hardPointsRequired: 1 } },
		]);
		await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
			{
				name: 'E2E Carbine',
				type: 'weapon',
				system: {
					skills: ['Melee'],
					range: 'engaged',
					state: 'equipped',
					baseDamage: 5,
					critical: 3,
					encumbrance: 2,
					qualities: [{ id: 'carbinePierce', name: 'E2E Pierce', isRated: true, rating: 2 }],
					extraProfiles: [{ name: 'E2E Stock', baseDamage: 2, critical: 4 }],
				},
			},
		]);
	});
	// Drops a world item on the sheet of another, a world item or one of Ada's.
	const drop = (dropped: string, target: { world: string } | { ada: string }) => () =>
		gm.evaluate(
			async (args) => {
				const item =
					'world' in args.target
						? game.items.getName(`E2E ${args.target.world}`)
						: game.actors.getName('E2E Ada').items.getName(`E2E ${args.target.ada}`);
				const root = await window.e2e.render(item.sheet, (root) => root.querySelector('.window-content'));
				window.e2e.drop(root.querySelector('.window-content')!, {
					type: 'Item',
					uuid: game.items.getName(`E2E ${args.dropped}`).uuid,
				});
				await window.e2e.settle();
			},
			{ dropped, target },
		);
	// An item's qualities on each of its profiles, as its sheet lists them, and its effects, each with whether it is tagged
	// with one of its qualities.
	const itemState = (target: { world: string } | { ada: string }) =>
		gm.evaluate((target) => {
			const item =
				'world' in target
					? game.items.getName(`E2E ${target.world}`)
					: game.actors.getName('E2E Ada').items.getName(`E2E ${target.ada}`);
			type Quality = { id: string; name: string; isRated: boolean; rating: number };
			const profiles: { qualities: Quality[] }[] = [item.system, ...(item.system.extraProfiles ?? [])];
			const ids = profiles.flatMap((profile) => profile.qualities.map((quality) => quality.id));
			return {
				qualities: profiles.map((profile) =>
					profile.qualities.map((quality) => (quality.isRated ? `${quality.name} ${quality.rating}` : quality.name)),
				),
				effects: item.effects
					.map((effect: { name: string; flags: { genesys?: { quality?: string } } }) => ({
						name: effect.name,
						tagged: ids.includes(effect.flags.genesys?.quality ?? ''),
					}))
					.sort((left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name, 'en')),
			};
		}, target);
	const superiorRows = (state: PromptState) => state.modifications.filter(({ name }) => name.includes('Superior'));
	const carbine = { ada: 'Carbine' };

	await e2e.step('#927 K1 GM drops Superior and Pierce on the Customization, an attachment', async () => {
		await drop('Superior', { world: 'Customization' })();
		await drop('Pierce', { world: 'Customization' })();
	});
	e2e.expect(
		"#927 K1 the Customization's sheet lists its qualities, and Superior's effect becomes the Customization's",
		{
			state: await itemState({ world: 'Customization' }),
			sheet: await gm.evaluate(() =>
				[...(window.e2e.htmlOf(game.items.getName('E2E Customization').sheet)?.querySelectorAll('.quality .data-rated') ?? [])].map(
					(row) => row.textContent?.trim(),
				),
			),
		},
		{
			state: { qualities: [['E2E Superior', 'E2E Pierce 1']], effects: [{ name: 'E2E Superior', tagged: true }] },
			sheet: ['E2E Superior', 'E2E Pierce'],
		},
	);

	await e2e.step("#927 K2 GM drops the Customization on Ada's Carbine, which holds Pierce 2", drop('Customization', carbine));
	e2e.expect(
		'#927 K2 every profile of the Carbine gains Superior with its effect; Pierce 2 becomes Pierce 3, and the profile without Pierce gains Pierce 1',
		{ state: await itemState(carbine), attack: superiorRows(await opened(gm, attack('Carbine'))) },
		{
			state: {
				qualities: [
					['E2E Pierce 3', 'E2E Superior'],
					['E2E Superior', 'E2E Pierce 1'],
				],
				effects: [
					{ name: 'E2E Superior', tagged: true },
					{ name: 'E2E Superior', tagged: true },
				],
			},
			attack: [{ name: 'From Self: E2E Superior (E2E Carbine)', enabled: false, mods: 'B+' }],
		},
	);
	await e2e.step('#927 K3 GM rolls an attack with the Carbine', roll);
	e2e.expect(
		"#927 K3 the attack card shows the qualities the Customization gave the Carbine's profile",
		(await gm.evaluate(() => window.dicePromptE2E.lastCard())).qualities.map(({ text }: { text: string }) => text),
		['E2E Pierce 3', 'E2E Superior'],
	);

	await e2e.step("#927 K4 GM drops a second Customization on Ada's Carbine", drop('Customization', carbine));
	e2e.expect('#927 K4 the same attachment installed twice raises Pierce twice, and adds Superior once', await itemState(carbine), {
		qualities: [
			['E2E Pierce 4', 'E2E Superior'],
			['E2E Superior', 'E2E Pierce 2'],
		],
		effects: [
			{ name: 'E2E Superior', tagged: true },
			{ name: 'E2E Superior', tagged: true },
		],
	});

	await e2e.step("#927 K5 GM removes the first Customization from Ada's Carbine", () =>
		gm.evaluate(async () => {
			const item = game.actors.getName('E2E Ada').items.getName('E2E Carbine');
			await item.update({ 'system.attachments': item.system.attachments.slice(1) });
			await window.e2e.settle();
		}),
	);
	e2e.expect('#927 K5 removing one of the two takes back one rating, and Superior stays with the other', await itemState(carbine), {
		qualities: [
			['E2E Pierce 3', 'E2E Superior'],
			['E2E Superior', 'E2E Pierce 1'],
		],
		effects: [
			{ name: 'E2E Superior', tagged: true },
			{ name: 'E2E Superior', tagged: true },
		],
	});

	await e2e.step("#927 K6 GM removes the other Customization from Ada's Carbine", () =>
		update({ actor: 'Ada', item: 'Carbine' }, { 'system.attachments': [] }),
	);
	e2e.expect(
		'#927 K6 removing the last takes back what it added: Pierce 2, held before, stays; the qualities it brought go with their effects',
		{ state: await itemState(carbine), attack: superiorRows(await opened(gm, attack('Carbine'))) },
		{ state: { qualities: [['E2E Pierce 2'], []], effects: [] }, attack: [] },
	);
	await e2e.step('attachmentQualities end');
}
