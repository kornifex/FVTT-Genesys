/** @file Undoes an entry of a character's Experience Journal, once the user confirms what the undo does. */

import type { GenesysActor } from '@/actor/GenesysActor';
import { advance, advancementCharacter, undoEntry, undoQuestion } from '@/actor/data/character/Advancement';

/**
 * Undo an entry of the Experience Journal, along with what it bought, once the user confirms in a dialog that says what
 * the undo does. A refused undo asks nothing: the user is told why instead.
 */
export async function undoJournalEntry(actor: GenesysActor<'character'>, index: number) {
	const question = undoQuestion(advancementCharacter(actor), index, game.i18n);
	if (question !== undefined && !(await confirmUndo(question))) {
		return;
	}

	await advance(actor, (character) => undoEntry(character, index));
}

/**
 * Ask the user to confirm an undo. No is the dialog's default button, and closing it keeps the entry, as No does.
 */
async function confirmUndo(question: string) {
	// The question holds the user's text, such as a talent's name or an award's reason: the paragraph takes it as text,
	// never as HTML.
	const paragraph = document.createElement('p');
	paragraph.textContent = question;
	const content = document.createElement('div');
	content.append(paragraph);

	const confirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: 'Genesys.Dialogs.ConfirmUndoEntry.Title' },
		content,
		rejectClose: false,
	});
	return confirmed === true;
}
