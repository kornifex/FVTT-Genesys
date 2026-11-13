import type { Client } from '../../scenario.ts';
import type { SheetsContext } from './shared.ts';

export async function chatCardsPart(ctx: SheetsContext) {
	const { e2e, gm, player } = ctx;
	const sends = async (client: Client, sheets: [string, string[]][]) =>
		client.evaluate(async (sheets) => {
			for (const [name, items] of sheets) {
				await window.sheetsE2E.open(name);
				for (const item of items) await window.sheetsE2E.sendToChat(name, item);
			}
			await window.sheetsE2E.closeAll();
		}, sheets);
	await gm.evaluate(() => window.sheetsE2E.readMessages());
	await e2e.step('#130 GM without a character sends talents, abilities and weapons from a character, an adversary and a vehicle', () =>
		sends(gm, [
			['Hero', ['Ranked', 'Unranked', 'Active', 'Sword']],
			['Nemesis', ['Ranked', 'Unranked', 'Active', 'Sword']],
			['Vehicle', ['Cannon']],
		]),
	);
	const gmCards = await gm.evaluate(() => window.sheetsE2E.cards());
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, 'Observed'), gm.user);
	await e2e.step('#130 GM with a character sends a talent from an adversary', () => sends(gm, [['Nemesis', ['Ranked']]]));
	const assignedCards = await gm.evaluate(() => window.sheetsE2E.cards());
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, null), gm.user);
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, 'Observed'), e2e.playerUser);
	await e2e.step('#130 player with another character sends a talent and a weapon from their character', () =>
		sends(player, [['Hero', ['Ranked', 'Sword']]]),
	);
	const playerCards = await gm.evaluate(() => window.sheetsE2E.cards());
	await gm.evaluate((name) => window.sheetsE2E.setUserCharacter(name, null), e2e.playerUser);
	// A ranked talent's effective tier is its tier plus its ranks above the first.
	const swordCard = { skill: 'Melee', damage: '3 + Br', qualityTooltipLinks: '1' };
	e2e.expect(
		"#130 A1 a card sent from a sheet is spoken by the sheet's actor, with the rank or N/A, damage, firing arc and quality tooltips",
		{ gm: gmCards, assigned: assignedCards, player: playerCards },
		{
			gm: [
				{ speaker: 'E2E Hero', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } },
				{ speaker: 'E2E Hero', content: { activation: 'Passive', rank: 'N/A', effectiveTier: '2' } },
				{ speaker: 'E2E Hero', content: { activation: 'Active (Maneuver)' } },
				{ speaker: 'E2E Hero', content: swordCard },
				{ speaker: 'E2E Nemesis', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } },
				{ speaker: 'E2E Nemesis', content: { activation: 'Passive', rank: 'N/A', effectiveTier: '2' } },
				{ speaker: 'E2E Nemesis', content: { activation: 'Active (Maneuver)' } },
				{ speaker: 'E2E Nemesis', content: swordCard },
				{
					speaker: 'E2E Vehicle',
					content: { 'firing-arc': 'Fore, Port', skill: 'Gunnery', damage: '6', qualityTooltipLinks: '1' },
				},
			],
			assigned: [{ speaker: 'E2E Nemesis', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } }],
			player: [
				{ speaker: 'E2E Hero', content: { activation: 'Passive', rank: '2', effectiveTier: '2' } },
				{ speaker: 'E2E Hero', content: swordCard },
			],
		},
	);
	await e2e.step("#130 GM rolls an attack with the Nemesis's sword, then changes its quality's rating in the weapon sheet", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('Nemesis');
			await sheets.click('Nemesis', '.adversary-items .weapon .weapon-attack', 'E2E Sword');
			await sheets.clickPrompt('app-dice-prompt', '.roll-button');
			await sheets.open('Nemesis/Sword');
			await sheets.clickTab('Nemesis/Sword', 'data');
			const element = game.actors.getName('E2E Nemesis').items.getName('E2E Sword').sheet.element as HTMLElement;
			const rating = element.querySelector<HTMLInputElement>('.data-rated input')!;
			rating.value = '3';
			rating.dispatchEvent(new FocusEvent('blur'));
			await window.e2e.settle();
		}),
	);
	e2e.expect(
		"#130 A2 after a card and an attack, a quality's rating change keeps the @UUID enricher of its description",
		await gm.evaluate(() => ({
			rating: game.actors.getName('E2E Nemesis').items.getName('E2E Sword').system.qualities[0].rating,
			description: window.sheetsE2E.qualityDescription('Nemesis/Sword').replace(/Actor\.\w+/, 'Actor.<id>'),
			attack: window.sheetsE2E.readMessages().map(({ speaker, rolls }) => ({ speaker, rolls })),
		})),
		{ rating: 3, description: '<p>@UUID[Actor.<id>]{E2E Hero} pierces.</p>', attack: [{ speaker: 'E2E Nemesis', rolls: 1 }] },
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#130: a card's quality shows its description in Foundry's tooltip, under the pointer.
	const tooltips: Record<string, unknown> = {};
	await e2e.step(
		"#130 GM hovers the quality of a weapon's card, a vehicle weapon's card and an attack's card in the chat log",
		async () => {
			for (const [card, speaker, attack] of [
				['weapon', 'Hero', false],
				['vehicleWeapon', 'Vehicle', false],
				['attack', 'Nemesis', true],
			] as const) {
				const marked = await gm.evaluate(({ speaker, attack }) => window.sheetsE2E.markQuality(speaker, attack), {
					speaker,
					attack,
				});
				if (!marked) {
					tooltips[card] = null;
					continue;
				}
				await gm.page.hover('[data-e2e="hovered-quality"]');
				tooltips[card] = await gm.evaluate(() => window.sheetsE2E.shownTooltip());
				await gm.page.mouse.move(0, 0);
				await gm.evaluate(() => window.sheetsE2E.tooltipHidden());
			}
		},
	);
	const pierceTooltip = { text: 'E2E Hero pierces.', links: 1 };
	e2e.expect(
		"#130 A3 hovering a card's quality shows its description in Foundry's tooltip, with its link, on a weapon's, a vehicle weapon's and an attack's card",
		tooltips,
		{ weapon: pierceTooltip, vehicleWeapon: pierceTooltip, attack: pierceTooltip },
	);

	// §#134: the weapons of an adversary and a vehicle, and the drawn firing arcs and separators of the rows of both
	// weapon types.
	// The damage totals count on the Nemesis's Brawn 3, which §#260 gives it in a whole run: set here for this part alone.
	await gm.evaluate(() => window.sheetsE2E.update('Nemesis', { 'system.characteristics.brawn': 3 }));
	await e2e.step('#134 GM gives the Nemesis a weapon without a damage characteristic and one with a negative damage', () =>
		gm.evaluate(async () => {
			await window.e2e.actor('Nemesis').createEmbeddedDocuments('Item', [
				{ name: 'E2E Rock', type: 'weapon', system: { skills: ['Melee'], baseDamage: 2, damageCharacteristic: '-' } },
				{ name: 'E2E Shiv', type: 'weapon', system: { skills: ['Melee'], baseDamage: -1, damageCharacteristic: 'brawn' } },
			]);
			await window.sheetsE2E.open('Nemesis');
			await window.sheetsE2E.open('Hero');
			await window.sheetsE2E.clickTab('Hero', 'inventory');
			await window.sheetsE2E.open('Vehicle');
			await window.sheetsE2E.clickTab('Vehicle', 'inventory');
		}),
	);
	// The Nemesis has Brawn 3: an adversary's list reads the characteristic and the base damage, then the total. Rock and Shiv, created together, share a sort
	// value, so their order varies between runs: the rows are compared sorted by name.
	e2e.expect(
		"#134 N1 an adversary lists a weapon's damage with its characteristic, without one, and with a negative base damage",
		await gm.evaluate(() => {
			const { text, htmlOf, actor } = window.e2e;
			return [...htmlOf(actor('Nemesis').sheet)!.querySelectorAll('.adversary-items .weapon')].map((row) => text(row)).sort();
		}),
		[
			'E2E Rock (MeleeDamage 2Critical 0Range Engaged)',
			'E2E Shiv (MeleeDamage Br-1 (2)Critical 0Range Engaged)',
			'E2E Sword (MeleeDamage Br+3 (6)Critical 0Range EngagedE2E Pierce 3)',
		],
	);
	// The separators are drawn by CSS, after each part: a comma between two firing arcs, a semicolon between two details.
	e2e.expect(
		"#134 N2 the inventory rows of a weapon and of a vehicle weapon draw their details' semicolons, and the commas between the firing arcs",
		await gm.evaluate(() => ({
			weapon: window.sheetsE2E.renderedText('Hero', '.tab-inventory .inventory-item .details', 'E2E Sword'),
			vehicleWeapon: window.sheetsE2E.renderedText('Vehicle', '.tab-inventory .inventory-item .details', 'E2E Cannon'),
		})),
		{
			weapon: 'E2E SwordMelee;Damage Br+3 (3);Critical 0;Range Engaged;E2E Pierce 1',
			vehicleWeapon: 'E2E CannonGunnery;Firing Arc Fore,Port;Damage 6;Critical 0;Range Engaged;E2E Pierce 1',
		},
	);
	// The Combat tab lists the equipped vehicle weapons.
	const cannonState = await gm.evaluate(() => window.e2e.actor('Vehicle').items.getName('E2E Cannon').system.state);
	await gm.evaluate(async () => {
		await window.sheetsE2E.update('Vehicle/Cannon', { 'system.state': 'equipped' });
		await window.sheetsE2E.clickTab('Vehicle', 'combat');
	});
	e2e.expect(
		"#134 N3 a vehicle's Combat tab draws the commas between a weapon's firing arcs",
		await gm.evaluate(() => window.sheetsE2E.renderedText('Vehicle', '.tab-combat .weapon:not(.columns)', 'E2E Cannon')),
		'E2E CannonGunnery60EngagedFore,PortE2E Pierce 1',
	);
	// Hero rolls Gunnery with Agility 2 and no rank: two Ability dice against the attack's two Difficulty dice.
	await e2e.step('#134 GM gives the Vehicle a Gunner, Hero, and opens the attack of its Cannon', () =>
		gm.evaluate(async () => {
			const { actor } = window.e2e;
			await window.sheetsE2E.update('Hero', { 'system.characteristics.agility': 2 });
			await window.sheetsE2E.update('Vehicle', {
				'system.roles': [{ id: foundry.utils.randomID(), name: 'E2E Gunner', skills: ['Gunnery'], members: [actor('Hero').uuid] }],
			});
			await window.sheetsE2E.attackWithVehicleWeapon('Vehicle', 'Cannon');
		}),
	);
	const attackPool = await gm.evaluate(() => window.e2e.poolPreview(document.querySelector('.app-dice-prompt')!));
	// The fourth face of an Ability die holds two Successes, a Difficulty die's a Threat: four Successes are left.
	await e2e.step("#134 GM rolls the Cannon's attack, every die on its fourth face", async () => {
		await gm.fixDice([4, 4, 4, 4].map((face) => ({ face, faces: 8 })));
		await gm.evaluate(() => window.sheetsE2E.rollDicePrompt());
	});
	e2e.expect(
		"#134 N4 an attack with a vehicle weapon posts its base damage plus a damage per Success left, without its gunner's characteristic",
		{
			pool: attackPool,
			summary: await gm.evaluate(() => window.sheetsE2E.lastMessage(['.summary-table .label', '.summary-table .count'])),
		},
		{ pool: 'AA|DD', summary: ['Damage (6)', 'Critical', 'Successes', 'Threat', '10', '0', '4', '2'] },
	);
	await gm.evaluate(async (state) => {
		await window.e2e.actor('Nemesis').deleteEmbeddedDocuments(
			'Item',
			['E2E Rock', 'E2E Shiv'].map((name) => window.e2e.actor('Nemesis').items.getName(name).id),
		);
		await window.sheetsE2E.update('Vehicle', { 'system.roles': [] });
		await window.sheetsE2E.update('Vehicle/Cannon', { 'system.state': state });
		await window.sheetsE2E.update('Hero', { 'system.characteristics.agility': 0 });
		await window.sheetsE2E.closeAll();
	}, cannonState);
}
