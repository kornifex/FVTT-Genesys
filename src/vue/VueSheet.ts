/**
 * @file Mixin for rendering an ApplicationV2 with a Vue component.
 */

import { App, Component, createApp, nextTick } from 'vue';
import { provideSheetContext } from '@/vue/SheetContext';

import '@/vue/VueSheet.scss';

type ApplicationV2 = foundry.applications.api.ApplicationV2;

/**
 * The constructor of an ApplicationV2 class the mixins extend.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeScript only lets a class extend a constructor that takes any[].
export type ApplicationConstructor<T extends ApplicationV2 = ApplicationV2> = new (...args: any[]) => T;

type RenderContext = foundry.applications.ApplicationRenderContext;
type RenderOptions = foundry.applications.ApplicationRenderOptions;

/**
 * Mix the rendering of a Vue component into an ApplicationV2 class: the component mounts on the first render, and later
 * renders hand it their new context, which its components read through `useSheetContext` or `useSheetDocument`.
 */
export function VueSheet<TBase extends ApplicationConstructor, ContextType extends object | undefined = object>(base: TBase) {
	return class extends base {
		// The Vue components are styled for AppV1 windows: rendered in a form, and in the light theme, which v13 gives AppV1
		// windows while ApplicationV2 ones follow the interface's theme.
		static DEFAULT_OPTIONS: DeepPartial<foundry.applications.ApplicationConfiguration> = {
			tag: 'form',
			classes: ['themed', 'theme-light'],
		};

		/**
		 * Handle for the active Vue app.
		 */
		vueApp?: App;

		/**
		 * Hands the active Vue app the context of a render after the first.
		 */
		#renderContext?: (context: ContextType | undefined) => void;

		/**
		 * Tab controller, kept for the application's lifetime so that a reopened application shows the tab it was closed on.
		 */
		#tabs?: foundry.applications.ux.Tabs;

		/**
		 * The element the tab controller is bound to: closing the application discards its element.
		 */
		#tabsElement?: HTMLElement;

		/**
		 * This component must be implemented by children to define the Vue component to use for the sheet.
		 */
		get vueComponent(): Component {
			throw new Error(`${this.constructor.name} defines no Vue component`);
		}

		/**
		 * The context data injected into the Vue component, which it renders instead of Foundry's render context.
		 */
		async getVueContext(): Promise<ContextType | undefined> {
			return undefined;
		}

		/**
		 * The tab shown first, when the Vue component lays out tabs: a `.sheet-tabs` nav switching the tabs of a `.sheet-body`.
		 */
		get initialTab(): string | undefined {
			return undefined;
		}

		protected override async _renderHTML(_context: RenderContext, _options: RenderOptions) {
			return this.getVueContext();
		}

		protected override _replaceHTML(result: unknown, content: HTMLElement, _options: RenderOptions) {
			const vueContext = result as ContextType | undefined;

			if (!this.vueApp) {
				const mountPoint = document.createElement('div');
				mountPoint.className = 'vue-app';
				content.replaceChildren(mountPoint);

				this.vueApp = createApp(this.vueComponent);
				this.#renderContext = provideSheetContext(this.vueApp, vueContext);
				this.vueApp.mount(mountPoint);
			} else {
				// Foundry changes the documents out of Vue's sight: each render signals the components to read them again.
				this.#renderContext?.(vueContext);
			}
		}

		protected override async _onRender(context: RenderContext, options: RenderOptions) {
			await super._onRender(context, options);

			// Vue patches the DOM on its next tick, which may add tabs.
			await nextTick();

			const initial = this.initialTab;
			if (!initial) {
				return;
			}

			this.#tabs ??= new foundry.applications.ux.Tabs({ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial });
			if (this.#tabsElement === this.element) {
				this.#tabs.activate(this.#tabs.active);
			} else {
				this.#tabs.bind(this.element);
				this.#tabsElement = this.element;
			}
		}

		/**
		 * Unmount and destroy the Vue app on close.
		 */
		protected override _onClose(options: object) {
			this.vueApp?.unmount();
			this.vueApp = undefined;
			this.#renderContext = undefined;

			super._onClose(options);
		}
	};
}
