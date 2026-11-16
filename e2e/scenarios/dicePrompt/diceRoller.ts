import type { DicePromptContext } from './shared.ts';

export async function diceRollerPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, noPrompt, control } = ctx;
	e2e.expect(
		'#367 A1 the chat controls hold one dice button, under the message modes by the notifications while the sidebar is collapsed, and beside them in the chat form once expanded',
		await gm.evaluate(() => window.dicePromptE2E.diceRollerButtons()),
		{
			collapsed: { count: 1, place: 'notifications, under', label: 'Roll dice' },
			expanded: { count: 1, place: 'chat, beside', label: 'Roll dice' },
			collapsedAgain: { count: 1, place: 'notifications, under', label: 'Roll dice' },
		},
	);
	const diceRollerOpens = {
		button: () => gm.evaluate(() => window.dicePromptE2E.clickDiceRoller()),
		gendr: () => gm.evaluate(() => ui.chat.processMessage('/gendr')),
	};
	const diceRoller: Record<string, Record<string, unknown>> = {};
	for (const [from, open] of Object.entries(diceRollerOpens)) {
		const prompt = async () => {
			const { actor, skill, pool } = await opened(gm, open);
			return { actor, skill, pool };
		};
		await control(gm, []);
		const none = await prompt();
		await control(gm, ['Bo']);
		const one = await prompt();
		await control(gm, ['Bo', 'Cy']);
		const several = await noPrompt(gm, open);
		await control(gm, ['Wagon']);
		const vehicle = await noPrompt(gm, open);
		diceRoller[from] = { none, one, several, vehicle };
	}
	await control(gm, []);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	const diceRollerCases = {
		none: { actor: null, skill: null, pool: '|DD' },
		one: { actor: 'Bo', skill: '—', pool: '|DD' },
		several: { prompts: 0, notifications: ['error: You need to select no tokens, or a single token, to perform this action.'] },
		vehicle: { prompts: 0, notifications: ['error: The selected token is of an invalid type to perform this action.'] },
	};
	e2e.expect(
		"#367 A2 the dice button and /gendr open a bare pool without a controlled token, the pool of a single controlled token's actor, and refuse several tokens or a vehicle",
		diceRoller,
		{ button: diceRollerCases, gendr: diceRollerCases },
	);
	// §#841: a chat command of the system, which the chat log runs instead of posting the text.
	const commands = await gm.evaluate(async () => {
		const results: Record<string, { message: unknown; posted: number; prompts: number }> = {};
		for (const command of ['/gendr', '/GENDROLL']) {
			const before = game.messages.size;
			const message = (await ui.chat.processMessage(command)) ?? null;
			await window.e2e.settle();
			results[command] = { message, posted: game.messages.size - before, prompts: window.dicePromptE2E.openPrompts() };
			await window.dicePromptE2E.closePrompts();
		}
		return results;
	});
	const runsTheCommand = { message: null, posted: 0, prompts: 1 };
	e2e.expect('#841 A1 /gendr and /gendroll, in any case, open the Dice Roller and post no message', commands, {
		'/gendr': runsTheCommand,
		'/GENDROLL': runsTheCommand,
	});
	// §#872: the chat input sends the HTML its editor holds, which a macro's processMessage never sees.
	const typed: Record<string, { posted: number; prompts: number }> = {};
	for (const command of ['/gendr', '/gendroll']) {
		const before = await gm.evaluate(() => game.messages.size);
		const input = gm.page.locator('#chat-message .ProseMirror');
		await input.click();
		await input.pressSequentially(command);
		await gm.page.keyboard.press('Enter');
		typed[command] = await gm.evaluate(async (before) => {
			await window.e2e.settle();
			return { posted: game.messages.size - before, prompts: window.dicePromptE2E.openPrompts() };
		}, before);
		await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	}
	const opensTheDiceRoller = { posted: 0, prompts: 1 };
	e2e.expect('#872 A1 /gendr and /gendroll typed in the chat input open the Dice Roller and post no message', typed, {
		'/gendr': opensTheDiceRoller,
		'/gendroll': opensTheDiceRoller,
	});
}
