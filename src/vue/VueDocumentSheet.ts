/**
 * @file Mixin for rendering a document sheet with a Vue component: what the actor and item sheets share on top of VueSheet.
 */

import type { DeepPartial } from 'fvtt-types/utils';
import { ApplicationConstructor, VueSheet } from '@/vue/VueSheet';

type RenderContext = DeepPartial<foundry.applications.api.ApplicationV2.RenderContext>;
type RenderOptions = DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>;
type DocumentSheet = foundry.applications.api.DocumentSheetV2.Any;

/**
 * Mix the rendering of a document sheet with a Vue component into an ApplicationV2 document sheet class.
 */
export function VueDocumentSheet<TBase extends ApplicationConstructor<DocumentSheet>>(base: TBase) {
	return class extends VueSheet(base) {
		// Like AppV1's document sheets, a change to a field updates the document.
		static override DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2.DefaultOptions = {
			window: { resizable: true },
			form: { submitOnChange: true },
		};

		protected override async _onFirstRender(context: RenderContext, options: RenderOptions) {
			await super._onFirstRender(context, options);

			this.element.addEventListener('click', (event) => void editImage(this, event));
		}

		protected override async _onRender(context: RenderContext, options: RenderOptions) {
			await super._onRender(context, options);

			// A sheet opens at its content's height, on the tab it opens on, then keeps it as a height in pixels: Foundry's
			// `height: 'auto'` would follow the content on every later render, a tab switch or an expanded description
			// resizing the window.
			if (options.isFirstRender) {
				const { top } = this.position;
				this.#fitHeight(top);

				// The sheet shows at once, a text being enriched showing its raw text or nothing (#101): once the content of
				// such a task shows, the window fits it, unless the user has used the window meanwhile (moved or resized it,
				// switched its tab, opened a description), or something else placed it.
				const element = this.element;
				const { top: placed, height: fitted } = this.position;
				let used = false;
				const use = () => (used = true);
				element.addEventListener('pointerdown', use, { capture: true, once: true });
				element.addEventListener('keydown', use, { capture: true, once: true });
				void this.contentShown().then(() => {
					element.removeEventListener('pointerdown', use, { capture: true });
					element.removeEventListener('keydown', use, { capture: true });
					const { top: placedNow, height: fittedNow } = this.position;
					const untouched = !used && placedNow === placed && fittedNow === fitted;
					if (untouched && this.rendered && this.element === element && !this.minimized) {
						this.#fitHeight(top);
					}
				});
			}
		}

		/**
		 * Fit the window's height to its content: placed at `top`, or centred when it is undefined.
		 */
		#fitHeight(top: number | undefined) {
			// Foundry sizes a window once it has rendered: the window takes its width first, at which the content is measured.
			this.setPosition();
			this.setPosition({ top, height: naturalHeight(this.element, this.position.scale ?? 1) });
		}

		protected override async _preClose(options: RenderOptions) {
			await super._preClose(options);

			// AppV1's document sheets submitted on close. Leaving the focused field submits its change, if it has one.
			if (document.activeElement instanceof HTMLElement && this.element.contains(document.activeElement)) {
				document.activeElement.blur();
			}
		}
	};
}

/**
 * The height a window takes to show its whole content, at its present width. Its blocks fill the window's height (a sheet's
 * body and a tab's sections at `height: 100%`, a grid's `1fr` row), so its own height is measured with none set: the
 * window then takes its content's height, and no less than its minimum height. Foundry's maximum height, which keeps a
 * window on screen, is lifted too, as `setPosition` applies it and the viewport's.
 */
function naturalHeight(element: HTMLElement, scale: number) {
	const { height, maxHeight } = element.style;
	Object.assign(element.style, { height: '', maxHeight: 'none' });
	// The bounding box is scaled by the window's transform; a fraction of a pixel cut off would make the window scroll.
	const natural = Math.ceil(element.getBoundingClientRect().height / scale);
	Object.assign(element.style, { height, maxHeight });
	return natural;
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
	const defaultImage = imagePath(documentClass.getDefaultArtwork?.(source) ?? {}, field);
	const position = { top: sheet.position.top + 40, left: sheet.position.left + 10 };

	const picker = new foundry.applications.apps.FilePicker.implementation({
		current: imagePath(source, field),
		type: 'image',
		redirectToRoot: defaultImage ? [defaultImage] : [],
		// The Vue document sheets are those of actors and items.
		callback: (path) => void (sheet.document as Actor.Implementation | Item.Implementation).update({ [field]: path }),
		position,
	});
	await picker.browse();
}

/**
 * The path of the image a field of a document's data holds, if it holds one.
 */
function imagePath(data: object, field: string) {
	const path = foundry.utils.getProperty(data, field);
	return typeof path === 'string' ? path : undefined;
}
