import type { DicePromptContext } from './shared.ts';

export async function spellCastingPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, noPrompt, click, roll, health } = ctx;
	await gm.evaluate(async () => {
		const effect = (id: string, name: string, difficulty: number, startsChecked: boolean) => ({
			id,
			name,
			description: id === 'enervate' ? '<p>Weakens the target.</p>' : '',
			difficulty,
			startsChecked,
			qualities: [],
			critical: null,
			doublesDamageCharacteristic: false,
		});
		// Curse, at Average, with Enervate (+1, checked by default), Additional Target (+2) and Range (+1) (CRB p. 217).
		const curse = {
			name: 'E2E Curse',
			type: 'spell',
			system: {
				action: 'curse',
				difficulty: 2,
				skills: ['Arcana', 'Divine'],
				additionalEffects: [
					effect('enervate', 'Enervate', 1, true),
					effect('target', 'Additional Target', 2, false),
					effect('range', 'Range', 1, false),
				],
			},
		};
		const arcana = (rank: number) => ({ name: 'Arcana', type: 'skill', system: { characteristic: 'intellect', rank } });
		await Actor.createDocuments([
			{
				name: 'E2E Mage',
				type: 'character',
				system: { characteristics: { intellect: 3 }, strain: { value: 9, max: 10 } },
				items: [arcana(2), curse],
			},
			{ name: 'E2E Novice', type: 'character', items: [arcana(0), curse] },
		]);
	});
	const cast = (actor: string) => click(gm, { actor }, '.tab-magic .spell .name button|E2E Curse');
	const effects = () => gm.evaluate(() => window.dicePromptE2E.promptSpellEffects());
	const check = (name: string) => gm.evaluate((name) => window.dicePromptE2E.promptCheckEffect(name), name);

	const opening = await opened(gm, cast('Mage'));
	e2e.expect(
		"#705 S1 the Mage's Curse opens the Dice Prompt on Arcana, at Hard: Average and Enervate, checked by default",
		{ skill: opening.skill, spellSkills: opening.skills?.['Spell Skills'], ...(await effects()) },
		{
			skill: 'Arcana (Int)',
			spellSkills: ['Arcana (Int)', 'Divine (Will)'],
			effects: [
				{ name: 'Enervate', adds: '+D', checked: true, disabled: false, why: '' },
				{ name: 'Additional Target', adds: '+DD', checked: false, disabled: false, why: '' },
				{ name: 'Range', adds: '+D', checked: false, disabled: false, why: '' },
			],
			difficulty: 'Difficulty: Hard',
			pool: 'PPA|DDD',
		},
	);

	e2e.expect(
		"#985 S1 in the dark theme, an Additional Effect's Difficulty dice are outlined as the Difficulty row's dice, in white",
		await gm.evaluate(() => window.dicePromptE2E.promptDarkOutlines()),
		{ difficultyDie: '0.5px rgb(255, 255, 255)', spellEffect: '0.5px rgb(255, 255, 255)' },
	);

	// What hovering an element with the mouse shows as a tooltip.
	const hovered = async (selector: string, index: number) => {
		await gm.page.locator(selector).nth(index).hover();
		const text = await gm.evaluate(async () => {
			await window.e2e.waitFor('the tooltip', () => game.tooltip.tooltip.textContent.trim() !== '');
			return game.tooltip.tooltip.textContent.trim();
		});
		await gm.page.mouse.move(0, 0);
		return text;
	};
	e2e.expect(
		'#760 S1 hovering an Additional Effect in the Dice Prompt shows its description, or that it has none',
		[await hovered('.dice-prompt .spell-effect label', 0), await hovered('.dice-prompt .spell-effect label', 1)],
		['Weakens the target.', 'No Description Available'],
	);

	const formidable = await check('Additional Target');
	e2e.expect(
		"#705 S2 checking Additional Target takes the Curse to Formidable, and Range, which would take it beyond, can't be checked",
		{ difficulty: formidable.difficulty, range: formidable.effects[2] },
		{
			difficulty: 'Difficulty: Formidable',
			range: { name: 'Range', adds: '+D', checked: false, disabled: true, why: 'Would take the difficulty beyond Formidable.' },
		},
	);

	const rolled = await roll();
	const card = await gm.evaluate(() => window.dicePromptE2E.lastCard());
	e2e.expect(
		'#705 S3 the card names the Curse and its checked effects, and the Mage suffers 2 strain, past their threshold',
		{
			description: rolled.description,
			labels: card.labels,
			effects: card.spellEffects,
			strain: card.summaries.at(-1),
			health: await health('Mage'),
			incapacitated: await gm.evaluate(() => game.actors.getName('E2E Mage').statuses.has('incapacitated')),
		},
		{
			description: 'Casting <strong>E2E Curse</strong> using <strong>Arcana (Int<i class="fas fa-star hide-it"></i>)</strong>!',
			labels: ['Roll Results', 'Summary', 'Additional Effects', 'Dice'],
			effects: ['Enervate', 'Additional Target'],
			strain: 'Strain suffered by the caster 2',
			health: { wounds: 0, strain: 11 },
			incapacitated: true,
		},
	);

	e2e.expect(
		'#760 S3 the card shows the description of each checked Additional Effect as its tooltip, or that it has none',
		await gm.evaluate(() => {
			const content = document.createElement('div');
			content.innerHTML = game.messages.contents.at(-1).content;
			return [...content.querySelectorAll('.spell-effect .name')].map((name) =>
				name.getAttribute('data-tooltip')?.replace(/<[^>]*>/g, ''),
			);
		}),
		['Weakens the target.', 'Genesys.Tooltips.NoDescription'],
	);

	e2e.expect("#705 S4 the Novice, without a rank in the Curse's skills, is refused, and told why", await noPrompt(gm, cast('Novice')), {
		prompts: 0,
		notifications: ['warning: E2E Curse needs a rank in one of its skills to be cast: Arcana, Divine.'],
	});

	await opened(gm, cast('Mage'));
	await gm.evaluate(() => window.dicePromptE2E.setPromptDifficulty([5]));
	const raised = (await effects()).difficulty;
	const checkedAtFormidable = (await check('Additional Target')).difficulty;
	const uncheckedAtFormidable = (await check('Additional Target')).difficulty;
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	e2e.expect(
		'#728 S5 a Curse raised by hand to Formidable stays Formidable when Additional Target is checked, then unchecked',
		{ raised, checkedAtFormidable, uncheckedAtFormidable },
		{
			raised: 'Difficulty: Formidable',
			checkedAtFormidable: 'Difficulty: Formidable',
			uncheckedAtFormidable: 'Difficulty: Formidable',
		},
	);

	await e2e.step("#843 S6 GM renames Range, in the details of the Mage's Curse on its sheet, Far Range", () =>
		gm.evaluate(async () => {
			const curse = game.actors.getName('E2E Mage').items.getName('E2E Curse');
			const range = (await window.e2e.render(curse.sheet)).querySelectorAll('.additional-effect')[2];
			range.querySelector<HTMLElement>('button[aria-expanded]')!.click();
			await window.e2e.settle();
			const input = range.querySelector<HTMLInputElement>('.effect-name input')!;
			input.value = 'Far Range';
			input.dispatchEvent(new Event('change'));
			await window.e2e.settle();
		}),
	);
	const renamed = await gm.evaluate(async () => {
		const curse = (actor: string) => game.actors.getName(actor).items.getName('E2E Curse');
		const names = (actor: string) => curse(actor).system.additionalEffects.map(({ name }: { name: string }) => name);
		const row = curse('E2E Mage').sheet.element.querySelectorAll('.additional-effect .name')[2].textContent.trim();
		await curse('E2E Mage').sheet.close();
		return { mage: names('E2E Mage'), novice: names('E2E Novice'), row };
	});
	await opened(gm, cast('Mage'));
	const prompted = (await effects()).effects.map(({ name }) => name);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	e2e.expect(
		"#843 S6 the Mage's Curse saves the new name, which its row and the Dice Prompt show; the Novice's Curse keeps Range",
		{ ...renamed, prompted },
		{
			mage: ['Enervate', 'Additional Target', 'Far Range'],
			novice: ['Enervate', 'Additional Target', 'Range'],
			row: 'Far Range',
			prompted: ['Enervate', 'Additional Target', 'Far Range'],
		},
	);

	// §#729: a player who observes the Mage casts their spells; the Acting GM makes the Mage suffer the strain, and uses
	// up their Aim with an attack spell only.
	const mage = { actor: 'Mage' };
	await e2e.step(
		'#729 S5 GM gives the player the Mage as an observer, empties their strain, gives them a Fireball, and clicks Aim',
		async () => {
			await gm.evaluate(async (user) => {
				const mage = window.e2e.actor('Mage');
				await window.e2e.setOwnership(mage, user, 'OBSERVER');
				await mage.update({ 'system.strain.value': 0 });
				await mage.createEmbeddedDocuments('Item', [
					{
						name: 'E2E Fireball',
						type: 'spell',
						system: { action: 'attack', difficulty: 1, isAttack: true, skills: ['Arcana'], additionalEffects: [] },
					},
				]);
			}, e2e.playerUser);
			await click(gm, mage, '.tab-combat .maneuvers button|Aim')();
		},
	);
	const observerCast = async (spell: string) => {
		await player.evaluate(() => window.dicePromptE2E.clearNotifications());
		await opened(player, click(player, mage, `.tab-magic .spell .name button|E2E ${spell}`));
		await player.evaluate(() => window.dicePromptE2E.promptRoll());
		await e2e.settle();
		const mageState = await gm.evaluate(() => {
			const mage = game.actors.getName('E2E Mage');
			return {
				strain: mage.system.strain.value,
				aim: mage.effects.some((effect: { statuses: Set<string> }) => effect.statuses.has('aim')),
			};
		});
		return { ...mageState, notifications: await player.evaluate(() => window.dicePromptE2E.notifications()) };
	};
	e2e.expect(
		"#729 S6 the observer's Curse makes the Mage suffer 2 strain through the GM, and leaves their Aim",
		await observerCast('Curse'),
		{
			strain: 2,
			aim: true,
			notifications: [],
		},
	);
	e2e.expect(
		"#729 S7 the observer's Fireball, an attack, makes the Mage suffer 2 strain more and uses up their Aim",
		await observerCast('Fireball'),
		{ strain: 4, aim: false, notifications: [] },
	);
	await e2e.step('spellCasting end');
}
