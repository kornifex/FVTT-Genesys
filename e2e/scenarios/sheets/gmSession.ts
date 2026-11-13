import type { SheetsContext } from './shared.ts';



export async function gmSessionPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	await e2e.step('#95 GM changes the image of a character from the file picker', () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.open('Bearer');
		}),
	);
	e2e.expect(
		'#95 A13 GM: a picked image becomes the actor image',
		await gm.evaluate(() => window.sheetsE2E.pickImage('Bearer', 'icons/svg/mystery-man.svg')),
		{ pickerShown: true, img: 'icons/svg/mystery-man.svg' },
	);
	// The Archetype and the Career go first: a character who spent XP can't change them.
	await e2e.step('#95 GM drops an archetype, a career, a skill and an item on a character', () =>
		gm.evaluate(async () => {
			for (const name of ['archetype', 'career', 'skill', 'weapon'])
				await window.sheetsE2E.drop('Bearer', { type: 'Item', name });
		}),
	);
	e2e.expect(
		'#95 A14 GM: the career skill prompt opens for a dropped career',
		await gm.evaluate(() => window.sheetsE2E.prompts('app-career-skill-prompt')),
		[{ appV2: true, title: 'Career Skills' }],
	);
	await gm.evaluate(() => window.sheetsE2E.closePrompts('app-career-skill-prompt'));
	const journal = await gm.evaluate(() => window.sheetsE2E.journal('Bearer'));
	await e2e.step('#95 GM awards 50 XP from the journal', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.clickTab('Bearer', 'journal');
			await sheets.click('Bearer', '.xp-journal .columns button');
			sheets.setPromptInput('app-award-xp-prompt', '.amount input', '50', 'input');
			sheets.setPromptInput('app-award-xp-prompt', '.reason textarea', 'E2E', 'input');
			await sheets.clickPrompt('app-award-xp-prompt', '.award-xp-prompt button');
		}),
	);
	e2e.expect(
		'#95 A15 GM: the award adds a journal entry and 50 available XP',
		await gm.evaluate(() => window.sheetsE2E.journal('Bearer')),
		{
			availableXP: journal.availableXP + 50,
			entries: journal.entries + 1,
		},
	);
	await e2e.step('#95 GM drops a talent on the character', () =>
		gm.evaluate(() => window.sheetsE2E.drop('Bearer', { type: 'Item', name: 'talent' })),
	);
	e2e.expect('#95 A16 GM: the dropped items are on the character', await gm.evaluate(() => window.sheetsE2E.itemNames('Bearer')), [
		'E2E archetype',
		'E2E career',
		'E2E skill',
		'E2E talent',
		'E2E weapon',
	]);
	await e2e.step('#95 GM drops a minion on a vehicle', () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.open('Vehicle');
			await window.sheetsE2E.drop('Vehicle', { type: 'Actor', name: 'Minion' }, '.tab-crew .heading-row');
		}),
	);
	e2e.expect(
		'#95 A17 GM: the clone prompt opens for an actor dropped on a vehicle',
		await gm.evaluate(() => window.sheetsE2E.prompts('app-clone-actor-prompt')),
		[{ appV2: true, title: 'Drop Confirmation' }],
	);
	await gm.evaluate(() => window.sheetsE2E.closePrompts('app-clone-actor-prompt'));
	// §#414: on v14, a drop on an item sheet goes through ItemSheetV2's own `_onDrop`, whose `dropItemSheetData` hook a
	// module can refuse it with.
	let refusedDrop = {};
	await e2e.step('#414 GM drops a quality on a weapon sheet, which a dropItemSheetData hook refuses', async () => {
		refusedDrop = await gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('weapon');
			const calls: { item: string; type: string }[] = [];
			const hook = Hooks.on('dropItemSheetData', (item: { name: string }, _sheet: unknown, data: { type: string }) => {
				calls.push({ item: item.name, type: data.type });
				return false;
			});
			await sheets.drop('weapon', { type: 'Item', name: 'quality' });
			Hooks.off('dropItemSheetData', hook);
			const weapon = game.items.getName('E2E weapon');
			const qualities = weapon.system.qualities.map((quality: { name: string }) => quality.name);
			// v13: the drop goes through, so the weapon is left as it was for the drops below.
			if (qualities.length) await weapon.update({ 'system.qualities': [] });
			return { calls, qualities };
		});
	});
	e2e.expect(
		'#414 A3 on v14, a dropItemSheetData hook that returns false keeps the item off the item sheet; v13 has no such hook',
		refusedDrop,
		// v13: ItemSheetV2 has no dropItemSheetData hook.
		(await gm.evaluate(() => game.release.generation < 14))
			? { calls: [], qualities: ['E2E quality'] }
			: { calls: [{ item: 'E2E weapon', type: 'Item' }], qualities: [] },
	);
	await e2e.step('#95 GM drops items on a weapon, an armor, an archetype and a career sheet', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			for (const name of ['weapon', 'armor', 'archetype', 'career']) await sheets.open(name);
			await sheets.drop('weapon', { type: 'Item', name: 'quality' });
			await sheets.drop('weapon', { type: 'Item', name: 'skill' });
			await sheets.drop('armor', { type: 'Item', name: 'quality' });
			await sheets.drop('archetype', { type: 'Item', name: 'ability' });
			await sheets.drop('career', { type: 'Item', name: 'skill' });
		}),
	);
	e2e.expect(
		'#95 A18 GM: the item sheets take the dropped items',
		await gm.evaluate(() => {
			const system = (name: string) => game.items.getName(`E2E ${name}`).system;
			return {
				weapon: [system('weapon').skills, system('weapon').qualities.map((quality: { name: string }) => quality.name)],
				armor: system('armor').qualities.map((quality: { name: string }) => quality.name),
				archetype: system('archetype').grantedItems.map((item: { name: string }) => item.name),
				career: system('career').careerSkills.map((skill: { name: string }) => skill.name),
			};
		}),
		{ weapon: [['E2E skill'], ['E2E quality']], armor: ['E2E quality'], archetype: ['E2E ability'], career: ['E2E skill'] },
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.closeAll();
		window.sheetsE2E.readMessages();
	});
	await e2e.step('#95 GM rolls a skill from the character sheet and a pool from /gendr', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Bearer');
			await sheets.clickTab('Bearer', 'skills');
			await sheets.click('Bearer', '.tab-skills button.skill-name', 'Athletics');
			await sheets.clickPrompt('app-dice-prompt', '.roll-button');
			await ui.chat.processMessage('/gendr');
			await sheets.clickPrompt('app-dice-prompt', '.roll-button');
		}),
	);
	e2e.expect(
		'#95 A19 GM: the dice prompt rolls a check from a skill and from /gendr',
		await gm.evaluate(() => window.sheetsE2E.readMessages().map(({ speaker, rolls }) => ({ speaker, rolls }))),
		// A roll without an actor has no actor speaking.
		[
			{ speaker: 'E2E Bearer', rolls: 1 },
			{ speaker: '', rolls: 1 },
		],
	);
}
