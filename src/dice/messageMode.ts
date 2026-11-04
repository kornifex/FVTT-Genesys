/** @file A chat message's mode, which says who sees it: v13 calls it the roll mode, v14 the message mode. */

import { isFoundryV13 } from '@/foundryGeneration';

/**
 * A key of v14's `CONFIG.ChatMessage.modes` (`public`, `gm`, `blind`, `self`), or v13's roll mode (`publicroll`,
 * `gmroll`, `blindroll`, `selfroll`).
 */
type MessageMode = string;

/**
 * The mode the user picked in the chat for their messages.
 */
function chatMessageMode(): MessageMode {
	// v13: v14 replaced the roll mode with the message mode, and keeps the roll mode as a deprecated shim until v16.
	return isFoundryV13() ? game.settings.get('core', 'rollMode') : game.settings.get('core', 'messageMode');
}

/**
 * The mode that shows a message to the GMs only.
 */
function privateMessageMode(): MessageMode {
	// v13: v14 names it `gm`.
	return isFoundryV13() ? CONST.DICE_ROLL_MODES.PRIVATE : 'gm';
}

/**
 * Give the data of a chat message a mode, by default the chat's, and return it.
 */
export function applyMessageMode<T extends ChatMessage.CreateData>(chatData: T, mode: MessageMode = chatMessageMode()): T {
	if (isFoundryV13()) {
		// v13: v14 deprecated `applyRollMode` for `applyMode`.
		ChatMessage.applyRollMode(chatData, mode as ChatMessage.PassableRollMode);
	} else {
		ChatMessage.applyMode(chatData, mode as keyof typeof CONFIG.ChatMessage.modes);
	}
	return chatData;
}

/**
 * The mode a caller of `Combat#rollInitiative` asks for: v13 in its message options, v14 as an option of its own.
 */
export function requestedInitiativeMode(options: { messageMode?: string; messageOptions?: object }): MessageMode | undefined {
	// v13: v14 deprecated the `rollMode` of the message options, which it maps to its message mode.
	if (isFoundryV13()) {
		const { messageOptions = {} } = options;
		return 'rollMode' in messageOptions ? (messageOptions.rollMode as MessageMode) : undefined;
	}
	return options.messageMode;
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
