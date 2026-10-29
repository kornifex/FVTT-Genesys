// `loadTemplates` is declared with v13's return type in `types/foundry-v13`.
declare namespace foundry.applications.handlebars {
	/**
	 * Get a template from the server by fetch request and caching the retrieved result
	 * @param path  The web-accessible HTML template URL
	 * @returns     A Promise which resolves to the compiled template or null
	 */
	function getTemplate(path: string): Promise<string>;

	/**
	 * Get and render a template using provided data and handle the returned HTML
	 * Support asynchronous file template file loading with a client-side caching layer
	 *
	 * @param path  The file path to the target HTML template
	 * @param data  A data object against which to compile the template
	 *
	 * @return      Returns the rendered HTML
	 */
	function renderTemplate(path: string, data?: object): Promise<string>;
}
