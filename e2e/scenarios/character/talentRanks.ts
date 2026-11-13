import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#242: a talent's numeric changes count once per rank, on every Foundry version. */
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
								// v14 keeps a number as a number, where v13 turns it into a string.
								changes: [
									{ key: 'system.soak', mode: 2, value: '1' },
									{ key: 'system.soak', mode: 2, value: 2 },
								],
							},
						],
					},
				]),
			R,
		),
	);
	e2e.expect('#242 A1 each numeric change of a rank 3 talent counts three times', { added: (await soak()) - before }, { added: 9 });
}
