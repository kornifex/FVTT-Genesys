/** @file A chat message's mode, which says who sees it. */

/**
 * A key of `CONFIG.ChatMessage.modes`: `public`, `gm`, `blind` or `self`.
 */
type MessageMode = string;

/**
 * The mode the user picked in the chat for their messages.
 */
function chatMessageMode(): MessageMode {
	return game.settings.get('core', 'messageMode');
}

/**
 * The mode that shows a message to the GMs only.
 */
function privateMessageMode(): MessageMode {
	return 'gm';
}

/**
 * Give the data of a chat message a mode, by default the chat's, and return it.
 */
export function applyMessageMode<T extends ChatMessage.CreateData>(chatData: T, mode: MessageMode = chatMessageMode()): T {
	ChatMessage.applyMode(chatData, mode as keyof typeof CONFIG.ChatMessage.modes);
	return chatData;
}

/**
 * The message mode of each roll mode but `roll`, which stands for the chat's mode.
 */
const MESSAGE_MODES_OF_ROLL_MODES: Record<string, MessageMode> = {
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
	messageMode?: MessageMode;
	messageOptions?: object;
}): MessageMode | undefined {
	const rollMode = 'rollMode' in messageOptions ? (messageOptions.rollMode as MessageMode) : undefined;
	return messageMode ?? (rollMode ? MESSAGE_MODES_OF_ROLL_MODES[rollMode] : undefined);
}

/**
 * The modes the message of an initiative chooses between: the private one, and the chat's.
 */
export function initiativeModes() {
	return { private: privateMessageMode(), chat: chatMessageMode() };
}

/**
 * The mode of an initiative's message: the one its caller asks for, or, as Foundry's own initiative does, the private
 * one for a hidden combatant, and the chat's for any other.
 */
export function initiativeMessageMode(
	{ requested, hidden }: { requested?: MessageMode; hidden: boolean },
	modes: ReturnType<typeof initiativeModes>,
): MessageMode {
	return requested ?? (hidden ? modes.private : modes.chat);
}
