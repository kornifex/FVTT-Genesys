import { Characteristic } from '@/data/Characteristics';
import GenesysEffect from './GenesysEffect';
import { EditedChange, fromEditedChange, skillChoices, subjectFieldForKey, toEditedChange } from '@/effects/PoolModifications';

export default class GenesysEffectSheetV2 extends ActiveEffectConfig<GenesysEffect> {
	static DEFAULT_OPTIONS = {
		classes: ['effect-sheet-v2'],
	};

	static override PARTS = {
		...super.PARTS,
		changes: { template: 'systems/genesys/templates/sheets/effect-changes-tab.hbs' },
	};

	override async _preparePartContext(partId: string, context: Record<string, unknown>): Promise<Record<string, unknown>> {
		const partContext = (await super._preparePartContext(partId, context)) as Record<string, unknown> & { source: GenesysEffect };

		if (partId === 'changes') {
			const changes = partContext.source.changes.map(toEditedChange);

			partContext.changes = changes;
			partContext.skills = skillChoices(
				CONFIG.genesys.skills.map((skill) => skill.name),
				changes,
			);
			partContext.characteristics = Object.fromEntries(
				Object.entries(Characteristic).map(([charName, charKey]) => [charKey, charName]),
			);
		}

		return partContext;
	}

	override _onChangeForm(formConfig: Record<string, unknown>, event: Event) {
		super._onChangeForm(formConfig, event);

		const target = event.target as HTMLElement;
		if (target?.matches('select[name^="changes."][name$=".key"]')) {
			const targetSelect = target as HTMLSelectElement;
			const targetOptionType = subjectFieldForKey(targetSelect.value);

			const children = targetSelect.closest('li')?.querySelector('.mode')?.children as HTMLCollection;
			for (let k = 0; k < children.length; k++) {
				if (children[k].classList.contains(targetOptionType)) {
					children[k].classList.add('show-it');
				} else {
					children[k].classList.remove('show-it');
				}
			}
		}
	}

	override _processFormData(event: Event, form: HTMLElement, formData: Record<string, unknown>) {
		const formDataExpanded = super._processFormData(event, form, formData) as { changes: EditedChange[] };
		formDataExpanded.changes = Object.values(formDataExpanded.changes || []).map(fromEditedChange);

		return formDataExpanded;
	}
}
