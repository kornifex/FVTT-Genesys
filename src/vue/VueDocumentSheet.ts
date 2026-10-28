/**
 * @file Mixin for rendering a document sheet with a Vue component: what the actor and item sheets share on top of VueSheet.
 */

import { ApplicationConstructor, VueSheet } from '@/vue/VueSheet';

type RenderContext = foundry.applications.ApplicationRenderContext;
type RenderOptions = foundry.applications.ApplicationRenderOptions;
type DocumentSheet = foundry.applications.api.DocumentSheetV2;

export function VueDocumentSheet<TBase extends ApplicationConstructor<DocumentSheet>>(base: TBase) {
	return class extends VueSheet(base) {
		// Like AppV1's document sheets, a change to a field updates the document.
		static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.ApplicationConfiguration> = {
			window: { resizable: true },
			form: { submitOnChange: true },
		};

		/**
		 * Handle data dropped on the sheet.
		 */
		protected async _onDrop(_event: DragEvent) {}

		protected override async _onFirstRender(context: RenderContext, options: RenderOptions) {
			await super._onFirstRender(context, options);

			this.element.addEventListener('click', (event) => void editImage(this, event));
		}

		protected override async _onRender(context: RenderContext, options: RenderOptions) {
			await super._onRender(context, options);

			// Foundry's DragDrop assigns the same element properties, so this replaces the handlers v13's actor sheets bind on
			// each render.
			this.element.ondragover = (event) => event.preventDefault();
			this.element.ondrop = (event) => {
				event.preventDefault();
				void this._onDrop(event);
			};
		}

		protected override async _preClose(options: object) {
			await super._preClose(options);

			// AppV1's document sheets submitted on close. Leaving the focused field submits its change, if it has one.
			if (document.activeElement instanceof HTMLElement && this.element.contains(document.activeElement)) {
				document.activeElement.blur();
			}
		}
	};
}

/**
 * Open a file picker for the image a click lands on, when that image edits a field of the sheet's document (`data-edit`).
 */
async function editImage(sheet: DocumentSheet, event: MouseEvent) {
	const image = (event.target as Element | null)?.closest<HTMLImageElement>('img[data-edit]');
	const field = image?.dataset.edit;
	if (!field || !sheet.isEditable) {
		return;
	}

	const source = sheet.document._source;
	const documentClass = sheet.document.constructor as { getDefaultArtwork?: (source: object) => object };
	const defaultImage = foundry.utils.getProperty(documentClass.getDefaultArtwork?.(source) ?? {}, field);
	const position = { top: sheet.position.top + 40, left: sheet.position.left + 10 };

	const picker = new FilePicker({
		current: foundry.utils.getProperty(source, field),
		type: 'image',
		redirectToRoot: defaultImage ? [defaultImage] : [],
		callback: (path: string) => void sheet.document.update({ [field]: path }),
		position,
	});
	await picker.browse();
}
