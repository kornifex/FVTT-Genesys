import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#242, #962: a ranked talent's numeric changes count once per rank, an unranked one's once. */
export async function talentRanks(e2e: ScenarioContext, page: Evaluate) {
	const R = 'Ranked';
	const soak = async () => (await page((name) => window.characterE2E.appliedEffects(name), R)).soak;
	await e2e.step('#242 A0 a character without talents', () => page((name) => window.characterE2E.create(name), R));
	const before = await soak();
	await e2e.step('#242 A1 a rank 3 talent added, whose effect adds 1 and 2 to the soak', () =>
		page(
			(name) =>
				window.characterE2E.createItems(name, [
					{
						name: 'E2E Hardened',
						type: 'talent',
						system: { activation: { type: 'passive', detail: '' }, tier: 1, ranked: 'yes', rank: 3 },
						effects: [
							{
								name: 'E2E Hardened',
								transfer: true,
								system: {
									changes: [
										{ key: 'system.soak', type: 'add', value: 1 },
										{ key: 'system.soak', type: 'add', value: 2 },
									],
								},
							},
						],
					},
				]),
			R,
		),
	);
	e2e.expect('#242 A1 each numeric change of a rank 3 talent counts three times', { added: (await soak()) - before }, { added: 9 });
	await e2e.step('#962 A2 the talent made unranked, keeping its rank 3', () =>
		page((name) => game.actors.getName(`E2E ${name}`).items.getName('E2E Hardened').update({ 'system.ranked': 'no' }), R),
	);
	e2e.expect(
		'#962 A2 each numeric change of an unranked talent counts once, whatever rank it kept',
		{ added: (await soak()) - before },
		{ added: 3 },
	);
}
