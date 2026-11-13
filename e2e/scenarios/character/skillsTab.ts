import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#114: the Skills tab's order, and a rival's Free Ranks. */
export async function skillsTab(e2e: ScenarioContext, page: Evaluate) {
	await e2e.step('#114 J1 a character with a skill whose name starts with an accent, and one in lower case', async () => {
		await page((name) => window.characterE2E.create(name), 'Sorted');
		await page(
			(items) => window.characterE2E.createItems('Sorted', items),
			[
				{ name: 'Éloquence', type: 'skill', system: { category: 'social', characteristic: 'presence' } },
				{ name: 'charm', type: 'skill', system: { category: 'social', characteristic: 'presence' } },
			],
		);
		await page((name) => window.characterE2E.open(name), 'Sorted');
	});
	e2e.expect(
		'#114 J1 each skill category sorts by name in the language, an accented letter with its plain one and cases together, the categories in their order',
		await page((name) => window.characterE2E.socialSkills(name), 'Sorted'),
		{
			categories: await page(
				() =>
					['GeneralSkills', 'MagicSkills', 'CombatSkills', 'SocialSkills', 'KnowledgeSkills'].map((key) =>
						game.i18n.localize(`Genesys.Labels.${key}`),
					),
				undefined,
			),
			social: ['charm', 'Charm', 'Coercion', 'Deception', 'Éloquence', 'Leadership', 'Negotiation'],
		},
	);
	await page((name) => window.characterE2E.close(name), 'Sorted');

	// §#582: a skill's ranks read as a dice pool in words, as an image's name to a screen reader and as its tooltip.
	await e2e.step('#582 A7 a character whose Charm has 1 rank on a Presence of 3, and whose Lore none on an Intellect of 0', () =>
		page(async () => {
			await Actor.create({
				name: 'E2E Ranks',
				type: 'character',
				system: { characteristics: { presence: 3, intellect: 0 } },
				items: [
					{ name: 'Charm', type: 'skill', system: { category: 'social', characteristic: 'presence', rank: 1 } },
					{ name: 'Lore', type: 'skill', system: { category: 'knowledge', characteristic: 'intellect', rank: 0 } },
				],
			});
			await window.characterE2E.open('Ranks');
			await window.e2e.showTab('Ranks', 'skills');
			const root = window.e2e.htmlOf(window.e2e.actor('Ranks').sheet)!;
			for (const row of root.querySelectorAll<HTMLElement>('.tab-skills .skill.row')) {
				const ranks = row.querySelector<HTMLElement>('.skill-ranks');
				if (ranks && /^(Charm|Lore) /.test(window.e2e.text(row.querySelector('.skill-name span'))))
					ranks.dataset.e2e = 'glyph-ranks';
			}
		}, undefined),
	);
	e2e.expect(
		"#582 A7 a skill's ranks read as their dice in words, the Proficiency dice first, in their tooltip too, and no dice as nothing",
		await e2e.gm.glyphNames('[data-e2e="glyph-ranks"]'),
		[
			{ text: '', name: '1 Proficiency die, 2 Ability dice', tooltip: '1 Proficiency die, 2 Ability dice' },
			{ text: '', name: null, tooltip: null },
		],
	);
	await page((name) => window.characterE2E.close(name), 'Ranks');

	// §#620: at the sheet's default width, every skill name fits beside its die, star, rank, dice and ⋮, and the rank
	// keeps one width whether a rank can be bought: its ↑ is a badge on its corner.
	let fit = {};
	await e2e.step('#620 A1 a character with XP to spend opens at its default width on the Skills tab', async () => {
		fit = await page(async () => {
			await Actor.create({
				name: 'E2E Wide',
				type: 'character',
				system: { experienceJournal: { entries: [{ amount: 200, type: 'Starting', data: {} }] } },
			});
			await window.characterE2E.open('Wide');
			await window.e2e.showTab('Wide', 'skills');
			const sheet = window.e2e.actor('Wide').sheet;
			const root = window.e2e.htmlOf(sheet)!;
			const names = [...root.querySelectorAll<HTMLElement>('.tab-skills .skill-name')];
			const ranks = [...root.querySelectorAll<HTMLElement>('.tab-skills .skill-rank')];
			return {
				width: sheet.position.width,
				columns: new Set(
					[...root.querySelectorAll<HTMLElement>('.tab-skills .skill-category')].map((category) => category.offsetLeft),
				).size,
				cut: names.filter((name) => name.scrollWidth > name.clientWidth).map((name) => window.e2e.text(name)),
				rankWidths: new Set(ranks.map((rank) => rank.offsetWidth)).size,
				buyable: ranks.filter((rank) => rank.querySelector('button.buy-rank')).length === ranks.length,
			};
		}, undefined);
	});
	e2e.expect(
		'#620 A1 at its default width the sheet shows two columns of skills, none of whose names is cut off, and every rank has one width with its ↑',
		fit,
		{ width: 780, columns: 2, cut: [], rankWidths: 1, buyable: true },
	);
	await page((name) => window.characterE2E.close(name), 'Wide');

	await e2e.step('#114 J2 Rank Up twice then Rank Down three times on a rival skill', async () => {
		await page(
			(name) =>
				window.characterE2E.create(name, 'rival', [
					{ name: 'Ranged', type: 'skill', system: { category: 'combat', characteristic: 'agility', rank: 0 } },
				]),
			'Ranked Rival',
		);
		await page((name) => window.characterE2E.open(name), 'Ranked Rival');
		for (const label of ['FreeRankUp', 'FreeRankUp', 'FreeRankDown', 'FreeRankDown', 'FreeRankDown']) {
			await page((label) => window.characterE2E.menu('Ranked Rival', { adversarySkill: 'Ranged' }, `Genesys.Labels.${label}`), label);
			await e2e.settle();
		}
	});
	e2e.expect(
		"#114 J2 a rival skill's Rank Down stops at 0",
		await page(() => game.actors.getName('E2E Ranked Rival').items.getName('Ranged').system.rank, undefined),
		0,
	);
	await page((name) => window.characterE2E.close(name), 'Ranked Rival');
}
