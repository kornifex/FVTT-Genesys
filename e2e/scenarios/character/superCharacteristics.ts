import type { ScenarioContext } from '../../scenario.ts';
import type { Characteristic, Evaluate } from './shared.ts';

/** §#114, §#202: marking super-characteristics through the sheet. */
export async function superCharacteristics(e2e: ScenarioContext, page: Evaluate, notifications: () => Promise<string[]>) {
	const S = 'Super';
	// Marks or unmarks a characteristic from its menu, then waits for the update.
	const flip = async (actor: string, c: Characteristic) => {
		const supers = await page((actor) => window.characterE2E.superCharacteristics(actor), actor);
		const key = supers.stored.includes(c) ? 'Genesys.Labels.UnmarkSuperCharacteristic' : 'Genesys.Labels.MarkSuperCharacteristic';
		await page((args) => window.characterE2E.menu(args.actor, { characteristic: args.c }, args.key), { actor, c, key });
		await e2e.settle();
	};
	const state = async (actor: string) => {
		const { stored, stars } = await page((actor) => window.characterE2E.superCharacteristics(actor), actor);
		return { stored, stars, notifications: await notifications() };
	};
	const warning = 'warning: Genesys.Notifications.TooManySuperCharacteristics';

	await e2e.step('#114 I1 Super-Characteristics on, a character in Character Creation with 30 XP marks then unmarks Brawn', async () => {
		await page((rules) => window.e2e.setSettings(rules), { useSuperCharacteristics: true });
		await page((name) => window.characterE2E.create(name), S);
		await page((name) => window.characterE2E.open(name), S);
		await page((name) => window.characterE2E.applyArchetype(name, 'Small Archetype'), S);
		await e2e.settle();
		await notifications();
		await flip(S, 'brawn');
		e2e.expect('#114 I1 with Starting XP left, marking Brawn is allowed', await state(S), {
			stored: ['brawn'],
			stars: ['brawn'],
			notifications: [],
		});
		await flip(S, 'brawn');
	});
	e2e.expect('#114 I1 with Starting XP left, unmarking Brawn is allowed', await state(S), { stored: [], stars: [], notifications: [] });
	await e2e.step('#202 I2 Brawn, Agility then Intellect marked', async () => {
		await flip(S, 'brawn');
		await flip(S, 'agility');
		await flip(S, 'intellect');
	});
	e2e.expect('#202 I2 a third super-characteristic is refused with a warning', await state(S), {
		stored: ['agility', 'brawn'],
		stars: ['brawn', 'agility'],
		notifications: [warning],
	});
	await e2e.step('#202 I3 Agility unmarked, Cunning marked', async () => {
		await flip(S, 'agility');
		await flip(S, 'cunning');
	});
	e2e.expect('#202 I3 unmarking one makes room for another', await state(S), {
		stored: ['brawn', 'cunning'],
		stars: ['brawn', 'cunning'],
		notifications: [],
	});
	await e2e.step('#114 I4 all Starting XP spent on Brawn, then Cunning unmarked and Agility marked', async () => {
		await page((name) => window.characterE2E.raise(name, 'brawn'), S);
		await e2e.settle();
		await flip(S, 'cunning');
		await flip(S, 'agility');
	});
	e2e.expect(
		'#114 I4 with no Starting XP left, during Character Creation, marking and unmarking is allowed',
		{
			xp: await page((name) => window.characterE2E.xp(name), S),
			...(await state(S)),
		},
		{ xp: 0, stored: ['agility', 'brawn'], stars: ['brawn', 'agility'], notifications: [] },
	);
	await e2e.step('#114 I5 an XP Award given', () => page((name) => window.characterE2E.award(name, 10, 'E2E award'), S));
	e2e.expect(
		'#114 I5 after an XP Award, the characteristics offer no super-characteristic menu',
		{
			menus: await page(async (name) => {
				const labels = [];
				for (const c of ['brawn', 'agility', 'intellect'] as const)
					labels.push(...(await window.characterE2E.menu(name, { characteristic: c })));
				return labels;
			}, S),
			...(await state(S)),
		},
		{ menus: [], stored: ['agility', 'brawn'], stars: ['brawn', 'agility'], notifications: [] },
	);
	await page((name) => window.characterE2E.close(name), S);

	await e2e.step('#202 I6 an actor given three super-characteristics by a macro marks Intellect, then unmarks Cunning', async () => {
		await page((name) => window.characterE2E.create(name), 'Super Three');
		await page(
			() => game.actors.getName('E2E Super Three').update({ 'system.superCharacteristics': ['brawn', 'agility', 'cunning'] }),
			undefined,
		);
		await page((name) => window.characterE2E.open(name), 'Super Three');
		await notifications();
		await flip('Super Three', 'intellect');
		e2e.expect('#202 I6 with three stored, marking a fourth is refused', await state('Super Three'), {
			stored: ['agility', 'brawn', 'cunning'],
			stars: ['brawn', 'agility', 'cunning'],
			notifications: [warning],
		});
		await flip('Super Three', 'cunning');
	});
	e2e.expect('#202 I6 with three stored, unmarking one leaves two', await state('Super Three'), {
		stored: ['agility', 'brawn'],
		stars: ['brawn', 'agility'],
		notifications: [],
	});
	await page((name) => window.characterE2E.close(name), 'Super Three');

	await e2e.step('#202 I7 a rival marks Brawn, Agility then Intellect', async () => {
		await page((name) => window.characterE2E.create(name, 'rival'), 'Super Rival');
		await page((name) => window.characterE2E.open(name), 'Super Rival');
		await notifications();
		await flip('Super Rival', 'brawn');
		await flip('Super Rival', 'agility');
		await flip('Super Rival', 'intellect');
	});
	e2e.expect('#202 I7 a rival is refused a third super-characteristic with a warning', await state('Super Rival'), {
		stored: ['agility', 'brawn'],
		stars: ['brawn', 'agility'],
		notifications: [warning],
	});
	await e2e.step('#202 I8 the rival unmarks Agility, marks Cunning', async () => {
		await flip('Super Rival', 'agility');
		await flip('Super Rival', 'cunning');
	});
	e2e.expect('#202 I8 a rival unmarking one can mark another', await state('Super Rival'), {
		stored: ['brawn', 'cunning'],
		stars: ['brawn', 'cunning'],
		notifications: [],
	});
	await page((name) => window.characterE2E.close(name), 'Super Rival');
	await page((rules) => window.e2e.setSettings(rules), { useSuperCharacteristics: false });
}
