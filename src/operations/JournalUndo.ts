/** @file Undoes an entry of a character's Experience Journal, once the user confirms the items the undo deletes. */

import type { GenesysActor } from '@/actor/GenesysActor';
import { advance, advancementCharacter, itemsRemovedByUndo, undoEntry } from '@/actor/data/character/Advancement';

/**
 * Undo an entry of the Experience Journal, along with what it bought. When the undo deletes items, such as the talent
 * the entry bought, the user confirms first; an undo that only lowers a rating doesn't ask.
 */
export async function undoJournalEntry(actor: GenesysActor<'character'>, index: number) {
	const removed = itemsRemovedByUndo(advancementCharacter(actor), index);
	if (removed.length > 0 && !(await confirmRemoval(removed))) {
		return;
	}

	await advance(actor, (character) => undoEntry(character, index));
}

/**
 * Ask the user to confirm the items an undo deletes, named in the game's language. No is the dialog's default button,
 * and closing it keeps the entry, as No does.
 */
async function confirmRemoval(names: string[]) {
	const items = new Intl.ListFormat(game.i18n.lang, { type: 'conjunction' }).format(names);
	// The names are the user's text: the paragraph takes them as text, never as HTML.
	const paragraph = document.createElement('p');
	paragraph.textContent = game.i18n.format('Genesys.Dialogs.ConfirmUndoEntry.Content', { items });
	const content = document.createElement('div');
	content.append(paragraph);

	const confirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: 'Genesys.Dialogs.ConfirmUndoEntry.Title' },
		content,
		rejectClose: false,
	});
	return confirmed === true;
}
