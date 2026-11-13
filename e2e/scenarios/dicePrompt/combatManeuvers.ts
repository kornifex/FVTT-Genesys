import type { PromptState, DicePromptContext } from './shared.ts';

export async function combatManeuversPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, click, toggle, roll, target, ada, skillRoll, attack, named } = ctx;
	const maneuver = (name: string) => click(gm, ada, `.tab-combat .maneuvers button|${name}`);
	const maneuverRows = (state: PromptState) => state.modifications.filter(({ name }) => /Aim|Guarded Stance/.test(name));
	const targetRows = (state: PromptState) => named(state, 'From Target');
	// Ada's effects that hold a status, with their rounds left when they lapse, and her total defense.
	const adaState = () =>
		gm.evaluate(() => {
			const ada = game.actors.getName('E2E Ada');
			return {
				effects: ada.effects.contents
					.filter((effect: { statuses: Set<string> }) => effect.statuses.size > 0)
					.map((effect: { name: string; statuses: Set<string>; lapsingRounds?: number }) => ({
						name: effect.name,
						statuses: [...effect.statuses],
						rounds: effect.lapsingRounds ?? null,
					})),
				defense: ada.system.totalDefense,
			};
		});
	// The maneuver buttons of Ada's open sheet, as its last render shows them: their text, whether they show pressed, and
	// the localization key of their tooltip.
	const maneuverButtons = () =>
		gm.evaluate(async () => {
			await window.e2e.settle();
			const root = game.actors.getName('E2E Ada').sheet.element as HTMLElement;
			return [...root.querySelectorAll<HTMLElement>('.tab-combat .maneuvers button')].map((button) => ({
				text: window.e2e.text(button),
				pressed: button.getAttribute('aria-pressed'),
				tooltip: button.dataset.tooltip ?? null,
			}));
		});
	const setMarkState = (id: string, active: boolean) =>
		gm.evaluate((args) => window.e2e.token('Mark').actor.toggleStatusEffect(args.id, { active: args.active }), { id, active });

	// An attack without a target, before any state, as a reference.
	const before = await opened(gm, attack('Pistol'));
	const beforeRoll = await roll();

	// The status menu of a character's and of a vehicle's token: its cover and prone states, the ids of its first states,
	// as many as the system's states it offers, and the statuses offered to every actor type that it leaves out.
	const menu = await gm.evaluate(async () => {
		const read = async (name: string, states: number) => {
			const token = window.e2e.token(name);
			token.control({ releaseOthers: true });
			await canvas.hud.token.bind(token);
			const icons = [...canvas.hud.token.element.querySelectorAll('.effect-control')] as HTMLElement[];
			const ids = icons.map((icon) => icon.dataset.statusId);
			const shown = icons
				.filter((icon) => ['cover', 'prone'].includes(icon.dataset.statusId ?? ''))
				.map((icon) => ({ id: icon.dataset.statusId, title: icon.dataset.tooltipText, img: icon.getAttribute('src') }));
			await canvas.hud.token.close();
			token.release();
			const missing = CONFIG.statusEffects
				.filter((status: { hud?: unknown }) => status.hud === undefined || status.hud === true)
				.map(({ id }: { id: string }) => id)
				.filter((id: string) => !ids.includes(id));
			return {
				shown: shown.sort((left, right) => String(left.id).localeCompare(String(right.id))),
				first: ids.slice(0, states),
				missing,
			};
		};
		// A vehicle takes neither cover nor prone: its menu starts with the four other states.
		return { Mark: await read('Mark', 6), Wagon: await read('Wagon', 4) };
	});
	e2e.expect(
		"#683 M0 a character's status menu offers In Cover and a single Prone, the system's; a vehicle's offers neither",
		{ Mark: menu.Mark.shown, Wagon: menu.Wagon.shown },
		{
			Mark: [
				{ id: 'cover', title: 'In Cover', img: 'icons/svg/barrel.svg' },
				{ id: 'prone', title: 'Prone', img: 'icons/svg/falling.svg' },
			],
			Wagon: [],
		},
	);
	e2e.expect(
		"#765 M0 the status menu lists the system's states first, in their order, and every other status still",
		{ Mark: { first: menu.Mark.first, missing: menu.Mark.missing }, Wagon: { first: menu.Wagon.first, missing: menu.Wagon.missing } },
		{
			Mark: { first: ['immobilized', 'disoriented', 'staggered', 'cover', 'prone', 'incapacitated'], missing: [] },
			Wagon: { first: ['immobilized', 'disoriented', 'staggered', 'incapacitated'], missing: [] },
		},
	);

	// Aim, then attacks.
	await e2e.step("#683 M1 GM clicks Aim on Ada's Combat tab", maneuver('Aim'));
	const aimButtons = await maneuverButtons();
	const cool = await opened(gm, skillRoll('Cool'));
	const aimed = await opened(gm, attack('Spear'));
	const boosted = await toggle('Aim');
	const aimedRoll = await roll();
	const usedUp = await adaState();
	const usedUpButtons = await maneuverButtons();
	const next = await opened(gm, attack('Spear'));
	e2e.expect(
		'#763 M1 the Aim button shows pressed with its Boost while Ada aims, and no longer once her attack used Aim up',
		{ aiming: aimButtons, usedUp: usedUpButtons },
		{
			aiming: [
				{ text: 'AimB', pressed: 'true', tooltip: 'Genesys.Maneuvers.Aim.HintAgain' },
				{ text: 'Guarded Stance', pressed: 'false', tooltip: 'Genesys.Maneuvers.GuardedStance.Hint' },
			],
			usedUp: [
				{ text: 'Aim', pressed: 'false', tooltip: 'Genesys.Maneuvers.Aim.Hint' },
				{ text: 'Guarded Stance', pressed: 'false', tooltip: 'Genesys.Maneuvers.GuardedStance.Hint' },
			],
		},
	);
	e2e.expect(
		'#683 M1 after Aim, the next melee attack lists its Boost and rolls it; the attack uses it up, and the one after lists none',
		{
			cool: maneuverRows(cool),
			aimed: maneuverRows(aimed),
			pool: boosted.pool,
			formula: aimedRoll.formula,
			effects: usedUp.effects,
			next: maneuverRows(next),
		},
		{
			cool: [],
			aimed: [{ name: 'From Self: Aim', enabled: false, mods: 'B+' }],
			pool: 'PPPB|DD',
			formula: '3dp + 0da + 2di + 1db',
			effects: [],
			next: [],
		},
	);

	await e2e.step('#683 M2 GM clicks Aim twice', async () => {
		for (let time = 0; time < 2; time++) await maneuver('Aim')();
	});
	const twice = await opened(gm, attack('Pistol'));
	e2e.expect(
		'#683 M2 two Aim maneuvers in a row give two Boosts to the next ranged attack, on one effect',
		{ rows: maneuverRows(twice), effects: (await adaState()).effects, buttons: await maneuverButtons() },
		{
			rows: [{ name: 'From Self: Aim', enabled: false, mods: 'B+ B+' }],
			effects: [{ name: 'Aim', statuses: ['aim'], rounds: null }],
			buttons: [
				{ text: 'AimBB', pressed: 'true', tooltip: 'Genesys.Maneuvers.Aim.TakeBack' },
				{ text: 'Guarded Stance', pressed: 'false', tooltip: 'Genesys.Maneuvers.GuardedStance.Hint' },
			],
		},
	);

	// Guarded Stance.
	await e2e.step("#683 M3 GM clicks Guarded Stance on Ada's Combat tab", maneuver('Guarded Stance'));
	const guarded = await opened(gm, attack('Spear'));
	const guardedCool = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		"#683 M3 Guarded Stance lasts 1 round, brings a Setback to Ada's attacks but not to her other checks, and raises her melee defense",
		{ rows: maneuverRows(guarded), cool: maneuverRows(guardedCool), state: await adaState(), buttons: await maneuverButtons() },
		{
			rows: [
				{ name: 'From Self: Aim', enabled: false, mods: 'B+ B+' },
				{ name: 'From Self: Guarded Stance', enabled: false, mods: 'S+' },
			],
			cool: [],
			state: {
				effects: [
					{ name: 'Aim', statuses: ['aim'], rounds: null },
					{ name: 'Guarded Stance', statuses: ['guardedStance'], rounds: 1 },
				],
				defense: { melee: 1, ranged: 0 },
			},
			buttons: [
				{ text: 'AimBB', pressed: 'true', tooltip: 'Genesys.Maneuvers.Aim.TakeBack' },
				{ text: 'Guarded Stance', pressed: 'true', tooltip: 'Genesys.Maneuvers.GuardedStance.TakeBack' },
			],
		},
	);

	// A click on a maneuver that is on takes it back, Aim once it gives its two Boosts.
	await e2e.step('#763 M3 GM clicks Aim a third time, and Guarded Stance a second time', async () => {
		await maneuver('Aim')();
		await maneuver('Guarded Stance')();
	});
	e2e.expect(
		"#763 M3 the third Aim and the second Guarded Stance take them back: Ada's effects are gone, and her buttons no longer pressed",
		{ state: await adaState(), buttons: await maneuverButtons() },
		{
			state: { effects: [], defense: { melee: 0, ranged: 0 } },
			buttons: [
				{ text: 'Aim', pressed: 'false', tooltip: 'Genesys.Maneuvers.Aim.Hint' },
				{ text: 'Guarded Stance', pressed: 'false', tooltip: 'Genesys.Maneuvers.GuardedStance.Hint' },
			],
		},
	);

	// Prone and In Cover on the target.
	await target('Mark');
	await e2e.step("#683 M4 GM puts Prone on Mark's token, and targets it", () => setMarkState('prone', true));
	const proneRanged = await opened(gm, attack('Pistol'));
	const proneMelee = await opened(gm, attack('Spear'));
	e2e.expect(
		'#683 M4 an attack against a prone target lists a Setback at range and a Boost in melee',
		{ ranged: targetRows(proneRanged), melee: targetRows(proneMelee) },
		{
			ranged: [{ name: 'From Target: Prone', enabled: false, mods: 'S+' }],
			melee: [{ name: 'From Target: Prone', enabled: false, mods: 'B+' }],
		},
	);

	await e2e.step("#683 M5 GM takes Prone off Mark's token and puts In Cover on it", async () => {
		await setMarkState('prone', false);
		await setMarkState('cover', true);
	});
	const coverRanged = await opened(gm, attack('Pistol'));
	const coverMelee = await opened(gm, attack('Spear'));
	e2e.expect(
		'#683 M5 an attack against a target in cover lists its ranged defense 1 at range, nothing in melee',
		{ ranged: targetRows(coverRanged), melee: targetRows(coverMelee) },
		{ ranged: [{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+' }], melee: [] },
	);

	// Without a target, the attacker adds cover's and prone's dice by hand.
	await e2e.step('#683 M6 GM puts Prone back on Mark, removes Aim and Guarded Stance from Ada, and targets nobody', async () => {
		await setMarkState('prone', true);
		await target(null);
		await gm.evaluate(async () => {
			const ada = game.actors.getName('E2E Ada');
			const ids = ada.effects.contents
				.filter((effect: { statuses: Set<string> }) => effect.statuses.size > 0)
				.map((effect: { id: string }) => effect.id);
			await ada.deleteEmbeddedDocuments('ActiveEffect', ids);
		});
	});
	const untargeted = await opened(gm, attack('Pistol'));
	const untargetedRoll = await roll();
	e2e.expect(
		'#683 M6 an attack without a target lists and rolls the same as before any maneuver or state',
		{ rows: untargeted.modifications, pool: untargeted.pool, formula: untargetedRoll.formula },
		{ rows: before.modifications, pool: before.pool, formula: beforeRoll.formula },
	);

	// A player who observes Ada attacks after her Aim: the Acting GM uses it up.
	await e2e.step("#683 M7 GM gives the player Ada's sheet as an observer, and clicks Aim", async () => {
		await gm.evaluate((user) => window.e2e.setOwnership(window.e2e.actor('Ada'), user, 'OBSERVER'), e2e.playerUser);
		await maneuver('Aim')();
	});
	const observed = await opened(player, click(player, ada, '.tab-combat .weapon .name button|E2E Spear'));
	const observerButtons = await player.evaluate(() =>
		window.dicePromptE2E.texts({ doc: { actor: 'Ada' }, selector: '.tab-combat .maneuvers button' }),
	);
	await e2e.step('#683 M7 the player rolls the attack', () => player.evaluate(() => window.dicePromptE2E.promptRoll()));
	e2e.expect(
		"#683 M7 an observer's attack lists Ada's Aim and uses it up through the GM; the observer's sheet offers no maneuver",
		{ rows: maneuverRows(observed), buttons: observerButtons, effects: (await adaState()).effects },
		{ rows: [{ name: 'From Self: Aim', enabled: false, mods: 'B+' }], buttons: [], effects: [] },
	);

	// Prone on the attacker: a Setback on their own melee attacks only (§#696, CRB p. 108).
	const setAdaProne = (active: boolean) =>
		gm.evaluate((active) => game.actors.getName('E2E Ada').toggleStatusEffect('prone', { active }), active);
	await e2e.step('#696 M8 GM puts Prone on Ada', () => setAdaProne(true));
	const ownProneRows = (state: PromptState) => named(state, 'From Self: Prone');
	const proneSpear = await opened(gm, attack('Spear'));
	const pronePistol = await opened(gm, attack('Pistol'));
	const proneMeleeCheck = await opened(gm, skillRoll('Melee'));
	const proneCool = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		"#696 M8 a prone character's melee attack lists a Setback from Prone; their ranged attack and their checks that aren't attacks don't",
		{
			spear: ownProneRows(proneSpear),
			pistol: ownProneRows(pronePistol),
			melee: ownProneRows(proneMeleeCheck),
			cool: ownProneRows(proneCool),
		},
		{ spear: [{ name: 'From Self: Prone', enabled: false, mods: 'S+' }], pistol: [], melee: [], cool: [] },
	);
	await e2e.step('#696 M8 GM takes Prone off Ada', () => setAdaProne(false));

	// Cover and armor both provide defense, which doesn't stack: the target keeps the best (§#724, CRB p. 106).
	// Mark's armor, replaced by one of a defense, or taken off.
	const markArmor = (defense: number | null) =>
		gm.evaluate(async (defense) => {
			const mark = window.e2e.token('Mark').actor;
			const worn = mark.items.filter((item: { type: string }) => item.type === 'armor').map((item: { id: string }) => item.id);
			await mark.deleteEmbeddedDocuments('Item', worn);
			if (defense !== null) {
				await mark.createEmbeddedDocuments('Item', [{ name: 'E2E Shield', type: 'armor', system: { state: 'equipped', defense } }]);
			}
		}, defense);
	await e2e.step('#724 M9 GM takes Prone off Mark, in cover, gives him an armor with defense 1, and targets him', async () => {
		await setMarkState('prone', false);
		await markArmor(1);
		await target('Mark');
	});
	const coveredArmor = await opened(gm, attack('Pistol'));
	e2e.expect(
		'#724 M9 an attack at range against a target in cover with an armor of defense 1 lists one Setback from defense, not two',
		{ rows: targetRows(coveredArmor), defense: await gm.evaluate(() => window.e2e.token('Mark').actor.system.totalDefense) },
		{ rows: [{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+' }], defense: { melee: 1, ranged: 1 } },
	);
	await e2e.step('#724 M9 GM takes the armor and cover off Mark, and targets nobody', async () => {
		await markArmor(null);
		await setMarkState('cover', false);
		await target(null);
	});
	await e2e.step('combat maneuvers end');
}
