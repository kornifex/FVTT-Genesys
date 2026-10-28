import { CHARACTERISTICS } from '@/data/Characteristics';
import { GenesysEffect } from '@/effects/GenesysEffect';
import { EditedChange, fromEditedChange, skillChoices, subjectFieldForKey, toEditedChange } from '@/effects/PoolModifications';
import { isFoundryV13 } from '@/foundryGeneration';
import '@/effects/GenesysEffectSheet.scss';

/**
 * A change type, as Foundry v14 registers it in `ActiveEffect.CHANGE_TYPES`.
 */
type ChangeType = { label: string; defaultPriority: number };

/**
 * What the sheet reads of the schema that holds the changes: the fields of a change, which its inputs render.
 */
type ChangesSchema = { fields: { changes: { element: { fields: Record<string, unknown> } } } };

// What a key applies to, shown before its label: characters and adversaries, vehicles, both, the checks of the
// effect's actor, and the checks that target it.
const ACTOR = '\u{1F9D1}';
const VEHICLE = '\u{1F697}';
const ANY_ACTOR = '\u{1F310}';
const SELF = '\u{1F447}';
const TARGET = '\u{1F3AF}';

/**
 * The keys the Changes tab offers, by group: each key, what it applies to, and the localization key of its label.
 */
const CHANGE_KEYS: { group: string; keys: [string, string, string][] }[] = [
	{
		group: 'Genesys.ActiveEffects.Types.ModifyCharacteristic',
		keys: [
			...CHARACTERISTICS.map(({ characteristic, label }): [string, string, string] => [
				`system.characteristics.${characteristic}`,
				ACTOR,
				label,
			]),
			['system.silhouette', VEHICLE, 'Genesys.Labels.Silhouette'],
			['system.speed', VEHICLE, 'Genesys.Labels.Speed'],
			['system.handling', VEHICLE, 'Genesys.Labels.Handling'],
			['system.defense', VEHICLE, 'Genesys.Labels.Defense'],
			['system.armor', VEHICLE, 'Genesys.Labels.Armor'],
		],
	},
	{
		group: 'Genesys.ActiveEffects.Types.ModifyStat',
		keys: [
			['system.soak', ACTOR, 'Genesys.Labels.SoakValue'],
			['system.wounds.max', ACTOR, 'Genesys.Labels.WoundThreshold'],
			['system.strain.max', ACTOR, 'Genesys.Labels.StrainThreshold'],
			['system.defense.melee', ACTOR, 'Genesys.Labels.MeleeDefense'],
			['system.defense.ranged', ACTOR, 'Genesys.Labels.RangedDefense'],
			['system.hullTrauma.max', VEHICLE, 'Genesys.Labels.HullTraumaThreshold'],
			['system.systemStrain.max', VEHICLE, 'Genesys.Labels.SystemStrainThreshold'],
			['system.passengers.value', VEHICLE, 'Genesys.Labels.Passengers'],
			['system.passengers.threshold', VEHICLE, 'Genesys.Labels.PassengerCapacity'],
			['system.encumbrance.value', ANY_ACTOR, 'Genesys.Labels.Encumbrance'],
			['system.encumbrance.threshold', ANY_ACTOR, 'Genesys.Labels.EncumbranceThreshold'],
		],
	},
	{
		group: 'Genesys.ActiveEffects.Types.ModifyDicePool.GroupLabel',
		keys: [
			['genesys.pool.check.self', SELF, 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Check'],
			['genesys.pool.char.self', SELF, 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Characteristic'],
			['genesys.pool.skill.self', SELF, 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Skill'],
			['genesys.pool.check.target', TARGET, 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Check'],
			['genesys.pool.char.target', TARGET, 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Characteristic'],
			['genesys.pool.skill.target', TARGET, 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Skill'],
		],
	},
];

/**
 * The options of the key selects, grouped. Foundry v14 removed the `{{select}}` helper that picked one of the
 * template's own options, so `{{selectOptions}}` renders these.
 */
function keyOptions() {
	return CHANGE_KEYS.flatMap(({ group, keys }) =>
		keys.map(([value, appliesTo, label]) => ({
			value,
			label: `${appliesTo} ${game.i18n.localize(label)}`,
			group: game.i18n.localize(group),
		})),
	);
}

/**
 * The change types v14 offers, core's and those systems and modules register.
 */
function changeTypes() {
	// The vendored Foundry types predate v14, which gave changes a type.
	return (ActiveEffect as unknown as { CHANGE_TYPES: Record<string, ChangeType> }).CHANGE_TYPES;
}

// The class keeps its name: Foundry identifies a sheet as `genesys.<class name>` in the `core.sheetClass` flag of the effects.
export class GenesysEffectSheetV2 extends ActiveEffectConfig<GenesysEffect> {
	static DEFAULT_OPTIONS = {
		classes: ['effect-sheet-v2'],
	};

	static override PARTS = {
		...super.PARTS,
		changes: { template: 'systems/genesys/templates/sheets/effect-changes-tab.hbs' },
	};

	override async _preparePartContext(partId: string, context: Record<string, unknown>): Promise<Record<string, unknown>> {
		const partContext = await super._preparePartContext(partId, context);

		if (partId === 'changes') {
			// v13: an effect keeps its changes in `changes`, which v14 moved to `system.changes`.
			const v13 = isFoundryV13();
			const source = partContext.source as { changes: EditedChange[]; system: { changes: EditedChange[] } };
			const changes = (v13 ? source.changes : source.system.changes).map(toEditedChange);
			const document = this.document as unknown as { schema: ChangesSchema; system: { schema: ChangesSchema } };

			partContext.v13 = v13;
			partContext.changesPath = v13 ? 'changes' : 'system.changes';
			partContext.changeFields = (v13 ? document.schema : document.system.schema).fields.changes.element.fields;
			partContext.changes = changes;
			partContext.keys = keyOptions();
			partContext.skills = skillChoices(
				CONFIG.genesys.skills.map((skill) => skill.name),
				changes,
			);
			partContext.characteristics = CHARACTERISTICS;
			if (!v13) {
				// The types sorted by label, as Foundry's sheet lists them.
				const types = Object.entries(changeTypes());
				const labels = types.map(([type, { label }]) => [type, game.i18n.localize(label)]);
				partContext.changeTypes = Object.fromEntries(labels.sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang)));
				partContext.priorities = Object.fromEntries(types.map(([type, { defaultPriority }]) => [type, defaultPriority]));
			}
		}

		return partContext;
	}

	override _onChangeForm(formConfig: Record<string, unknown>, event: Event) {
		super._onChangeForm(formConfig, event);

		const target = event.target as HTMLElement;
		if (target?.matches('select[name^="changes."][name$=".key"], select[name^="system.changes."][name$=".key"]')) {
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
		const formDataExpanded = super._processFormData(event, form, formData) as {
			changes?: EditedChange[];
			system?: { changes?: EditedChange[] };
		};

		// v13: the form posts the changes as `changes`, which v14 posts as `system.changes`. v14's actions that add and
		// delete a change read them there.
		if (isFoundryV13()) {
			formDataExpanded.changes = Object.values(formDataExpanded.changes || []).map(fromEditedChange);
		} else if (formDataExpanded.system?.changes) {
			formDataExpanded.system.changes = Object.values(formDataExpanded.system.changes).map(fromEditedChange);
		}

		return formDataExpanded;
	}
}
