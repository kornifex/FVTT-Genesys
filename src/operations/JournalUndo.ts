/** @file Undoes an entry of a character's Experience Journal, once the user confirms what the undo does. */

import type { GenesysActor } from '@/actor/GenesysActor';
import { advance, advancementCharacter, undoEntry, undoQuestion } from '@/actor/data/character/Advancement';
import { confirmDelete } from '@/operations/ItemActions';

/**
 * Undo an entry of the Experience Journal, along with what it bought, once the user confirms in the deletion dialog,
 * which says what the undo does. A refused undo asks nothing: the user is told why instead.
 */
export async function undoJournalEntry(actor: GenesysActor<'character'>, index: number) {
	const question = undoQuestion(advancementCharacter(actor), index, game.i18n);
	if (question !== undefined && !(await confirmDelete({ title: 'Genesys.Dialogs.ConfirmUndoEntry.Title', question }))) {
		return;
	}

	await advance(actor, (character) => undoEntry(character, index));
}
