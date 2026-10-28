/**
 * @file The v13 Foundry APIs the system calls, which the vendored v12 types in `types/foundry` lack (ADR 0005).
 *
 * Only the members the system uses are declared, so the whole layer is replaced in one move when v12 leaves support. The shapes
 * are v13's: v12's ApplicationV2 lacks `_createContextMenu`, and v12 has no `sidebar` namespace at all. v12's ActorSheetV2 has no
 * drop handlers, so the system's actor sheets bring their own (`GenesysActorSheet`) and v13's aren't declared.
 *
 * The vendored `Config` can't be merged with, so CONFIG's v13 entry (the v13 Combat Tracker in `ui.combat`) completes `GenesysConfig` in `src/global.d.ts` instead, and go with this layer.
 */

declare namespace foundry {
	namespace applications {
		/** A click handler of an Application's `data-action` elements. Foundry runs it with the Application as `this`, which a handler declares itself. */
		type ApplicationClickAction = (event: PointerEvent, target: HTMLElement) => void | Promise<void>;

		type ApplicationConfiguration = {
			id: string;
			classes: string[];
			tag: string;
			window: {
				frame?: boolean;
				positioned?: boolean;
				title?: string;
				icon?: string | false;
				minimizable?: boolean;
				resizable?: boolean;
				contentTag?: string;
				contentClasses?: string[];
			};
			actions: Record<string, ApplicationClickAction | { handler: ApplicationClickAction; buttons: number[] }>;
			form?: {
				handler?: (event: SubmitEvent | Event, form: HTMLFormElement, formData: FormDataExtended) => Promise<void>;
				submitOnChange?: boolean;
				closeOnSubmit?: boolean;
			};
			position: Partial<ApplicationPosition>;
		};

		type ApplicationPosition = {
			top: number;
			left: number;
			width: number | 'auto';
			height: number | 'auto';
			scale: number;
			zIndex: number;
		};

		type ApplicationRenderOptions = {
			force?: boolean;
			position?: Partial<ApplicationPosition>;
			window?: { title?: string; icon?: string | false; controls?: boolean };
			parts?: string[];
			isFirstRender?: boolean;
		};

		type ApplicationRenderContext = Record<string, unknown>;

		type HandlebarsTemplatePart = {
			template: string;
			id?: string;
			classes?: string[];
			templates?: string[];
			scrollable?: string[];
			forms?: Record<string, object>;
		};

		/** A v13 context menu entry, which receives the element of its row rather than a jQuery object. */
		type ContextMenuEntry = {
			name: string;
			icon?: string;
			classes?: string;
			group?: string;
			callback: (target: HTMLElement) => unknown;
			condition?: boolean | ((target: HTMLElement) => boolean);
		};

		type ContextMenuOptions = { container?: HTMLElement; hookName?: string; parentClassHooks?: boolean; fixed?: boolean };

		/** The rendered ApplicationV2 instances, by id: an element's id finds its application. */
		const instances: Map<string, api.ApplicationV2>;

		namespace api {
			class ApplicationV2 {
				constructor(options?: DeepPartial<ApplicationConfiguration>);

				static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

				readonly options: Readonly<ApplicationConfiguration>;

				get id(): string;

				get title(): string;

				get element(): HTMLElement;

				get rendered(): boolean;

				get position(): ApplicationPosition;

				render(options?: boolean | ApplicationRenderOptions): Promise<this>;

				close(options?: { animate?: boolean }): Promise<this>;

				setPosition(position?: Partial<ApplicationPosition>): ApplicationPosition | void;

				protected _prepareContext(options: ApplicationRenderOptions): Promise<ApplicationRenderContext>;

				protected _renderHTML(context: ApplicationRenderContext, options: ApplicationRenderOptions): Promise<unknown>;

				protected _replaceHTML(result: unknown, content: HTMLElement, options: ApplicationRenderOptions): void;

				protected _onFirstRender(context: ApplicationRenderContext, options: ApplicationRenderOptions): Promise<void>;

				protected _onRender(context: ApplicationRenderContext, options: ApplicationRenderOptions): Promise<void>;

				protected _preClose(options: object): Promise<void>;

				protected _onClose(options: object): void;

				protected _onChangeForm(formConfig: Record<string, unknown>, event: Event): void;

				protected _createContextMenu(
					handler: () => ContextMenuEntry[],
					selector: string,
					options?: ContextMenuOptions,
				): ContextMenu | null;
			}

			class DocumentSheetV2<TDocument extends foundry.abstract.Document = foundry.abstract.Document> extends ApplicationV2 {
				constructor(options: DeepPartial<ApplicationConfiguration> & { document: TDocument });

				get document(): TDocument;

				get isVisible(): boolean;

				get isEditable(): boolean;

				protected _processFormData(
					event: SubmitEvent | null,
					form: HTMLFormElement,
					formData: FormDataExtended,
				): Record<string, unknown>;
			}
		}

		namespace sheets {
			class ActorSheetV2<TActor extends Actor = Actor> extends api.DocumentSheetV2<TActor> {
				get actor(): TActor;

				get token(): TokenDocument | null;
			}

			class ItemSheetV2<TItem extends Item = Item> extends api.DocumentSheetV2<TItem> {
				get item(): TItem;

				get actor(): Actor | null;
			}
		}

		namespace sidebar {
			namespace tabs {
				/** The v13 Combat Tracker, an ApplicationV2 rendered from Handlebars parts. */
				class CombatTracker<TCombat extends Combat = Combat> extends api.ApplicationV2 {
					static PARTS: Record<string, HandlebarsTemplatePart>;

					get viewed(): TCombat | null;

					protected _prepareCombatContext(context: ApplicationRenderContext, options: ApplicationRenderOptions): Promise<void>;

					protected _prepareTrackerContext(context: ApplicationRenderContext, options: ApplicationRenderOptions): Promise<void>;

					protected _prepareTurnContext(combat: TCombat, combatant: Combatant, index: number): Promise<Record<string, unknown>>;

					protected _getEntryContextOptions(): ContextMenuEntry[];

					protected _onCombatantHoverIn(event: PointerEvent): void;

					protected _onCombatantMouseDown(event: PointerEvent, target: HTMLElement): void;
				}
			}
		}
	}
}
