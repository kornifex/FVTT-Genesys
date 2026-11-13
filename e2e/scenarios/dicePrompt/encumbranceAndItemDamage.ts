import type { Doc, PromptState, DicePromptContext } from './shared.ts';

export async function encumbranceAndItemDamagePart(ctx: DicePromptContext) {
	const { e2e, gm, opened, noPrompt, click, select, toggle, update, characteristicRoll, attack, skiff } = ctx;
	const hindrances = (state: PromptState) => state.modifications.filter(({ name }) => /Encumbrance|Damage/.test(name));
	const setDamage = (doc: Doc, damage: string) => update(doc, { 'system.damage': damage });
	const pistol = { actor: 'Ada', item: 'Pistol' };
	const cannon = { actor: 'Skiff', item: 'Cannon' };
	const fireCannon = click(gm, skiff, '.tab-combat .weapon .name button|E2E Cannon');
	const encumbrance = await gm.evaluate(async () => {
		const ada = game.actors.getName('E2E Ada');
		const { value, threshold } = ada.system.currentEncumbrance;
		await ada.createEmbeddedDocuments('Item', [{ name: 'E2E Anvil', type: 'gear', system: { encumbrance: threshold - value + 2 } }]);
		return ada.system.currentEncumbrance;
	});

	await opened(gm, characteristicRoll(1));
	const athletics = await select('skill', 'Athletics (Br)');
	const athleticsOn = await toggle('Encumbrance');
	const athleticsOff = await toggle('Encumbrance');
	e2e.expect(
		"#668 V1 an encumbered character's Athletics check lists one Setback per point over the threshold, which toggles; an Intellect check none (CRB p. 85)",
		{
			encumbrance,
			rows: hindrances(athletics),
			on: athleticsOn.pool,
			off: athleticsOff.pool,
			intellect: hindrances(await opened(gm, characteristicRoll(3))),
		},
		{
			encumbrance: { value: 10, threshold: 8 },
			rows: [{ name: 'From Self: Encumbrance (10 vs 8)', enabled: false, mods: 'S+ S+' }],
			on: 'AAA|DDSS',
			off: 'AAA|DD',
			intellect: [],
		},
	);

	await setDamage(pistol, 'moderate');
	await setDamage(cannon, 'minor');
	const pistolAttack = await opened(gm, attack('Pistol'));
	const pistolOn = await toggle('Moderate Damage');
	const cannonAttack = await opened(gm, fireCannon);
	e2e.expect(
		"#668 V2 an attack with a weapon at moderate damage lists one more Difficulty die, a vehicle weapon's minor damage a Setback, after the encumbrance (CRB p. 89)",
		{
			pistol: { rows: hindrances(pistolAttack), on: pistolOn.pool },
			cannon: { actor: cannonAttack.actor, rows: hindrances(cannonAttack) },
		},
		{
			pistol: {
				rows: [
					{ name: 'From Self: Encumbrance (10 vs 8)', enabled: false, mods: 'S+ S+' },
					{ name: 'From Self: E2E Pistol (Moderate Damage)', enabled: false, mods: 'D+' },
				],
				on: 'PP|DDD',
			},
			cannon: {
				actor: 'Ada',
				rows: [
					{ name: 'From Self: Encumbrance (10 vs 8)', enabled: false, mods: 'S+ S+' },
					{ name: 'From Self: E2E Cannon (Minor Damage)', enabled: false, mods: 'S+' },
				],
			},
		},
	);

	await setDamage(pistol, 'major');
	await setDamage(cannon, 'major');
	const refused = { pistol: await noPrompt(gm, attack('Pistol')), cannon: await noPrompt(gm, fireCannon) };
	// The weapon takes major damage while its prompt is open: the roll is refused.
	await setDamage(pistol, 'undamaged');
	await opened(gm, attack('Pistol'));
	await setDamage(pistol, 'major');
	await gm.evaluate(() => window.dicePromptE2E.clearNotifications());
	const rolled = await gm.evaluate(() => window.dicePromptE2E.promptRollTried());
	const whileOpen = { ...rolled, notifications: await gm.evaluate(() => window.dicePromptE2E.notifications()) };
	e2e.expect(
		"#668 V3 a weapon at major damage can't attack, from the Combat tab, a vehicle's sheet or a prompt opened before the damage (CRB p. 89)",
		{ refused, whileOpen },
		{
			refused: {
				pistol: { prompts: 0, notifications: ["warning: E2E Pistol can't attack: it has Major Damage."] },
				cannon: { prompts: 0, notifications: ["warning: E2E Cannon can't attack: it has Major Damage."] },
			},
			whileOpen: { posted: false, notifications: ["warning: E2E Pistol can't attack: it has Major Damage."] },
		},
	);
	await e2e.step('V end');
}
