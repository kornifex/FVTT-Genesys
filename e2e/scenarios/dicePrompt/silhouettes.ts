import type { PromptState, DicePromptContext } from './shared.ts';



export async function silhouettesPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, click, toggle, update, target, skillRoll, attack, rows, skiff } = ctx;
	const silhouetteRows = (state: PromptState) => state.modifications.filter(({ name }) => name.includes('Silhouette'));
	const setSilhouette = (actor: string, silhouette: number) => update({ actor }, { 'system.silhouette': silhouette });
	const rivalKnife = click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Knife >> .weapon-attack');
	// The rival's knife attacks with Ranged, which §#196 chooses in its own part, so that M2 rolls the rival's Agility.
	await update({ actor: 'Rival', item: 'Knife' }, { 'system.attackSkill': 'Ranged' });
	await setSilhouette('Rival', 3);
	await target('Rival');
	const atLarger = await opened(gm, attack('Pistol'));
	const largerOn = await toggle('Silhouette');
	const largerOff = await toggle('Silhouette');
	e2e.expect(
		'#380 M1 a silhouette 1 character attacking a silhouette 3 rival lists a target Pool Modification removing one Difficulty die, after the defense, which toggles',
		{
			rows: rows(atLarger),
			pool: atLarger.pool,
			on: { pool: largerOn.pool, rows: silhouetteRows(largerOn) },
			off: { pool: largerOff.pool, rows: silhouetteRows(largerOff) },
		},
		{
			rows: [
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
				{ name: 'From Self: E2E Sights', enabled: false, mods: 'B+' },
				{ name: 'From Target: E2E Hex', enabled: false, mods: 'S+' },
				{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+ S+' },
				{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' },
			],
			pool: 'PP|DD',
			on: { pool: 'PP|D', rows: [{ name: 'From Target: Silhouette (3 vs 1)', enabled: true, mods: 'D-' }] },
			off: { pool: 'PP|DD', rows: [{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' }] },
		},
	);

	await target('Mark');
	const atSmaller = await opened(gm, rivalKnife);
	const smallerOn = await toggle('Silhouette');
	e2e.expect(
		'#380 M2 a silhouette 3 rival attacking a silhouette 1 character lists a target Pool Modification adding one Difficulty die',
		{ actor: atSmaller.actor, rows: silhouetteRows(atSmaller), pool: atSmaller.pool, on: smallerOn.pool },
		{
			actor: 'Rival',
			rows: [{ name: 'From Target: Silhouette (1 vs 3)', enabled: false, mods: 'D+' }],
			pool: 'AAA|DD',
			on: 'AAA|DDD',
		},
	);

	await target('Rival');
	const unchanged: Record<string, unknown> = {};
	for (const silhouette of [2, 1]) {
		await setSilhouette('Rival', silhouette);
		unchanged[`rival at ${silhouette}`] = silhouetteRows(await opened(gm, attack('Pistol')));
	}
	await setSilhouette('Rival', 3);
	unchanged['skill check'] = silhouetteRows(await opened(gm, skillRoll('Cool')));
	unchanged['Dice Roller'] = rows(await opened(gm, () => gm.evaluate(() => ui.chat.processMessage('/gendr'))));
	await target(null);
	unchanged.untargeted = silhouetteRows(await opened(gm, attack('Pistol')));
	e2e.expect(
		"#380 M3 a silhouette difference of 1 or 0, a check that isn't an attack, the bare Dice Roller and an untargeted attack change nothing",
		unchanged,
		{ 'rival at 2': [], 'rival at 1': [], 'skill check': [], 'Dice Roller': [], untargeted: [] },
	);

	// §#390: a vehicle keeps the silhouette 0 its data starts at until someone edits it, and a character is at 1.
	await target('Wagon');
	e2e.expect(
		'#380 M7 a silhouette 1 character attacking a vehicle whose silhouette nobody edited, at 0, gets no silhouette modification',
		{
			wagon: await gm.evaluate(() => {
				const wagon = window.e2e.actor('Wagon');
				return { silhouette: wagon.system.silhouette, stored: wagon._source.system.silhouette };
			}),
			rows: silhouetteRows(await opened(gm, attack('Pistol'))),
		},
		{ wagon: { silhouette: 0, stored: 0 }, rows: [] },
	);

	await setSilhouette('Wagon', 3);
	e2e.expect(
		'#380 M4 a silhouette 1 character attacking a silhouette 3 vehicle lists one Difficulty die removed',
		silhouetteRows(await opened(gm, attack('Pistol'))),
		[{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' }],
	);

	await setSilhouette('Skiff', 3);
	await target('Mark');
	const cannonAtMark = await opened(gm, click(gm, skiff, '.tab-combat .weapon .name button|E2E Cannon'));
	const cannonOn = await toggle('Silhouette');
	e2e.expect(
		"#380 M5 a silhouette 1 crew member firing a silhouette 3 vehicle's weapon at a silhouette 1 character adds one Difficulty die, from the vehicle's silhouette",
		{
			actor: cannonAtMark.actor,
			rows: silhouetteRows(cannonAtMark),
			pool: cannonAtMark.pool,
			on: cannonOn.pool,
			ownWeapon: silhouetteRows(await opened(gm, attack('Pistol'))),
		},
		{
			actor: 'Ada',
			rows: [{ name: 'From Target: Silhouette (1 vs 3)', enabled: false, mods: 'D+' }],
			pool: 'AA|DD',
			on: 'AA|DDD',
			ownWeapon: [],
		},
	);

	await gm.evaluate(() =>
		game.actors
			.getName('E2E Mark')
			.createEmbeddedDocuments('ActiveEffect', [
				{ name: 'E2E Giant', changes: [{ key: 'system.silhouette', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: '2' }] },
			]),
	);
	const markSilhouette = () =>
		gm.evaluate(() => {
			const mark = game.actors.getName('E2E Mark');
			return { silhouette: mark.system.silhouette, stored: mark._source.system.silhouette };
		});
	e2e.expect(
		"#380 M6 an Active Effect adding 2 to a character's silhouette makes it 3 for the rule: a silhouette 1 attacker loses one Difficulty die",
		{ mark: await markSilhouette(), rows: silhouetteRows(await opened(gm, attack('Pistol'))) },
		{
			mark: { silhouette: 3, stored: 1 },
			rows: [{ name: 'From Target: Silhouette (3 vs 1)', enabled: false, mods: 'D-' }],
		},
	);

	await gm.evaluate(async () => {
		const mark = game.actors.getName('E2E Mark');
		await mark.deleteEmbeddedDocuments('ActiveEffect', [mark.effects.getName('E2E Giant').id]);
	});
	await setSilhouette('Rival', 1);
	await setSilhouette('Wagon', 0);
	await setSilhouette('Skiff', 0);
	await target(null);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('silhouette end');
}
