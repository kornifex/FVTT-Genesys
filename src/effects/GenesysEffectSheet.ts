import GenesysEffect from '@/effects/GenesysEffect';
import { Characteristic } from '@/data/Characteristics';
import { EditedChange, fromEditedChange, skillChoices, subjectFieldForKey, toEditedChange } from '@/effects/PoolModifications';
import './GenesysEffectSheet.scss';

type IncompleteSheetSubmitData = { changes: EditedChange[] };

export default class GenesysEffectSheet extends ActiveEffectConfig<GenesysEffect> {
	static override get defaultOptions() {
		return {
			...super.defaultOptions,
			classes: ['genesys', 'sheet'],
			width: 500,
			height: 400,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'description',
				},
			],
		};
	}

	override get template(): string {
		return 'systems/genesys/templates/sheets/effect-config.hbs';
	}

	override async getData(options?: DocumentSheetOptions) {
		const data = await super.getData(options);

		// The 'Custom' mode is not explicitly used.
		delete data.modes[CONST.ACTIVE_EFFECT_MODES.CUSTOM];

		// Edit copies of the changes, because opening the sheet must not modify the effect itself.
		const changes = data.data.changes.map(toEditedChange);

		return foundry.utils.mergeObject(data, {
			changes,
			skills: skillChoices(
				CONFIG.genesys.skills.map((skill) => skill.name),
				changes,
			),
			characteristics: Object.fromEntries(Object.entries(Characteristic).map(([charName, charKey]) => [charKey, charName])),
		});
	}

	override activateListeners(html: JQuery) {
		super.activateListeners(html);

		// Make sure we show/hide the proper `select` elements when picking a dice pool modification.
		html.find('.effect-change > select:first-child').on('change', (event) => {
			const targetSelect = event.currentTarget as HTMLSelectElement;
			const targetOptionType = subjectFieldForKey(targetSelect.value);

			const children = targetSelect.nextElementSibling?.children ?? [];
			for (let k = 0; k < children.length; k++) {
				if (children[k].classList.contains(targetOptionType)) {
					children[k].classList.add('show-it');
				} else {
					children[k].classList.remove('show-it');
				}
			}
		});

		if (this.isEditable) {
			// Bind our own image picker in place of Foundry's.
			html.find('img[data-edit]').off('click');
			html.find('img[data-edit]').on('click', (event) => void this._onEditImage(event));
		}
	}

	protected async _onEditImage(event: JQuery.ClickEvent) {
		const fp = new FilePicker({
			type: 'image',
			current: this.object.img,
			callback: async (path: string) => {
				(<HTMLImageElement>event.currentTarget).src = path;
				// _onSubmit only prevents the event's default, which a jQuery event does too.
				await this._onSubmit(event as unknown as Event, { preventClose: true });
			},
			top: (this.position.top ?? 0) + 40,
			left: (this.position.left ?? 0) + 10,
		});

		await fp.browse();
	}

	protected override _getSubmitData(updateData?: Record<string, unknown>) {
		const submitData = super._getSubmitData(updateData) as IncompleteSheetSubmitData;
		submitData.changes.forEach(fromEditedChange);

		return submitData;
	}
}
