import type { PromptState, DicePromptContext } from './shared.ts';

export async function attachmentsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, update, attack } = ctx;
	// The world's attachments: a scope adding 1 damage, with a modification option adding a Boost to the weapon's attacks,
	// off until installed; plating adding 1 soak, which takes 2 Hard Points.
	await gm.evaluate(async () => {
		const { ADD, CUSTOM } = CONST.ACTIVE_EFFECT_MODES;
		await Item.createDocuments([
			{
				name: 'E2E Scope',
				type: 'attachment',
				system: { hardPointsRequired: 1 },
				effects: [
					{ name: 'E2E Scope', changes: [{ key: 'genesys.item.baseDamage', value: '1', mode: ADD }] },
					{
						name: 'E2E Scope Boost',
						disabled: true,
						changes: [{ key: 'genesys.pool.combat.self.', value: 'B', mode: CUSTOM }],
					},
				],
			},
			{
				name: 'E2E Plating',
				type: 'attachment',
				system: { hardPointsRequired: 2 },
				effects: [{ name: 'E2E Plating', changes: [{ key: 'genesys.item.soak', value: '1', mode: ADD }] }],
			},
		]);
		await game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [
			{
				name: 'E2E Rifle',
				type: 'weapon',
				system: {
					skills: ['Melee'],
					range: 'engaged',
					state: 'equipped',
					baseDamage: 5,
					critical: 3,
					encumbrance: 2,
					extraProfiles: [{ name: 'E2E Butt', baseDamage: 2, critical: 4 }],
				},
			},
			{ name: 'E2E Coat', type: 'armor', system: { state: 'equipped', soak: 1, encumbrance: 1 } },
		]);
	});
	// Drops a world attachment on the sheet of one of Ada's items.
	const dropAttachment = (attachment: string, target: string) => () =>
		gm.evaluate(
			async (args) => {
				const owned = game.actors.getName('E2E Ada').items.getName(`E2E ${args.target}`);
				const root = await window.e2e.render(owned.sheet, (root) => root.querySelector('.window-content'));
				window.e2e.drop(root.querySelector('.window-content')!, {
					type: 'Item',
					uuid: game.items.getName(`E2E ${args.attachment}`).uuid,
				});
				await window.e2e.settle();
			},
			{ attachment, target },
		);
	// The Rifle: its attachments, its effects with whether each is tagged with one of them and disabled, its damage and
	// Critical rating on each profile as prepared and as stored, and what its sheet shows of them.
	const rifleState = () =>
		gm.evaluate(() => {
			const rifle = game.actors.getName('E2E Ada').items.getName('E2E Rifle');
			const ids = rifle.system.attachments.map((attachment: { id: string }) => attachment.id);
			const root = window.e2e.htmlOf(rifle.sheet);
			return {
				attachments: rifle.system.attachments.map(
					(attachment: { name: string; hardPointsRequired: number }) => `${attachment.name} ${attachment.hardPointsRequired}`,
				),
				// By name: v13 doesn't keep the effects in the order they were created.
				effects: rifle.effects
					.map((effect: { name: string; disabled: boolean; flags: { genesys?: { attachment?: string } } }) => ({
						name: effect.name,
						tagged: ids.includes(effect.flags.genesys?.attachment),
						disabled: effect.disabled,
					}))
					.sort((left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name, 'en')),
				prepared: [rifle.system, ...rifle.system.extraProfiles].map(
					(profile: { baseDamage: number; critical: number }) => `${profile.baseDamage}/${profile.critical}`,
				),
				stored: [rifle._source.system, ...rifle._source.system.extraProfiles].map(
					(profile: { baseDamage: number; critical: number }) => `${profile.baseDamage}/${profile.critical}`,
				),
				sheet: root
					? {
							damage: root.querySelector<HTMLInputElement>('input[name="system.baseDamage"]')?.value ?? null,
							effective: [...root.querySelectorAll('.effective-stats')].map((stats) => stats.textContent?.trim()),
						}
					: null,
			};
		});
	const scopeRows = (state: PromptState) => state.modifications.filter(({ name }) => name.includes('Scope'));

	await e2e.step("#702 A1 GM drops the Scope on Ada's Rifle", dropAttachment('Scope', 'Rifle'));
	e2e.expect(
		"#702 A1 the Scope's effects become the Rifle's: 1 damage on every profile, the stored damage and the sheet's field unchanged, and its modification off",
		await rifleState(),
		{
			attachments: ['E2E Scope 1'],
			effects: [
				{ name: 'E2E Scope', tagged: true, disabled: false },
				{ name: 'E2E Scope Boost', tagged: true, disabled: true },
			],
			prepared: ['6/3', '3/4'],
			stored: ['5/3', '2/4'],
			sheet: { damage: '5', effective: ['Damage 6', 'Damage 3'] },
		},
	);

	await e2e.step("#702 A2 GM types a price on the Rifle's sheet and renames its second profile", () =>
		gm.evaluate(async () => {
			const { render, settle } = window.e2e;
			const rifle = game.actors.getName('E2E Ada').items.getName('E2E Rifle');
			const root = await render(rifle.sheet, (root) => root.querySelector('input[name="system.price"]'));
			const price = root.querySelector<HTMLInputElement>('input[name="system.price"]')!;
			price.value = '300';
			price.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			const name = root.querySelector<HTMLInputElement>('[data-weapon-profile="1"] .profile-name')!;
			name.value = 'E2E Stock';
			name.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
		}),
	);
	e2e.expect("#702 A2 editing the Rifle's sheet stores none of the damage its attachment adds", (await rifleState()).stored, [
		'5/3',
		'2/4',
	]);

	const before = scopeRows(await opened(gm, attack('Rifle')));
	await e2e.step("#702 A3 GM installs the Scope's modification, enabling its effect on the Rifle", () =>
		gm.evaluate(() =>
			game.actors.getName('E2E Ada').items.getName('E2E Rifle').effects.getName('E2E Scope Boost').update({ disabled: false }),
		),
	);
	e2e.expect(
		"#702 A3 the installed modification adds its Boost to the Rifle's attacks, and none to the Pistol's",
		{ before, rifle: scopeRows(await opened(gm, attack('Rifle'))), pistol: scopeRows(await opened(gm, attack('Pistol'))) },
		{ before: [], rifle: [{ name: 'From Self: E2E Scope Boost (E2E Rifle)', enabled: false, mods: 'B+' }], pistol: [] },
	);

	const soak = () => gm.evaluate(() => game.actors.getName('E2E Ada').system.totalSoak);
	const unplated = await soak();
	await e2e.step(
		"#702 A4 GM drops the Plating, which takes 2 Hard Points, on Ada's Coat, which has 1",
		dropAttachment('Plating', 'Coat'),
	);
	const warning = await gm.evaluate(
		() =>
			window.e2e
				.htmlOf(game.actors.getName('E2E Ada').items.getName('E2E Coat').sheet)
				?.querySelector('.over-hard-points')
				?.textContent?.trim() ?? null,
	);
	e2e.expect(
		"#702 A4 the Plating adds 1 to the Coat's soak, and so to Ada's, and the Coat's sheet warns that its attachments take more Hard Points than it has",
		{ added: (await soak()) - unplated, warning },
		{ added: 1, warning: '2 Hard Points taken, out of 1!' },
	);

	await e2e.step("#702 A5 GM removes the Scope from Ada's Rifle", () =>
		update({ actor: 'Ada', item: 'Rifle' }, { 'system.attachments': [] }),
	);
	const removed = await rifleState();
	e2e.expect(
		"#702 A5 removing an attachment removes its effects: the Rifle's damage and attacks are as before",
		{ effects: removed.effects, prepared: removed.prepared, rifle: scopeRows(await opened(gm, attack('Rifle'))) },
		{ effects: [], prepared: ['5/3', '2/4'], rifle: [] },
	);

	// The changes of an effect as stored, each with whether it has the custom type (v13: mode), which keeps Foundry from
	// applying it to the actor.
	const storedChanges = (effect: { attachment?: string; rifle?: string }) =>
		gm.evaluate((effect) => {
			const document = effect.attachment
				? game.items.getName(effect.attachment).effects.getName(effect.attachment)
				: game.actors.getName('E2E Ada').items.getName('E2E Rifle').effects.getName(effect.rifle);
			// v13: an effect keeps its changes in `changes`, with a numeric mode, custom being 0; v14 in `system.changes`, with
			// a type.
			const v13 = game.release.generation < 14;
			const changes = v13 ? document._source.changes : document._source.system.changes;
			return changes.map((change: { key: string; value: unknown; mode?: number; type?: string }) => {
				const custom = v13 ? change.mode === 0 : change.type === 'custom';
				return `${change.key} ${String(change.value)} ${custom ? 'custom' : 'applied'}`;
			});
		}, effect);
	await e2e.step('#721 E1 GM writes "Damage +1" in the Changes tab of the effect of the Edge, an attachment', () =>
		gm.evaluate(async () => {
			const { render, settle, waitFor } = window.e2e;
			const [edge] = await Item.createDocuments([
				{ name: 'E2E Edge', type: 'attachment', system: { hardPointsRequired: 1 }, effects: [{ name: 'E2E Edge' }] },
			]);
			const sheet = edge.effects.getName('E2E Edge').sheet;
			const root = await render(sheet, (root) => root.querySelector('[data-action="addChange"]'));
			root.querySelector<HTMLElement>('[data-action="addChange"]')!.click();
			// Adding a change submits the sheet and renders it again.
			const key = await waitFor('the added change', () =>
				window.e2e.htmlOf(sheet)?.querySelector<HTMLSelectElement>('select[name$="changes.0.key"]'),
			);
			key.value = 'genesys.item.baseDamage';
			key.dispatchEvent(new Event('change', { bubbles: true }));
			const value = window.e2e.htmlOf(sheet)!.querySelector<HTMLInputElement>('input[name$="changes.0.value"]')!;
			value.value = '+1';
			value.dispatchEvent(new Event('change', { bubbles: true }));
			await settle();
			await sheet.submit();
			await sheet.close();
			await settle();
		}),
	);
	await e2e.step("#721 E1 GM drops the Edge on Ada's Rifle", dropAttachment('Edge', 'Rifle'));
	e2e.expect(
		'#721 E1 the effect written from the Changes tab keeps its Item Change, which adds 1 damage to every profile of the Rifle the Edge is dropped on',
		{ edge: await storedChanges({ attachment: 'E2E Edge' }), prepared: (await rifleState()).prepared },
		{ edge: ['genesys.item.baseDamage +1 custom'], prepared: ['6/3', '3/4'] },
	);

	await e2e.step("#721 E2 GM saves the Edge's effect on the Rifle from its sheet unchanged", () =>
		gm.evaluate(async () => {
			const { render, settle } = window.e2e;
			const sheet = game.actors.getName('E2E Ada').items.getName('E2E Rifle').effects.getName('E2E Edge').sheet;
			await render(sheet, (root) => root.querySelector('select[name$="changes.0.key"]'));
			await sheet.submit();
			await sheet.close();
			await settle();
		}),
	);
	e2e.expect(
		"#721 E2 saving the effect from its sheet keeps its Item Change, and the Rifle's damage",
		{ rifle: await storedChanges({ rifle: 'E2E Edge' }), prepared: (await rifleState()).prepared },
		{ rifle: ['genesys.item.baseDamage +1 custom'], prepared: ['6/3', '3/4'] },
	);
	await e2e.step('attachments end');
}
