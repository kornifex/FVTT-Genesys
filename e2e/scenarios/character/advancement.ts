import type { ScenarioContext } from '../../scenario.ts';
import type { Characteristic, Evaluate } from './shared.ts';

/** §#36, §#114, §#130, §#198: spending XP from the sheet, awarding it, and undoing each kind of entry. */
export async function advancement(
	e2e: ScenarioContext,
	page: Evaluate,
	notified: (key: string, data?: Record<string, unknown>) => Promise<string>,
	notifications: () => Promise<string[]>,
) {
	const A = 'Advancer';
	const xp = () => page((name) => window.characterE2E.xp(name), A);
	const journalTail = async (count: number) => (await page((name) => window.characterE2E.journal(name), A)).slice(-count);
	const characteristic = (c: Characteristic) => page((args) => window.characterE2E.characteristic(args.actor, args.c), { actor: A, c });
	const skills = (names: string[]) => page((args) => window.characterE2E.skills(args.actor, args.names), { actor: A, names });
	const talent = (name: string) => page((args) => window.characterE2E.talent(args.actor, args.name), { actor: A, name });
	const drop = (item: string) =>
		page((args) => window.characterE2E.drop(args.actor, window.characterE2E.worldItem(args.item)), { actor: A, item });
	const undo = (entry: string) => page((args) => window.characterE2E.undo(args.actor, args.entry), { actor: A, entry });
	// Undoes an entry, which asks first unless the undo is refused, and answers the dialog; the dialog read, or null when
	// none opens or the entry is gone.
	const undoAndAnswer = (entry: string, answer: 'yes' | 'no') =>
		page(async (args) => ((await window.characterE2E.undo(args.actor, args.entry)) ? window.e2e.answerConfirm(args.answer) : null), {
			actor: A,
			entry,
			answer,
		});
	// The question asked before an undo (§#432).
	const undoQuestion = (content: string) => ({
		application: 'DialogV2',
		title: 'Undo Entry',
		content,
		buttons: ['yes', 'no'],
		defaultButton: 'no',
	});
	const setHouseRules = (rules: Record<string, unknown>) => page((rules) => window.e2e.setSettings(rules), rules);
	const reopen = () => page((name) => window.characterE2E.reopen(name), A);

	await e2e.step('#36 B0 a character with an Archetype giving 1000 XP', async () => {
		await page((name) => window.characterE2E.create(name), A);
		await page((name) => window.characterE2E.open(name), A);
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), A);
	});
	e2e.expect('#36 B0 the character starts with 1000 XP', await xp(), 1000);

	// Raising each characteristic from 2 to 3 costs 30 XP; Brawn raises the wound threshold, Willpower the strain one.
	const raised: [Characteristic, { wounds: number; strain: number }][] = [
		['brawn', { wounds: 13, strain: 12 }],
		['agility', { wounds: 13, strain: 12 }],
		['intellect', { wounds: 13, strain: 12 }],
		['cunning', { wounds: 13, strain: 12 }],
		['willpower', { wounds: 13, strain: 13 }],
		['presence', { wounds: 13, strain: 13 }],
	];
	let spent = 0;
	for (const [c, thresholds] of raised) {
		await e2e.step(`#36 B1 ${c} raised from the Skills tab`, () =>
			page((args) => window.characterE2E.raise(args.actor, args.c), { actor: A, c }),
		);
		spent += 30;
		e2e.expect(
			`#36 B1 raising ${c} from 2 costs 30 XP and shows 3${c === 'brawn' ? ', with the wound threshold' : c === 'willpower' ? ', with the strain threshold' : ''}`,
			{ ...(await characteristic(c)), xp: await xp(), thresholds: await page((name) => window.characterE2E.thresholds(name), A) },
			{ base: 3, shown: 3, sheet: '3', canRaise: true, xp: 1000 - spent, thresholds },
		);
	}
	await e2e.step('#36 B2 Brawn raised again', () => page((name) => window.characterE2E.raise(name, 'brawn'), A));
	spent += 40;
	e2e.expect(
		'#36 B2 raising Brawn from 3 costs 40 XP',
		{ ...(await characteristic('brawn')), xp: await xp() },
		{
			base: 4,
			shown: 4,
			sheet: '4',
			canRaise: true,
			xp: 1000 - spent,
		},
	);

	e2e.expect(
		'#36 B2 once XP is spent, the Archetype can no longer be removed',
		await page((name) => window.characterE2E.menu(name, { meta: 'archetype' }), A),
		[await page(() => game.i18n.localize('Genesys.Labels.Edit'), undefined)],
	);

	// Skills: career and non-career ranks, the rank 2 cap, Free Ranks and career marks.
	await e2e.step('#114 C1 Ranged marked as a career skill from its menu', () =>
		page((name) => window.characterE2E.menu(name, { skill: 'Ranged' }, 'Genesys.Labels.MarkCareerSkill'), A),
	);
	e2e.expect(
		'#114 C1 marking a career skill shows its star and spends no XP',
		{ ...(await skills(['Ranged'])), xp: await xp() },
		{
			Ranged: { rank: 0, career: true, star: true, canBuy: true },
			xp: 1000 - spent,
		},
	);
	await e2e.step('#36 C2 Ranged rank 1 bought', () => page((name) => window.characterE2E.buySkill(name, 'Ranged'), A));
	spent += 5;
	e2e.expect(
		'#36 C2 a career skill rank 1 costs 5 XP',
		{ ...(await skills(['Ranged'])), xp: await xp(), entry: await journalTail(1) },
		{
			Ranged: { rank: 1, career: true, star: true, canBuy: true },
			xp: 1000 - spent,
			entry: ['Skill -5 Ranged 1'],
		},
	);
	await e2e.step('#36 C3 Ranged rank 2 bought', () => page((name) => window.characterE2E.buySkill(name, 'Ranged'), A));
	spent += 10;
	e2e.expect(
		'#36 C3 a career skill rank 2 costs 10 XP, and no rank 3 can be bought during Character Creation',
		{ ...(await skills(['Ranged'])), xp: await xp() },
		{ Ranged: { rank: 2, career: true, star: true, canBuy: false }, xp: 1000 - spent },
	);
	await e2e.step('#36 C4 Cool rank 1 bought, counting the writes', async () => {
		await page((name) => window.characterE2E.startCounting(name), A);
		await page((name) => window.characterE2E.buySkill(name, 'Cool'), A);
	});
	spent += 10;
	const coolWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.log('#36 C4 sheet renders while buying a skill rank', coolWrites.renders);
	e2e.expect(
		'#36 C4 a non-career skill rank 1 costs 10 XP',
		{ ...(await skills(['Cool'])), xp: await xp() },
		{
			Cool: { rank: 1, career: false, star: false, canBuy: true },
			xp: 1000 - spent,
		},
	);
	e2e.expect(
		'#36 C4 a bought skill rank is one item update and one actor update',
		{ updateItem: coolWrites.updateItem, updateActor: coolWrites.updateActor, createItem: coolWrites.createItem },
		{ updateItem: 1, updateActor: 1, createItem: 0 },
	);
	await e2e.step('#114 C5 Mechanics marked then unmarked as a career skill', async () => {
		await page((name) => window.characterE2E.menu(name, { skill: 'Mechanics' }, 'Genesys.Labels.MarkCareerSkill'), A);
		await e2e.settle();
		await page((name) => window.characterE2E.menu(name, { skill: 'Mechanics' }, 'Genesys.Labels.UnmarkCareerSkill'), A);
	});
	e2e.expect('#114 C5 unmarking a career skill takes its star away', (await skills(['Mechanics'])).Mechanics, {
		rank: 0,
		career: false,
		star: false,
		canBuy: true,
	});
	const journalBeforeFreeRanks = await page((name) => window.characterE2E.journal(name), A);
	await e2e.step('#114 C6 Free Rank up on Stealth', () =>
		page((name) => window.characterE2E.menu(name, { skill: 'Stealth' }, 'Genesys.Labels.FreeRankUp'), A),
	);
	e2e.expect(
		'#114 C6 a Free Rank up raises the rank without spending XP',
		{
			rank: (await skills(['Stealth'])).Stealth?.rank,
			xp: await xp(),
			journal: await page((name) => window.characterE2E.journal(name), A),
		},
		{ rank: 1, xp: 1000 - spent, journal: journalBeforeFreeRanks },
	);
	await e2e.step('#114 C7 Free Rank down on Stealth twice', async () => {
		await page((name) => window.characterE2E.menu(name, { skill: 'Stealth' }, 'Genesys.Labels.FreeRankDown'), A);
		await e2e.settle();
		await page((name) => window.characterE2E.menu(name, { skill: 'Stealth' }, 'Genesys.Labels.FreeRankDown'), A);
	});
	e2e.expect(
		'#114 C7 a Free Rank down stops at 0, with no journal entry',
		{
			rank: (await skills(['Stealth'])).Stealth?.rank,
			xp: await xp(),
			journal: await page((name) => window.characterE2E.journal(name), A),
		},
		{ rank: 0, xp: 1000 - spent, journal: journalBeforeFreeRanks },
	);

	// Talents: a new talent with an effect, undone; ranks from the tab and by drop; the House Rules.
	await e2e.step('#36 D1 a talent with an Active Effect dropped', () => drop('Steady'));
	spent += 5;
	const steady = await page(() => {
		const actor = game.actors.getName('E2E Advancer');
		const item = actor.items.getName('E2E Steady');
		return { idInJournal: actor.system.experienceJournal.entries.at(-1).data.id === item?.id };
	}, undefined);
	e2e.expect(
		"#36 D1 a dropped new talent costs 5 XP per tier, is created with its journal entry's id, and its effect applies",
		{ ...steady, ...(await page((name) => window.characterE2E.appliedEffects(name), A)), xp: await xp(), entry: await journalTail(1) },
		{ idInJournal: true, effects: ['E2E Steady'], soak: 1, xp: 1000 - spent, entry: ['NewTalent -5 E2E Steady tier 1 rank 1'] },
	);
	// §#252, §#432: an undo that deletes an item asks first, saying what it does.
	let asked: Awaited<ReturnType<typeof undoAndAnswer>> = null;
	await e2e.step("#252 C4 the new talent's entry undone from the Experience Journal, and No answered", async () => {
		asked = await undoAndAnswer('NewTalent -5 E2E Steady', 'no');
	});
	e2e.expect(
		'#252 C4 undoing a new talent asks in a dialog naming the talent, No by default, and No keeps the talent, its entry and its XP',
		{ asked, rank: (await talent('E2E Steady'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{
			asked: undoQuestion(
				'Undo the purchase of the talent E2E Steady? The talent is deleted from the character. The character gets back the 5 XP it cost.',
			),
			rank: 1,
			xp: 1000 - spent,
			entry: ['NewTalent -5 E2E Steady tier 1 rank 1'],
		},
	);
	await e2e.step('#36 D2 the new talent undone from the Experience Journal, and Yes answered', async () => {
		asked = await undoAndAnswer('NewTalent -5 E2E Steady', 'yes');
	});
	spent -= 5;
	e2e.expect(
		'#36 D2 undoing a new talent deletes it, with its effect, and gives its XP back',
		{ talent: await talent('E2E Steady'), ...(await page((name) => window.characterE2E.appliedEffects(name), A)), xp: await xp() },
		{ talent: null, effects: [], soak: 0, xp: 1000 - spent },
	);
	await e2e.step('#36 D3 a ranked tier 1 talent dropped', () => drop('Grit'));
	spent += 5;
	e2e.expect('#36 D3 with no other tier 1 talent, the Talents tab offers no rank 2 at tier 2', await talent('E2E Grit'), {
		rank: 1,
		tier: 1,
		row: 'E2E Grit 1',
		rowTier: '1',
		description: 'Grit holds.',
		canUpgrade: false,
	});
	await e2e.step('#36 D4 another tier 1 talent dropped', () => drop('Quick'));
	spent += 5;
	await e2e.step('#36 D5 the ranked talent bought a rank from the Talents tab, counting the writes', async () => {
		await page((name) => window.characterE2E.startCounting(name), A);
		await page((name) => window.characterE2E.upgradeTalent(name, 'E2E Grit'), A);
	});
	spent += 10;
	const gritWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.log('#36 D5 sheet renders while buying a talent rank', gritWrites.renders);
	e2e.expect(
		'#36 D5 a talent rank bought on the Talents tab costs 10 XP at tier 2, and its row shows the talent with its new rank and tier',
		{ ...(await talent('E2E Grit')), xp: await xp(), entry: await journalTail(1) },
		{
			rank: 2,
			tier: 2,
			row: 'E2E Grit 2',
			rowTier: '2',
			description: 'Grit holds.',
			canUpgrade: false,
			xp: 1000 - spent,
			entry: [`TalentRank -10 E2E Grit tier 2 rank 2`],
		},
	);
	e2e.expect(
		'#36 D5 a bought talent rank is one item update and one actor update',
		{ updateItem: gritWrites.updateItem, updateActor: gritWrites.updateActor, createItem: gritWrites.createItem },
		{ updateItem: 1, updateActor: 1, createItem: 0 },
	);
	await notifications();
	await e2e.step('#36 D6 the ranked talent dropped again, with no room at tier 3', () => drop('Grit'));
	e2e.expect(
		'#36 D6 a talent rank by drop is refused when the Talent Pyramid has no room, with a notification',
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp(), notifications: await notifications() },
		{
			rank: 2,
			xp: 1000 - spent,
			notifications: [await notified('Genesys.Notifications.CannotPurchaseTalentTier', { tier: 3, lowerTier: 2, minimum: 2 })],
		},
	);
	await e2e.step('#36 D7 the ranked talent dropped again under Ignore Talent Pyramid', async () => {
		await setHouseRules({ ignoreTalentPyramid: true });
		await drop('Grit');
	});
	spent += 15;
	e2e.expect(
		'#36 D7 under Ignore Talent Pyramid, a talent rank by drop is bought at its next tier',
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{ rank: 3, xp: 1000 - spent, entry: ['TalentRank -15 E2E Grit tier 3 rank 3'] },
	);
	await e2e.step('#36 D8 Talent Tier Versions turned on and the sheet reopened', async () => {
		await setHouseRules({ ignoreTalentPyramid: false, talentTierVersions: true });
		await reopen();
	});
	e2e.expect('#36 D8 under Talent Tier Versions, the Talents tab offers no rank', (await talent('E2E Grit'))?.canUpgrade, false);
	await e2e.step('#36 D9 the tier 1 version of the ranked talent dropped under Talent Tier Versions', () => drop('Grit'));
	spent += 5;
	e2e.expect(
		"#36 D9 under Talent Tier Versions, a rank is bought at the dropped version's tier",
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{ rank: 4, xp: 1000 - spent, entry: ['TalentRank -5 E2E Grit tier 1 rank 4'] },
	);
	await e2e.step('#36 D10 Talent Tier Versions turned off, and the unranked talent dropped again', async () => {
		await setHouseRules({ talentTierVersions: false });
		await reopen();
		await notifications();
		await drop('Quick');
	});
	e2e.expect(
		'#36 D10 an unranked talent the character holds is refused, with a notification',
		{ xp: await xp(), notifications: await notifications() },
		{ xp: 1000 - spent, notifications: [await notified('Genesys.Notifications.TalentNotRanked', { talentName: 'E2E Quick' })] },
	);

	// Undoing entries, and the refusals.
	const refusal = async (step: string, name: string, entry: string, key: string, data: Record<string, unknown>) => {
		const before = await page((name) => window.characterE2E.journal(name), A);
		await notifications();
		await e2e.step(`#36 ${step} undo ${entry}`, () => undo(entry));
		e2e.expect(
			`#36 ${step} ${name}`,
			{ journal: await page((name) => window.characterE2E.journal(name), A), notifications: await notifications() },
			{ journal: before, notifications: [await notified(key, data)] },
		);
	};
	const ids = await page(() => {
		const actor = game.actors.getName('E2E Advancer');
		return { grit: actor.items.getName('E2E Grit').id, ranged: actor.items.getName('Ranged').id };
	}, undefined);
	await refusal(
		'E1',
		'undoing a characteristic raise a later raise builds on is refused',
		'Characteristic -30 brawn 3',
		'Genesys.Notifications.CannotDeleteCharacteristic',
		{
			characteristic: 'brawn',
			rank: 3,
		},
	);
	await refusal(
		'E2',
		'undoing a skill rank a later rank builds on is refused',
		'Skill -5 Ranged 1',
		'Genesys.Notifications.CannotDeleteSkill',
		{
			name: 'Ranged',
			id: ids.ranged,
			rank: 1,
		},
	);
	await refusal(
		'E3',
		"undoing a talent entry that isn't its latest rank is refused",
		'NewTalent -5 E2E Grit',
		'Genesys.Notifications.CannotDeleteExistingTalent',
		{ name: 'E2E Grit', id: ids.grit, tier: 1, rank: 1 },
	);
	await refusal(
		'E4',
		'undoing a talent the Talent Pyramid rests on is refused',
		'NewTalent -5 E2E Quick',
		'Genesys.Notifications.CannotDeleteInvalidTalentPyramid',
		{ rank: 1 },
	);
	// §#432: every undo asks first, saying what it does, but a refused one, which tells why instead.
	const characteristicRefused = await page((name) => window.characterE2E.journal(name), A);
	await notifications();
	await e2e.step('#432 A1 the Brawn raise a later raise builds on undone again', async () => {
		asked = await undoAndAnswer('Characteristic -30 brawn 3', 'no');
	});
	e2e.expect(
		'#432 A1 a refused undo asks nothing, and tells why',
		{ asked, journal: await page((name) => window.characterE2E.journal(name), A), notifications: await notifications() },
		{
			asked: null,
			journal: characteristicRefused,
			notifications: [await notified('Genesys.Notifications.CannotDeleteCharacteristic', { characteristic: 'brawn', rank: 3 })],
		},
	);
	// A talent's purchase recorded before 0.1.14 holds no talent id, so its undo finds no talent to delete.
	const legacyQuestion = undoQuestion(
		"Undo the purchase of the talent E2E Quick? The talent it bought isn't found on the character: the E2E Quick on the sheet isn't linked to this entry, and stays. The character gets back the 5 XP it cost.",
	);
	const beforeLegacy = await page((name) => window.characterE2E.journal(name), A);
	await e2e.step('#432 A2 a purchase of the held talent, recorded without its id as before 0.1.14, undone, and No answered', async () => {
		await page(async (name) => {
			const actor = game.actors.getName(`E2E ${name}`);
			const legacy = { amount: -5, type: 'NewTalent', data: { name: 'E2E Quick', tier: 1, rank: 1 } };
			await actor.update({ 'system.experienceJournal.entries': [...actor.system.experienceJournal.entries, legacy] });
		}, A);
		await e2e.settle();
		asked = await undoAndAnswer('NewTalent -5 E2E Quick', 'no');
	});
	spent += 5;
	e2e.expect(
		"#432 A2 undoing a talent purchase whose talent isn't found says that it deletes none and that the talent of its name stays, and No keeps the entry and the XP",
		{ asked, rank: (await talent('E2E Quick'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{
			asked: legacyQuestion,
			rank: 1,
			xp: 1000 - spent,
			entry: ['NewTalent -5 E2E Quick tier 1 rank 1'],
		},
	);
	await e2e.step('#432 A3 the purchase recorded without its id undone again, and Yes answered', async () => {
		asked = await undoAndAnswer('NewTalent -5 E2E Quick', 'yes');
	});
	spent -= 5;
	e2e.expect(
		'#432 A3 Yes to the same question removes the entry and gives its XP back, and the talent stays',
		{
			asked,
			rank: (await talent('E2E Quick'))?.rank,
			xp: await xp(),
			journal: await page((name) => window.characterE2E.journal(name), A),
		},
		{
			asked: legacyQuestion,
			rank: 1,
			xp: 1000 - spent,
			journal: beforeLegacy,
		},
	);
	await e2e.step('#432 A4 the latest talent rank undone, and No answered', async () => {
		asked = await undoAndAnswer('TalentRank -5 E2E Grit', 'no');
	});
	e2e.expect(
		'#432 A4 undoing a talent rank asks in the same dialog, naming the talent, the rank it lowers and the XP it gives back, and No keeps the entry, the rank and the XP',
		{ asked, rank: (await talent('E2E Grit'))?.rank, xp: await xp(), entry: await journalTail(1) },
		{
			asked: undoQuestion(
				'Undo the increase of E2E Grit to rank 4? The talent goes back to rank 3. The character gets back the 5 XP it cost.',
			),
			rank: 4,
			xp: 1000 - spent,
			entry: ['TalentRank -5 E2E Grit tier 1 rank 4'],
		},
	);
	await e2e.step('#36 E5 undo the latest talent rank', () => undoAndAnswer('TalentRank -5 E2E Grit', 'yes'));
	spent -= 5;
	e2e.expect(
		'#36 E5 undoing the latest talent rank lowers the rank and gives its XP back',
		{ rank: (await talent('E2E Grit'))?.rank, xp: await xp() },
		{
			rank: 3,
			xp: 1000 - spent,
		},
	);
	// An XP Award ends Character Creation; undoing the only one goes back to it.
	await e2e.step('#36 E6 an XP Award given from the Experience Journal', () =>
		page((name) => window.characterE2E.award(name, 50, 'E2E award'), A),
	);
	e2e.expect(
		'#36 E6 an XP Award adds its XP, ends Character Creation and lifts the skill rank cap to 5',
		{
			xp: await xp(),
			entry: await journalTail(1),
			canRaise: (await characteristic('agility')).canRaise,
			rangedCanBuy: (await skills(['Ranged'])).Ranged?.canBuy,
		},
		{ xp: 1050 - spent, entry: ['Award 50 E2E award'], canRaise: false, rangedCanBuy: true },
	);
	await e2e.step("#432 A5 the XP Award's entry undone, and No answered", async () => {
		asked = await undoAndAnswer('Award 50', 'no');
	});
	e2e.expect(
		'#432 A5 undoing an XP Award asks in the same dialog, naming its reason and the XP it takes away, and No keeps the entry and the XP',
		{ asked, xp: await xp(), entry: await journalTail(1) },
		{
			asked: undoQuestion('Undo the XP award "E2E award"? The character loses the 50 XP it gave.'),
			xp: 1050 - spent,
			entry: ['Award 50 E2E award'],
		},
	);
	await e2e.step('#36 E7 undo the XP Award', () => undoAndAnswer('Award 50', 'yes'));
	e2e.expect(
		'#36 E7 undoing the only XP Award goes back to Character Creation',
		{ xp: await xp(), canRaise: (await characteristic('agility')).canRaise, rangedCanBuy: (await skills(['Ranged'])).Ranged?.canBuy },
		{ xp: 1000 - spent, canRaise: true, rangedCanBuy: false },
	);
	await e2e.step('#432 A6 the latest skill rank undone, and No answered', async () => {
		asked = await undoAndAnswer('Skill -10 Ranged 2', 'no');
	});
	e2e.expect(
		'#432 A6 undoing a skill rank asks in the same dialog, naming the skill, the rank it lowers and the XP it gives back, and No keeps the entry, the rank and the XP',
		{
			asked,
			rank: (await skills(['Ranged'])).Ranged?.rank,
			xp: await xp(),
			kept: (await page((name) => window.characterE2E.journal(name), A)).includes('Skill -10 Ranged 2'),
		},
		{
			asked: undoQuestion(
				'Undo the increase of Ranged to rank 2? The skill goes back to rank 1. The character gets back the 10 XP it cost.',
			),
			rank: 2,
			xp: 1000 - spent,
			kept: true,
		},
	);
	await e2e.step('#36 E8 undo the latest skill rank', () => undoAndAnswer('Skill -10 Ranged 2', 'yes'));
	spent -= 10;
	e2e.expect(
		'#36 E8 undoing the latest skill rank lowers the rank and gives its XP back',
		{ rank: (await skills(['Ranged'])).Ranged?.rank, xp: await xp() },
		{
			rank: 1,
			xp: 1000 - spent,
		},
	);
	await e2e.step('#432 A7 the latest Brawn raise undone, and No answered', async () => {
		asked = await undoAndAnswer('Characteristic -40 brawn 4', 'no');
	});
	e2e.expect(
		'#432 A7 undoing a characteristic raise asks in the same dialog, naming the characteristic, the rating it lowers and the XP it gives back, and No keeps the entry, the rating and the XP',
		{
			asked,
			base: (await characteristic('brawn')).base,
			xp: await xp(),
			kept: (await page((name) => window.characterE2E.journal(name), A)).includes('Characteristic -40 brawn 4'),
		},
		{
			asked: undoQuestion('Undo the increase of Brawn to 4? Brawn goes back to 3. The character gets back the 40 XP it cost.'),
			base: 4,
			xp: 1000 - spent,
			kept: true,
		},
	);
	await e2e.step('#36 E9 undo the latest Brawn raise', () => undoAndAnswer('Characteristic -40 brawn 4', 'yes'));
	spent -= 40;
	e2e.expect(
		'#36 E9 undoing a characteristic raise lowers it with its threshold, and gives its XP back',
		{ ...(await characteristic('brawn')), xp: await xp(), thresholds: await page((name) => window.characterE2E.thresholds(name), A) },
		{ base: 3, shown: 3, sheet: '3', canRaise: true, xp: 1000 - spent, thresholds: { wounds: 13, strain: 13 } },
	);
	await page((name) => window.characterE2E.close(name), A);

	// §#198: a characteristic raised from its base rating, under an Active Effect.
	const E = 'Effect';
	const brawn = async () => ({
		...(await page((name) => window.characterE2E.characteristic(name, 'brawn'), E)),
		xp: await page((name) => window.characterE2E.xp(name), E),
		wounds: (await page((name) => window.characterE2E.thresholds(name), E)).wounds,
	});
	await e2e.step('#198 F0 a character with Brawn 2 and an Active Effect giving +1 Brawn', async () => {
		await page((name) => window.characterE2E.create(name), E);
		await page((name) => window.characterE2E.open(name), E);
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), E);
		await e2e.settle();
		await page(
			() =>
				game.actors
					.getName('E2E Effect')
					.createEmbeddedDocuments('ActiveEffect', [
						{ name: 'E2E +1 Brawn', changes: [{ key: 'system.characteristics.brawn', mode: 2, value: '1' }] },
					]),
			undefined,
		);
	});
	e2e.expect('#198 F0 Brawn shows 3 over a base of 2', await brawn(), {
		base: 2,
		shown: 3,
		sheet: '3',
		canRaise: true,
		xp: 1000,
		wounds: 12,
	});
	const raises = [
		{ cost: 30, base: 3, shown: 4, xp: 970, wounds: 13 },
		{ cost: 40, base: 4, shown: 5, xp: 930, wounds: 14 },
		{ cost: 50, base: 5, shown: 6, xp: 880, wounds: 15 },
	];
	for (const [index, { cost, ...expected }] of raises.entries()) {
		await e2e.step(`#198 F${index + 1} Brawn raised under the effect`, () =>
			page((name) => window.characterE2E.raise(name, 'brawn'), E),
		);
		e2e.expect(
			`#198 F${index + 1} raising Brawn under +1 costs ${cost} XP from its base rating, which the effect still adds to${index === 2 ? ', and no further raise is offered' : ''}`,
			await brawn(),
			{ ...expected, sheet: String(expected.shown), canRaise: index < 2 },
		);
	}
	await e2e.step('#198 F4 undo the last Brawn raise under the effect', () =>
		page(async (name) => {
			await window.characterE2E.undo(name, 'Characteristic -50 brawn 5');
			await window.e2e.answerConfirm('yes');
		}, E),
	);
	e2e.expect('#198 F4 undoing the raise puts the base back, with the effect still on top', await brawn(), {
		base: 4,
		shown: 5,
		sheet: '5',
		canRaise: true,
		xp: 930,
		wounds: 14,
	});
	await page((name) => window.characterE2E.close(name), E);
}
