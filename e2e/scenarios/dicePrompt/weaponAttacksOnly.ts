import type { DicePromptContext, PromptState } from './shared.ts';

export async function weaponAttacksOnlyPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, attack, skillRoll } = ctx;
	// A Halberd with two effects of its own, each adding a Boost to Melee checks: Reach as any item's, Heft to be kept to
	// the Halberd's attacks; a quality of the Halberd, and a Coat with an effect, whose sheets don't offer the option.
	await gm.evaluate(async () => {
		const meleeBoost = { changes: [{ key: 'genesys.pool.skill.self.Melee', value: 'B', type: 'genesys.poolModification' }] };
		await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
			{
				name: 'E2E Halberd',
				type: 'weapon',
				system: {
					skills: ['Melee'],
					range: 'engaged',
					state: 'equipped',
					baseDamage: 5,
					qualities: [
						{ id: 'halbq', name: 'Keen', description: '', activation: 'passive', advantageCost: 2, isRated: false, rating: 1 },
					],
				},
				effects: [
					{ name: 'E2E Reach', system: meleeBoost },
					{ name: 'E2E Heft', system: meleeBoost },
					{ name: 'E2E Keen', system: meleeBoost, flags: { genesys: { quality: 'halbq' } } },
				],
			},
			{ name: 'E2E Gambeson', type: 'armor', system: { state: 'equipped', soak: 1 }, effects: [{ name: 'E2E Padding' }] },
		]);
	});
	// Whether the Changes tab of an effect's sheet offers the option, and whether it is checked.
	const option = (item: string, effect: string) =>
		gm.evaluate(
			async (args) => {
				const sheet = game.actors.getName('E2E Ada').items.getName(args.item).effects.getName(args.effect).sheet;
				const root = await window.e2e.render(sheet, (root) => root.querySelector('[data-tab="changes"]'));
				const input = root.querySelector<HTMLInputElement>('input[name="flags.genesys.weaponAttacksOnly"]');
				const label = input && root.querySelector(`label[for="${input.id}"]`)?.textContent?.trim();
				await sheet.close();
				return input ? { label, checked: input.checked } : null;
			},
			{ item, effect },
		);
	e2e.expect(
		"#929 W1 the sheet of a weapon's own effect offers the option, off; that of its quality's effect and of an armor's effect don't",
		{
			own: await option('E2E Halberd', 'E2E Heft'),
			quality: await option('E2E Halberd', 'E2E Keen'),
			armor: await option('E2E Gambeson', 'E2E Padding'),
		},
		{ own: { label: "This weapon's attacks only", checked: false }, quality: null, armor: null },
	);

	await e2e.step("#929 W2 GM checks the option on the sheet of the Halberd's Heft and saves it", () =>
		gm.evaluate(async () => {
			const { render, settle } = window.e2e;
			const sheet = game.actors.getName('E2E Ada').items.getName('E2E Halberd').effects.getName('E2E Heft').sheet;
			const root = await render(sheet, (root) => root.querySelector('input[name="flags.genesys.weaponAttacksOnly"]'));
			const input = root.querySelector<HTMLInputElement>('input[name="flags.genesys.weaponAttacksOnly"]')!;
			input.checked = true;
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			await sheet.submit();
			await sheet.close();
			await settle();
		}),
	);
	const halberdRows = (state: PromptState) =>
		state.modifications
			.filter(({ name }) => name.endsWith('(E2E Halberd)'))
			.map(({ name }) => name)
			.sort((left, right) => left.localeCompare(right, 'en'));
	e2e.expect(
		"#929 W2 Heft adds its Boost to the Halberd's attacks only; Reach, unscoped, to every Melee check, as before",
		{
			stored: await option('E2E Halberd', 'E2E Heft'),
			halberd: halberdRows(await opened(gm, attack('Halberd'))),
			club: halberdRows(await opened(gm, attack('Club'))),
			melee: halberdRows(await opened(gm, skillRoll('Melee'))),
		},
		{
			stored: { label: "This weapon's attacks only", checked: true },
			halberd: ['From Self: E2E Heft (E2E Halberd)', 'From Self: E2E Keen (E2E Halberd)', 'From Self: E2E Reach (E2E Halberd)'],
			club: ['From Self: E2E Reach (E2E Halberd)'],
			melee: ['From Self: E2E Reach (E2E Halberd)'],
		},
	);

	// The Halberd's Boosts would change the Melee checks of the parts after this one.
	await gm.evaluate(async () => {
		const ada = game.actors.getName('E2E Ada');
		await ada.deleteEmbeddedDocuments(
			'Item',
			['E2E Halberd', 'E2E Gambeson'].map((name) => ada.items.getName(name).id),
		);
	});
	await e2e.step('weaponAttacksOnly end');
}
