/**
 * Enrich HTML through the configured text editor: its document links, inline rolls and custom enrichers (ours are in
 * `enrichers.ts`) become their rendered HTML.
 */
export async function enrich(html: string): Promise<string> {
	// Foundry has enriched asynchronously and ignored the `async` option since v13, but the types still read a call
	// without `async: true` as the old synchronous one, hence the `async` function around it.
	return foundry.applications.ux.TextEditor.implementation.enrichHTML(html);
}
