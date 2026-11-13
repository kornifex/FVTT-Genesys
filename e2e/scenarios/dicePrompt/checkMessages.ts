import type { MessageSummary, DicePromptContext } from './shared.ts';



export async function checkMessagesPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, click, roll, setSetting, update, ada, skillRoll, characteristicRoll, attack } = ctx;
	const heal = await opened(gm, click(gm, ada, '.tab-combat .injury .name .roll-link'));
	e2e.expect(
		'#49 E1 a character without Resilience heals an injury with an Unranked Skill Check of Resilience',
		{ skill: heal.skill, pool: heal.pool, unranked: heal.skills?.Unranked?.includes('Resilience (Br)') },
		{ skill: 'Resilience (Br)', pool: 'AAA|DD', unranked: true },
	);
	await gm.evaluate(async () => {
		const hero = game.actors.getName('E2E Hero');
		await hero.update({ 'system.characteristics.willpower': 2 });
		await hero.deleteEmbeddedDocuments('Item', [hero.items.getName('Vigilance').id]);
	});
	const initiative = await opened(gm, () => gm.evaluate(() => void game.combat.rollSlotInitiative(window.e2e.slotId('Hero'))));
	const initiativeMessage = await roll();
	e2e.expect(
		'#49 E2 a character without Vigilance rolls initiative from the tracker as an Unranked Skill Check of Vigilance',
		{
			skill: initiative.skill,
			pool: initiative.pool,
			unranked: initiative.skills?.Unranked?.includes('Vigilance (Will)'),
			description: initiativeMessage.description,
			formula: initiativeMessage.formula,
			rolled: await gm.evaluate(() => game.combat.combatants.getName('Hero').initiative !== null),
		},
		{
			skill: 'Vigilance (Will)',
			pool: 'AA|',
			unranked: true,
			description: 'Rolling Initiative with <strong>Vigilance<i class="fas fa-star hide-it"></i></strong>...',
			formula: '0dp + 2da',
			rolled: true,
		},
	);
	// Ability faces: 4 is two Successes, 8 two Advantages.
	await gm.fixDice([
		{ face: 4, faces: 8 },
		{ face: 8, faces: 8 },
	]);
	await gm.evaluate(() => game.combat.rollInitiative([game.combat.combatants.getName('Hero').id]));
	await e2e.settle();
	const unprompted = await gm.evaluate(() => ({
		message: window.dicePromptE2E.lastMessage(),
		initiative: game.combat.combatants.getName('Hero').initiative,
	}));
	await gm.evaluate(() => window.e2e.reset());
	e2e.expect(
		"#49 E3 initiative rolled without the prompt rolls the missing Initiative Skill's characteristic, and reads its results",
		{
			message: {
				speaker: unprompted.message.speaker,
				description: unprompted.message.description,
				formula: unprompted.message.formula,
				results: unprompted.message.results,
				summaries: unprompted.message.summaries,
			},
			initiative: unprompted.initiative,
		},
		{
			message: {
				speaker: 'Hero',
				description: 'Rolling Initiative with <strong>Vigilance<i class="fas fa-star hide-it"></i></strong>...',
				formula: '0dp + 2da',
				results: 's s a a',
				summaries: ['s Successes 2 a Advantage 2'],
			},
			initiative: 2.02,
		},
	);
	const foeId = await gm.evaluate(async () => {
		const foe = game.combat.combatants.getName('Foe');
		await foe.update({ hidden: true });
		await game.combat.rollInitiative([foe.id]);
		return window.dicePromptE2E.lastMessage().id;
	});
	await e2e.settle();
	e2e.expect(
		"#50 E4 a hidden combatant's initiative is private",
		{
			gm: await gm.evaluate(
				(id) => ({ whispered: game.messages.get(id).whisper.length > 0, blind: game.messages.get(id).blind }),
				foeId,
			),
			player: await player.evaluate((id) => !!game.messages.get(id)?.isContentVisible, foeId),
		},
		{ gm: { whispered: true, blind: false }, player: false },
	);

	// §#414: a check's message and an initiative's take the mode the GM picks in the chat.
	// v13: the chat's mode is the roll mode (`blindroll`); v14 replaced it with the message mode (`blind`).
	const chatModeKey = await gm.evaluate(() => (game.release.generation < 14 ? 'rollMode' : 'messageMode'));
	const chatModeBefore = await gm.evaluate((key) => game.settings.get('core', key), chatModeKey);
	const setChatMode = (value: unknown) =>
		gm.evaluate(({ key, value }) => game.settings.set('core', key, value), { key: chatModeKey, value });
	const visibility = ({ whisper, blind }: MessageSummary) => ({ whisper, blind });
	const rolledInChatMode = async (mode: string) => {
		await setChatMode(chatModeKey === 'rollMode' ? `${mode}roll` : mode);
		await opened(gm, skillRoll('Cool'));
		const check = visibility(await roll());
		// The Hero rolls the initiative they hold, so that the turns stay as they were.
		await gm.fixDice([
			{ face: 4, faces: 8 },
			{ face: 8, faces: 8 },
		]);
		await gm.evaluate(() => game.combat.rollInitiative([game.combat.combatants.getName('Hero').id]));
		await e2e.settle();
		return { check, initiative: visibility(await gm.evaluate(() => window.dicePromptE2E.lastMessage())) };
	};
	const gmCount = await gm.evaluate(() => game.users.filter((user: { isGM: boolean }) => user.isGM).length);
	e2e.expect(
		"#414 A1 a check and an initiative rolled with the chat in blind mode, then in self mode, are whispered as the chat's mode says",
		{ blind: await rolledInChatMode('blind'), self: await rolledInChatMode('self') },
		{
			blind: { check: { whisper: gmCount, blind: true }, initiative: { whisper: gmCount, blind: true } },
			self: { check: { whisper: 1, blind: false }, initiative: { whisper: 1, blind: false } },
		},
	);
	await setChatMode(chatModeBefore);

	const description = (message: MessageSummary) => ({ description: message.description, formula: message.formula });
	await opened(gm, skillRoll('Cool'));
	const coolMessage = await roll();
	await opened(gm, characteristicRoll(5));
	const willpowerMessage = await roll();
	await opened(gm, click(gm, { actor: 'Grunts' }, '.adversary-items .skill > .skill-name|Melee'));
	const minionMessage = await roll();
	await setSetting('useSuperCharacteristics', true);
	await update(ada, { 'system.superCharacteristics': ['brawn'] });
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await opened(gm, skillRoll('Melee'));
	const superMessage = await roll();
	e2e.expect(
		'#50 E5 skill, characteristic, minion and super characteristic messages describe their check',
		{
			skill: description(coolMessage),
			characteristic: description(willpowerMessage),
			minion: description(minionMessage),
			super: description(superMessage),
		},
		{
			skill: {
				description: 'Rolling <strong>Cool (Pr<i class="fas fa-star hide-it"></i>)</strong>...',
				formula: '0dp + 1da + 2di',
			},
			characteristic: { description: 'Rolling <strong>Willpower</strong>...', formula: '0dp + 4da + 2di' },
			minion: {
				description: 'Rolling <strong>Melee (Br<i class="fas fa-star hide-it"></i>)</strong>...',
				formula: '0dp + 2da + 2di',
			},
			super: {
				description: 'Rolling <strong>Melee (Br<i class="fas fa-star super-char"></i>)</strong>...',
				formula: '3dpx + 0da + 2di',
			},
		},
	);
	await update(ada, { 'system.superCharacteristics': [] });
	await setSetting('useSuperCharacteristics', false);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());

	await opened(gm, skillRoll('Melee'));
	await gm.evaluate(() => window.dicePromptE2E.promptAdd(['C+']));
	// Proficiency faces: 12 a Triumph, 4 two Successes, 6 an Advantage; Difficulty: 2 a Failure, 7 two Threats;
	// Challenge: 12 a Despair.
	await gm.fixDice([
		{ face: 12, faces: 12 },
		{ face: 4, faces: 12 },
		{ face: 6, faces: 12 },
		{ face: 2, faces: 8 },
		{ face: 7, faces: 8 },
		{ face: 12, faces: 12 },
	]);
	const skillResults = await roll();
	await opened(gm, attack('Pistol'));
	// Proficiency faces: 2 a Success, 10 two Advantages; Difficulty: 1 blank, 4 a Threat.
	await gm.fixDice([
		{ face: 2, faces: 12 },
		{ face: 10, faces: 12 },
		{ face: 1, faces: 8 },
		{ face: 4, faces: 8 },
	]);
	const attackResults = await roll();
	const succeededAttackCard = await gm.evaluate(() => window.dicePromptE2E.lastCard());
	e2e.expect(
		'#157 E6 a skill roll and an attack read their net results, with Triumph and Despair apart',
		{
			skill: { formula: skillResults.formula, results: skillResults.results, summaries: skillResults.summaries },
			attack: { formula: attackResults.formula, results: attackResults.results, summaries: attackResults.summaries },
		},
		{
			skill: {
				formula: '3dp + 0da + 2di + 1dc',
				results: 'h t d',
				summaries: ['s Successes 1 h Threat 1 t Triumph 1 d Despair 1'],
			},
			attack: {
				formula: '2dp + 0da + 2di',
				results: 's a',
				summaries: ['Damage (3) 4 Critical 3', 's Successes 1 a Advantage 1'],
			},
		},
	);
	await opened(gm, skillRoll('Melee'));
	// Proficiency faces: 2 a Success, 1 blank, 6 an Advantage; Difficulty: 3 two Failures, 8 a Failure and a Threat.
	await gm.fixDice([
		{ face: 2, faces: 12 },
		{ face: 1, faces: 12 },
		{ face: 6, faces: 12 },
		{ face: 3, faces: 8 },
		{ face: 8, faces: 8 },
	]);
	await roll();
	const failedSkillCard = await gm.evaluate(() => window.dicePromptE2E.lastCard());
	await update(
		{ actor: 'Ada', item: 'Pistol' },
		{
			'system.qualities': [
				{ name: 'Accurate', description: '<p>Aims true.</p>', isRated: true, rating: 1 },
				{ name: 'Pierce', description: '', isRated: false, rating: 2 },
			],
		},
	);
	await opened(gm, attack('Pistol'));
	// Proficiency faces: 1 blank, 10 two Advantages; Difficulty: 2 a Failure, 4 a Threat.
	await gm.fixDice([
		{ face: 1, faces: 12 },
		{ face: 10, faces: 12 },
		{ face: 2, faces: 8 },
		{ face: 4, faces: 8 },
	]);
	await roll();
	const failedAttackCard = await gm.evaluate(() => window.dicePromptE2E.lastCard());
	await update({ actor: 'Ada', item: 'Pistol' }, { 'system.qualities': [] });
	e2e.expect(
		'the cards of a succeeded attack, a failed skill roll and a failed attack with qualities show each of their parts',
		{ succeededAttack: succeededAttackCard, failedSkill: failedSkillCard, failedAttack: failedAttackCard },
		{
			succeededAttack: {
				labels: ['Roll Results', 'Attack Results', 'Summary', 'Dice'],
				results: 's a',
				summaries: ['Damage (3) 4 Critical 3', 's Successes 1 a Advantage 1'],
				qualities: [],
				dice: 'P s P aa D D h',
			},
			failedSkill: {
				labels: ['Roll Results', 'Summary', 'Dice'],
				results: 'f f',
				summaries: ['f Failures 2'],
				qualities: [],
				dice: 'P s P P a D ff D fh',
			},
			// The damage and critical are hidden on a failure, the world setting being off. The qualities still show, as on
			// origin/main, though the setting's hint names them among what it hides.
			failedAttack: {
				labels: ['Roll Results', 'Summary', 'Attack Qualities', 'Dice'],
				results: 'f a',
				summaries: ['f Failures 1 a Advantage 1'],
				qualities: [
					{ text: 'Accurate 1', tooltip: '<p>Aims true.</p>' },
					{ text: 'Pierce', tooltip: 'Genesys.Tooltips.NoDescription' },
				],
				dice: 'P P aa D f D h',
			},
		},
	);
	await e2e.step('E end');
}
