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
const ACTOR_GLYPH = '\u{1F9D1}';
const VEHICLE_GLYPH = '\u{1F697}';
const ANY_ACTOR_GLYPH = '\u{1F310}';
const SELF_GLYPH = '\u{1F447}';
const TARGET_GLYPH = '\u{1F3AF}';

/**
 * A key the Changes tab offers: the glyph of what it applies to, and the localization key of its label.
 */
type ChangeKey = { key: string; appliesTo: string; label: string };

/**
 * The keys the Changes tab offers, by group.
 */
const CHANGE_KEYS: { group: string; keys: ChangeKey[] }[] = [
	{
		group: 'Genesys.ActiveEffects.Types.ModifyCharacteristic',
		keys: [
			...CHARACTERISTICS.map(({ characteristic, label }) => ({
				key: `system.characteristics.${characteristic}`,
				appliesTo: ACTOR_GLYPH,
				label,
			})),
			{ key: 'system.silhouette', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.Silhouette' },
			{ key: 'system.speed', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.Speed' },
			{ key: 'system.handling', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.Handling' },
			{ key: 'system.defense', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.Defense' },
			{ key: 'system.armor', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.Armor' },
		],
	},
	{
		group: 'Genesys.ActiveEffects.Types.ModifyStat',
		keys: [
			{ key: 'system.soak', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.SoakValue' },
			{ key: 'system.wounds.max', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.WoundThreshold' },
			{ key: 'system.strain.max', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.StrainThreshold' },
			{ key: 'system.defense.melee', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.MeleeDefense' },
			{ key: 'system.defense.ranged', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.RangedDefense' },
			{ key: 'system.hullTrauma.max', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.HullTraumaThreshold' },
			{ key: 'system.systemStrain.max', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.SystemStrainThreshold' },
			{ key: 'system.passengers.value', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.Passengers' },
			{ key: 'system.passengers.threshold', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.PassengerCapacity' },
			{ key: 'system.encumbrance.value', appliesTo: ANY_ACTOR_GLYPH, label: 'Genesys.Labels.Encumbrance' },
			{ key: 'system.encumbrance.threshold', appliesTo: ANY_ACTOR_GLYPH, label: 'Genesys.Labels.EncumbranceThreshold' },
		],
	},
	{
		group: 'Genesys.ActiveEffects.Types.ModifyDicePool.GroupLabel',
		keys: [
			{ key: 'genesys.pool.check.self', appliesTo: SELF_GLYPH, label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Check' },
			{
				key: 'genesys.pool.char.self',
				appliesTo: SELF_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Characteristic',
			},
			{ key: 'genesys.pool.skill.self', appliesTo: SELF_GLYPH, label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Skill' },
			{
				key: 'genesys.pool.check.target',
				appliesTo: TARGET_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Check',
			},
			{
				key: 'genesys.pool.char.target',
				appliesTo: TARGET_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Characteristic',
			},
			{
				key: 'genesys.pool.skill.target',
				appliesTo: TARGET_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.Skill',
			},
		],
	},
];

/**
 * The options of the key selects, grouped. Foundry v14 removed the `{{select}}` helper that picked one of the
 * template's own options, so `{{selectOptions}}` renders these.
 */
function keyOptions() {
	return CHANGE_KEYS.flatMap(({ group, keys }) =>
		keys.map(({ key, appliesTo, label }) => ({
			value: key,
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

/**
 * Where an effect keeps its changes, in its data and in the sheet's form.
 */
function changesPath() {
	// v13: an effect keeps its changes in `changes`, which v14 moved to `system.changes`.
	return isFoundryV13() ? 'changes' : 'system.changes';
}

/**
 * The change types the type selects offer, sorted by label as Foundry's sheet lists them. A change keeps a type no
 * module registers anymore, which Foundry's form processing then leaves as stored, rather than taking the first one.
 */
function changeTypeChoices(changes: EditedChange[]) {
	const labels = Object.entries(changeTypes()).map(([type, { label }]): [string, string] => [type, game.i18n.localize(label)]);
	const unregistered = changes.flatMap(({ type }): [string, string][] => (type && !(type in changeTypes()) ? [[type, type]] : []));
	return Object.fromEntries([...labels.sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang)), ...unregistered]);
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
			const changes = (foundry.utils.getProperty(partContext.source as object, changesPath()) as EditedChange[]).map(toEditedChange);

			partContext.changesPath = changesPath();
			partContext.changeFields = this.#changeFields();
			partContext.changes = changes;
			partContext.keys = keyOptions();
			partContext.skills = skillChoices(
				CONFIG.genesys.skills.map((skill) => skill.name),
				changes,
			);
			partContext.characteristics = CHARACTERISTICS;
			// v13: a change has a mode, whose choices and default priorities Foundry's context holds.
			partContext.v13 = isFoundryV13();
			if (!isFoundryV13()) {
				partContext.changeTypes = changeTypeChoices(changes);
				partContext.priorities = Object.fromEntries(
					Object.entries(changeTypes()).map(([type, { defaultPriority }]) => [type, defaultPriority]),
				);
			}
		}

		return partContext;
	}

	/**
	 * The fields of a change, which the tab's inputs render.
	 */
	#changeFields() {
		// v13: the document's own schema holds the changes, which v14 moved to the schema of its system.
		const document = this.document as unknown as { schema: ChangesSchema; system: { schema: ChangesSchema } };
		return (isFoundryV13() ? document.schema : document.system.schema).fields.changes.element.fields;
	}

	override _onChangeForm(formConfig: Record<string, unknown>, event: Event) {
		super._onChangeForm(formConfig, event);

		const target = event.target as HTMLElement;
		if (target?.matches(`select[name^="${changesPath()}."][name$=".key"]`)) {
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
		const formDataExpanded = super._processFormData(event, form, formData);

		// v14's actions that add and delete a change read the changes from the processed form data too.
		const changes = foundry.utils.getProperty(formDataExpanded, changesPath()) as Record<string, EditedChange> | undefined;
		// v13: only a change with a mode, which v14 replaced with a type, reads Foundry's custom mode.
		foundry.utils.setProperty(
			formDataExpanded,
			changesPath(),
			Object.values(changes ?? {}).map((change) => fromEditedChange(change, () => CONST.ACTIVE_EFFECT_MODES.CUSTOM)),
		);

		return formDataExpanded;
	}
}
