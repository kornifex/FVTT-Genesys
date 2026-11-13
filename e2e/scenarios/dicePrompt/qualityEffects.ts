import type { PromptState, DicePromptContext } from './shared.ts';

export async function qualityEffectsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, setSetting, update, attack } = ctx;
	// The world's qualities, each with one effect: Accurate as one Boost on combat checks, Defensive as melee defense 1.
	await gm.evaluate(async () => {
		const { ADD, CUSTOM } = CONST.ACTIVE_EFFECT_MODES;
		const quality = (name: string, change: { key: string; value: string; mode: number }) => ({
			name: `E2E ${name}`,
			type: 'quality',
			system: { isRated: true },
			effects: [{ name: `E2E ${name}`, changes: [change] }],
		});
		await Item.createDocuments([
			quality('Accurate', { key: 'genesys.pool.combat.self.', value: 'B', mode: CUSTOM }),
			quality('Defensive', { key: 'system.defense.melee', value: '1', mode: ADD }),
		]);
		await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
			{ name: 'E2E Sword', type: 'weapon', system: { skills: ['Melee'], range: 'engaged', state: 'equipped', baseDamage: 5 } },
			{ name: 'E2E Shield', type: 'weapon', system: { skills: ['Melee'], range: 'engaged', state: 'carried', baseDamage: 2 } },
		]);
	});
	// Drops a world quality on the sheet of one of Ada's weapons.
	const dropQuality = (quality: string, weapon: string) => () =>
		gm.evaluate(
			async (args) => {
				const item = game.actors.getName('E2E Ada').items.getName(`E2E ${args.weapon}`);
				const root = await window.e2e.render(item.sheet, (root) => root.querySelector('.window-content'));
				window.e2e.drop(root.querySelector('.window-content')!, {
					type: 'Item',
					uuid: game.items.getName(`E2E ${args.quality}`).uuid,
				});
				await window.e2e.settle();
			},
			{ quality, weapon },
		);
	// A weapon of Ada's: its qualities, and its effects, each with whether it is tagged with one of its qualities.
	const weaponState = (weapon: string) =>
		gm.evaluate((weapon) => {
			const item = game.actors.getName('E2E Ada').items.getName(`E2E ${weapon}`);
			const ids = item.system.qualities.map((quality: { id: string }) => quality.id);
			return {
				qualities: item.system.qualities.map(
					(quality: { name: string; rating: number; activation: string; advantageCost: number }) =>
						`${quality.name} ${quality.rating} (${quality.activation}, ${quality.advantageCost})`,
				),
				effects: item.effects.map((effect: { name: string; flags: { genesys?: { quality?: string } } }) => ({
					name: effect.name,
					tagged: ids.includes(effect.flags.genesys?.quality),
				})),
			};
		}, weapon);
	const accurateRows = (state: PromptState) => state.modifications.filter(({ name }) => name.includes('Accurate'));
	const meleeDefense = () => gm.evaluate(() => game.actors.getName('E2E Ada').system.totalDefense.melee);

	await e2e.step("#694 Q1 GM drops Accurate twice on Ada's Sword", async () => {
		await dropQuality('Accurate', 'Sword')();
		await dropQuality('Accurate', 'Sword')();
	});
	const sword = await opened(gm, attack('Sword'));
	const pistol = await opened(gm, attack('Pistol'));
	e2e.expect(
		"#694 Q1 Accurate 2, its one Boost written in the quality, lists two Boosts on the Sword's attacks and none on the Pistol's",
		{ weapon: await weaponState('Sword'), sword: accurateRows(sword), pistol: accurateRows(pistol) },
		{
			weapon: { qualities: ['E2E Accurate 2 (passive, 2)'], effects: [{ name: 'E2E Accurate', tagged: true }] },
			sword: [{ name: 'From Self: E2E Accurate (E2E Sword)', enabled: false, mods: 'B+ B+' }],
			pistol: [],
		},
	);

	await e2e.step("#694 Q2 GM drops Defensive on Ada's carried Shield", dropQuality('Defensive', 'Shield'));
	const carried = await meleeDefense();
	await update({ actor: 'Ada', item: 'Shield' }, { 'system.state': 'equipped' });
	e2e.expect(
		'#694 Q2 a shield with Defensive 1 raises the melee defense while equipped, not while carried',
		{ carried, equipped: await meleeDefense() },
		{ carried: 0, equipped: 1 },
	);

	await e2e.step("#694 Q3 GM opens Defensive on the Shield's sheet, makes it active, and adds an effect to it", () =>
		gm.evaluate(async () => {
			const { render, settle, waitFor } = window.e2e;
			const shield = game.actors.getName('E2E Ada').items.getName('E2E Shield');
			const root = await render(shield.sheet, (root) => root.querySelector('.profile-qualities .data-rated'));
			const row = root.querySelector('.profile-qualities .quality')!;
			[...row.querySelectorAll<HTMLElement>('.data-rated button')].at(-1)!.click();
			const select = await waitFor('the details of Defensive', () => row.querySelector<HTMLSelectElement>('.details select'));
			select.value = 'active';
			select.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			const add = await waitFor('the Add an Effect button', () =>
				root.querySelector<HTMLElement>('.profile-qualities .quality .details .add-effect'),
			);
			add.click();
			await settle();
		}),
	);
	const details = await gm.evaluate(() => {
		const root = window.e2e.htmlOf(game.actors.getName('E2E Ada').items.getName('E2E Shield').sheet)!;
		return {
			expanded: root.querySelector('.profile-qualities .data-rated button[aria-expanded]')?.getAttribute('aria-expanded'),
			cost: root.querySelector<HTMLInputElement>('.profile-qualities .details input[type="number"]')?.value ?? null,
		};
	});
	e2e.expect(
		"#694 Q3 Defensive opens in full on the Shield's sheet, shows its Advantage cost once active, and holds a new effect named after it",
		{ details, shield: await weaponState('Shield'), defense: await meleeDefense() },
		{
			details: { expanded: 'true', cost: '2' },
			shield: {
				qualities: ['E2E Defensive 1 (active, 2)'],
				effects: [
					{ name: 'E2E Defensive', tagged: true },
					{ name: 'E2E Defensive', tagged: true },
				],
			},
			defense: 1,
		},
	);

	// The new effect brings a Difficulty die to the Shield's attacks, as Auto-fire would; auto-apply turns the others on.
	await gm.evaluate(async () => {
		const shield = game.actors.getName('E2E Ada').items.getName('E2E Shield');
		const added = shield.effects.contents.at(-1);
		// v13: an effect keeps its changes in `changes`, with a numeric mode; v14 in `system.changes`, with a type.
		const key = 'genesys.pool.combat.self.';
		await added.update(
			game.release.generation === 13
				? { changes: [{ key, value: 'D', mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM }] }
				: { 'system.changes': [{ key, value: 'D', type: 'custom' }] },
		);
	});
	await setSetting('dicePoolAutoApplyModifications', true);
	const activeRows = (state: PromptState) => state.modifications.filter(({ name }) => /Accurate|Defensive/.test(name));
	const shieldAttack = await opened(gm, attack('Shield'));
	const swordAttack = await opened(gm, attack('Sword'));
	await setSetting('dicePoolAutoApplyModifications', false);
	e2e.expect(
		"#694 Q4 with auto-apply on, an active quality's Pool Modification starts off, a passive one's on",
		{ shield: activeRows(shieldAttack), sword: activeRows(swordAttack) },
		{
			shield: [{ name: 'From Self: E2E Defensive (E2E Shield)', enabled: false, mods: 'D+' }],
			sword: [{ name: 'From Self: E2E Accurate (E2E Sword)', enabled: true, mods: 'B+ B+' }],
		},
	);

	await e2e.step("#694 Q5 GM removes Accurate from Ada's Sword", () =>
		update({ actor: 'Ada', item: 'Sword' }, { 'system.qualities': [] }),
	);
	e2e.expect(
		"#694 Q5 removing a quality removes its effects, and its Boosts from the weapon's attacks",
		{ weapon: await weaponState('Sword'), sword: accurateRows(await opened(gm, attack('Sword'))) },
		{ weapon: { qualities: [], effects: [] }, sword: [] },
	);

	await e2e.step("#694 Q6 GM gives Ada's Shield a second profile and drops Defensive on it too", async () => {
		await update({ actor: 'Ada', item: 'Shield' }, { 'system.extraProfiles': [{ name: 'E2E Bash' }] });
		await gm.evaluate(async () => {
			const item = game.actors.getName('E2E Ada').items.getName('E2E Shield');
			const block = '[data-weapon-profile="1"]';
			const root = await window.e2e.render(item.sheet, (root) => root.querySelector(block));
			window.e2e.drop(root.querySelector(block)!, { type: 'Item', uuid: game.items.getName('E2E Defensive').uuid });
			await window.e2e.settle();
		});
	});
	const bash = await gm.evaluate(() =>
		game.actors
			.getName('E2E Ada')
			.items.getName('E2E Shield')
			.system.extraProfiles[0].qualities.map((quality: { name: string; rating: number }) => `${quality.name} ${quality.rating}`),
	);
	e2e.expect(
		'#694 Q6 Defensive 1 on both profiles of the Shield counts once: the melee defense stays 1',
		{ bash, defense: await meleeDefense() },
		{ bash: ['E2E Defensive 1'], defense: 1 },
	);

	await e2e.step("#722 Q7 GM drops Keen, a quality adding 1 damage to its item, on the second profile of Ada's Glaive", () =>
		gm.evaluate(async () => {
			const { ADD } = CONST.ACTIVE_EFFECT_MODES;
			const [keen] = await Item.createDocuments([
				{
					name: 'E2E Keen',
					type: 'quality',
					effects: [{ name: 'E2E Keen', changes: [{ key: 'genesys.item.baseDamage', value: '1', mode: ADD }] }],
				},
			]);
			const [glaive] = await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
				{
					name: 'E2E Glaive',
					type: 'weapon',
					system: {
						skills: ['Melee'],
						range: 'engaged',
						state: 'equipped',
						baseDamage: 4,
						critical: 3,
						extraProfiles: [{ name: 'E2E Haft', baseDamage: 2, critical: 4 }],
					},
				},
			]);
			const block = '[data-weapon-profile="1"]';
			const root = await window.e2e.render(glaive.sheet, (root) => root.querySelector(block));
			window.e2e.drop(root.querySelector(block)!, { type: 'Item', uuid: keen.uuid });
			await window.e2e.settle();
		}),
	);
	e2e.expect(
		"#722 Q7 Keen on the Glaive's second profile adds 1 damage to that profile alone, and its sheet shows it there",
		await gm.evaluate(() => {
			const glaive = game.actors.getName('E2E Ada').items.getName('E2E Glaive');
			return {
				prepared: [glaive.system, ...glaive.system.extraProfiles].map(
					(profile: { baseDamage: number; critical: number }) => `${profile.baseDamage}/${profile.critical}`,
				),
				effective: [...(window.e2e.htmlOf(glaive.sheet)?.querySelectorAll('.effective-stats') ?? [])].map((stats) =>
					stats.textContent?.trim(),
				),
			};
		}),
		{ prepared: ['4/3', '3/4'], effective: ['Damage 3'] },
	);
	await e2e.step('quality effects end');
}
