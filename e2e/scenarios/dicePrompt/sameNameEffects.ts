import type { PromptState, DicePromptContext } from './shared.ts';



export async function sameNameEffectsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, select, toggle, characteristicRoll, rows } = ctx;
	const poolAndRows = (state: PromptState) => ({ pool: state.pool, rows: rows(state) });
	// The pool and the rows of an Intellect check, once the first Ring is turned on.
	const ringsCheck = async (name: string) => {
		await opened(gm, characteristicRoll(3, { actor: name }));
		return poolAndRows(await toggle('E2E Ring'));
	};
	const ring = (enabled: boolean, mods: string) => ({ name: 'From Self: E2E Ring', enabled, mods });
	e2e.expect(
		'#445 O1 one item with two effects named alike: turning on the first applies its upgrade only',
		await ringsCheck('Ring Bearer'),
		{
			pool: 'P|DD',
			rows: [ring(true, 'A^'), ring(false, 'D^')],
		},
	);
	e2e.expect('#445 O2 two copies of an item: turning on the first applies its upgrade only', await ringsCheck('Twin Rings'), {
		pool: 'P|DD',
		rows: [ring(true, 'A^'), ring(false, 'A^')],
	});
	e2e.expect(
		'#445 O3 two copies of an item upgrading once and twice: turning on the first applies its upgrade only',
		await ringsCheck('Uneven Rings'),
		{ pool: 'P|DD', rows: [ring(true, 'A^'), ring(false, 'A^ A^')] },
	);
	const brawnCheck = await select('characteristic', 'brawn');
	e2e.expect('#445 O4 switching the characteristic keeps each of them in its own state', poolAndRows(brawnCheck), {
		pool: 'P|DD',
		rows: [ring(true, 'A^'), ring(false, 'A^ A^')],
	});
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('O end');
}
