/** @file The mode of an initiative's chat message, which says who sees it. */

/**
 * The message mode of each roll mode but `roll`, which stands for the chat's mode.
 */
const MESSAGE_MODES_OF_ROLL_MODES: Record<string, ChatMessage.Mode> = {
	publicroll: 'public',
	gmroll: 'gm',
	blindroll: 'blind',
	selfroll: 'self',
};

/**
 * The mode a caller of `Combat#rollInitiative` asks for, as an option of its own, or as the deprecated `rollMode` of its
 * message options, which Foundry maps to its message mode until v16, as here for a module that still gives one.
 */
export function requestedInitiativeMode({
	messageMode,
	messageOptions = {},
}: {
	messageMode?: ChatMessage.Mode;
	messageOptions?: object;
}): ChatMessage.Mode | undefined {
	const rollMode = 'rollMode' in messageOptions ? (messageOptions.rollMode as string) : undefined;
	return messageMode ?? (rollMode ? MESSAGE_MODES_OF_ROLL_MODES[rollMode] : undefined);
}

/**
 * The mode of an initiative's message: the one its caller asks for, or, as Foundry's own initiative does, the GMs' for a
 * hidden combatant. Undefined for any other, which `ChatMessage.applyMode` gives the chat's mode.
 */
export function initiativeMessageMode({ requested, hidden }: { requested?: ChatMessage.Mode; hidden: boolean }) {
	return requested ?? (hidden ? 'gm' : undefined);
}
