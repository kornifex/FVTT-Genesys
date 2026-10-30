// The elements that show something without any text.
const MEDIA = /<(img|video|audio|iframe|embed|object|svg)\b/i;

/**
 * Whether an HTML description shows nothing: no text but spaces and no media. Foundry's editor saves a description
 * cleared in it as an empty paragraph, `<p></p>`, or one holding a non-breaking space.
 */
export function isEmptyDescription(html: string) {
	if (MEDIA.test(html)) {
		return false;
	}

	return (
		html
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.trim() === ''
	);
}
