import type { SheetsContext } from './shared.ts';

export async function effectsTabsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	await e2e.step('#102 GM gives a character, an adversary and a vehicle an effect of their own and an item with an effect', () =>
		gm.evaluate(async () => {
			const change = { key: 'system.soak', mode: 2, value: '1' };
			for (const [name, type, state] of [
				['Bearer', 'gear', 'carried'],
				['Rival', 'gear', 'carried'],
				['Vehicle', 'vehicleWeapon', 'equipped'],
			]) {
				const owner = game.actors.getName(`E2E ${name}`);
				await owner.createEmbeddedDocuments('ActiveEffect', [{ name: 'E2E Own', changes: [change] }]);
				await owner.createEmbeddedDocuments('Item', [
					{
						name: 'E2E Kit',
						type,
						system: { state },
						effects: [{ name: 'E2E Kit effect', changes: [change], transfer: true }],
					},
				]);
			}
			await game.actors.getName('E2E Bearer').createEmbeddedDocuments('Item', [
				{
					name: 'E2E Mail',
					type: 'armor',
					system: { state: 'carried' },
					effects: [{ name: 'E2E Mail effect', changes: [change], transfer: true }],
				},
			]);
		}),
	);
	const ownerRows = await gm.evaluate(async () => {
		const rows: Record<string, unknown> = {};
		for (const name of ['Bearer', 'Rival', 'Vehicle']) {
			await window.sheetsE2E.open(name);
			rows[name] = (await window.sheetsE2E.effectButtons(name))
				.filter((row) => row.name.startsWith('E2E Own') || row.name.startsWith('E2E Kit'))
				.map(({ name, source, buttons }) => ({ name, source, buttons }));
		}
		return rows;
	});
	const ownerRow = { name: 'E2E Own', source: 'None', buttons: ['fa-toggle-on', 'fa-edit', 'fa-trash'] };
	const kitRow = { name: 'E2E Kit effect', source: 'E2E Kit', buttons: ['fa-toggle-on', 'fa-edit'] };
	e2e.expect(
		"#102 A1 an actor's Effects tab lists its own effects and its items', with the item as source, and Delete only for its own",
		ownerRows,
		{ Bearer: [ownerRow, kitRow], Rival: [ownerRow, kitRow], Vehicle: [ownerRow, kitRow] },
	);
	// The item's effect as saved, but for `disabled` and the edit stamps.
	const kitEffect = () =>
		gm.evaluate(() => {
			const { disabled, _stats, ...rest } = game.actors
				.getName('E2E Rival')
				.items.getName('E2E Kit')
				.effects.getName('E2E Kit effect')._source;
			return { disabled, rest: JSON.stringify(rest) };
		});
	const kitBefore = await kitEffect();
	await e2e.step("#102 GM edits and powers off an item's effect from the Rival's Effects tab", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			const { settle, effectRows, toggleEffect, editEffect } = window.e2e;
			await sheets.clickTab('Rival', 'effects');
			const row = () => effectRows(game.actors.getName('E2E Rival').sheet).find((row) => row.name === 'E2E Kit effect')!;
			// Which effect sheet opens is under test: the step waits for the click's work to end, not for a sheet.
			await editEffect(row());
			await settle();
			await toggleEffect(row());
		}),
	);
	e2e.expect(
		'#102 A2 Edit opens the effect where it lives, and the power button toggles disabled only',
		await gm
			.evaluate(() => {
				const kit = game.actors.getName('E2E Rival').items.getName('E2E Kit');
				const effect = kit.effects.getName('E2E Kit effect');
				const opened = [...foundry.applications.instances.values(), ...Object.values(ui.windows)].filter(
					(app: { rendered: boolean; document?: { name: string } }) => app.rendered && app.document?.name === 'E2E Kit effect',
				);
				return {
					opened: opened.map((app: { document: { uuid: string } }) => app.document.uuid === effect.uuid),
					rival: game.actors.getName('E2E Rival').effects.map((own: { name: string }) => own.name),
				};
			})
			.then(async (found) => ({ ...found, effect: await kitEffect() })),
		{ opened: [true], rival: ['E2E Own'], effect: { disabled: true, rest: kitBefore.rest } },
	);
	e2e.expect("#102 A3 the item's effect was enabled before the power button", kitBefore.disabled, false);
	e2e.expect(
		'#583 E1 an effect turned off names its toggle "Turn the effect on", with a switch turned off; one turned on, "Turn the effect off"',
		await gm.evaluate(() =>
			window.sheetsE2E
				.effectRows('Rival')
				.filter((row) => row.name === 'E2E Own' || row.name === 'E2E Kit effect')
				.map(({ name, toggle }) => ({ name, toggle })),
		),
		[
			{ name: 'E2E Own', toggle: { name: 'Turn the effect off', icon: 'fa-toggle-on', pressed: null } },
			{ name: 'E2E Kit effect', toggle: { name: 'Turn the effect on', icon: 'fa-toggle-off', pressed: null } },
		],
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await e2e.step("#102 GM gives an owned item an effect with an origin and opens the item's Effects tab", () =>
		gm.evaluate(async () => {
			const kit = game.actors.getName('E2E Bearer').items.getName('E2E Kit');
			await kit.createEmbeddedDocuments('ActiveEffect', [{ name: 'E2E Origin', origin: kit.uuid }]);
			await window.sheetsE2E.open('Bearer/Kit');
			await window.sheetsE2E.clickTab('Bearer/Kit', 'effects');
			await window.sheetsE2E.open('Bearer/Mail');
			await window.sheetsE2E.clickTab('Bearer/Mail', 'effects');
		}),
	);
	e2e.expect(
		"#102 A4 on an item's Effects tab, Delete shows for every effect, those with an origin included",
		await gm.evaluate(async () => (await window.sheetsE2E.effectButtons('Bearer/Kit')).map(({ name, buttons }) => ({ name, buttons }))),
		[
			{ name: 'E2E Kit effect', buttons: ['fa-toggle-on', 'fa-edit', 'fa-trash'] },
			{ name: 'E2E Origin', buttons: ['fa-toggle-on', 'fa-edit', 'fa-trash'] },
		],
	);
	e2e.expect(
		'#102 A5 an owned armor out of its Equipment State lists its effects under Inactive Effects, with the tooltip',
		await gm.evaluate(() =>
			window.sheetsE2E.effectRows('Bearer/Mail').map(({ section, name, tooltip }) => ({ section, name, tooltip })),
		),
		[{ section: 'Inactive Effects', name: 'E2E Mail effect', tooltip: 'Inactive while E2E Mail is Carried.' }],
	);

	// §#577: deleting an effect asks first, which its trash icon didn't.
	const deleteOrigin = (answer: 'yes' | 'no') =>
		gm.evaluate(async (answer) => {
			const { effectRows, rowMenu, hasRowMenu, answerConfirm } = window.e2e;
			const kit = game.actors.getName('E2E Bearer').items.getName('E2E Kit');
			const row = effectRows(kit.sheet).find((row) => row.name === 'E2E Origin')!;
			if (hasRowMenu(row.element)) await rowMenu(row.element, 'fa-trash');
			else row.element.querySelector<HTMLElement>('.fa-trash')!.closest('button')!.click();
			return { asked: await answerConfirm(answer), effects: kit.effects.map((effect: { name: string }) => effect.name).sort() };
		}, answer);
	let deleted: unknown;
	await e2e.step("#577 E1 GM deletes the E2E Origin effect from the Kit's Effects tab, and answers No", async () => {
		deleted = await deleteOrigin('no');
	});
	e2e.expect('#577 E1 deleting an Active Effect asks first, in the deletion dialog that names it, and No keeps it', deleted, {
		asked: {
			application: 'DialogV2',
			title: 'Confirm Deletion',
			content: "Delete E2E Origin? This can't be undone.",
			buttons: ['yes', 'no'],
			defaultButton: 'no',
		},
		effects: ['E2E Kit effect', 'E2E Origin'],
	});
	await e2e.step('#577 E2 GM deletes the E2E Origin effect again, and answers Yes', async () => {
		deleted = await deleteOrigin('yes');
	});
	e2e.expect('#577 E2 Yes deletes the effect', (deleted as { effects: string[] }).effects, ['E2E Kit effect']);
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
