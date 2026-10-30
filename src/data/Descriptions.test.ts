import { describe, expect, it } from 'vitest';
import { isEmptyDescription } from '@/data/Descriptions';

describe('isEmptyDescription', () => {
	it('reads as empty a description never written, and one cleared in the editor, which saves an empty paragraph', () => {
		expect(['', '<p></p>'].map(isEmptyDescription)).toEqual([true, true]);
	});

	it('reads as empty paragraphs holding only spaces, non-breaking ones included, and line breaks', () => {
		expect(['<p>&nbsp;</p>', '<p> </p>', '<p> <br></p>\n<p></p>'].map(isEmptyDescription)).toEqual([true, true, true]);
	});

	it('reads as written a description with text, an entity of a character, or an image or other media alone', () => {
		expect(
			['<p>Boiled leather.</p>', '<p>&amp;</p>', '<p><img src="icons/svg/sword.svg"></p>', '<video src="clip.webm"></video>'].map(
				isEmptyDescription,
			),
		).toEqual([false, false, false, false]);
	});
});
