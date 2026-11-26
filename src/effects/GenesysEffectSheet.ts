import { CHARACTERISTICS } from '@/data/Characteristics';
import type { DeepPartial } from 'fvtt-types/utils';
import {
	EditedChange,
	fromEditedChange,
	POOL_MODIFICATION_TYPE,
	skillChoices,
	subjectFieldForKey,
	toEditedChange,
} from '@/effects/PoolModifications';
import {
	ATTACK_CHANGE_FIELDS,
	ATTACK_CHANGE_SCOPES,
	type AttackChangeField,
	type AttackChangeScope,
	attackChangeKey,
} from '@/effects/AttackChanges';
import { CAREER_SKILL_CHANGE_KEY } from '@/effects/CareerSkillChanges';
import { isForWeaponAttacksOnly, offersWeaponAttacksOnly, WEAPON_ATTACKS_ONLY_FLAG } from '@/effects/WeaponAttacksOnly';
import { CRITICAL_CHANGE_KEYS } from '@/dice/CriticalInjuryRoll';
import { HEALING_CHANGE_KEYS } from '@/actor/Recovery';
import { ITEM_CHANGE_FIELDS, ITEM_CHANGE_LABELS, itemChangeKey } from '@/item/ItemChanges';
import '@/effects/GenesysEffectSheet.scss';

/**
 * A change type, as Foundry v14 registers it in `ActiveEffect.CHANGE_TYPES`.
 */
type ChangeType = { label: string; defaultPriority: number };

type RenderContext = foundry.applications.api.ApplicationV2.RenderContextOf<GenesysEffectSheetV2>;
type RenderOptions = DeepPartial<foundry.applications.sheets.ActiveEffectConfig.RenderOptions>;

// What a key applies to, shown before its label: characters and adversaries, vehicles, both, the checks of the
// effect's actor, the checks that target it, and the weapon or armor that holds the effect.
const ACTOR_GLYPH = '\u{1F9D1}';
const VEHICLE_GLYPH = '\u{1F697}';
const ANY_ACTOR_GLYPH = '\u{1F310}';
const SELF_GLYPH = '\u{1F447}';
const TARGET_GLYPH = '\u{1F3AF}';
const ITEM_GLYPH = '\u{1F527}';

/**
 * A key the Changes tab offers: the glyph of what it applies to, and the localization key of its label.
 */
type ChangeKey = { key: string; appliesTo: string; label: string };

/**
 * The localization key of each Attack Change, by what it adds to and the attacks it applies to.
 */
const ATTACK_CHANGE_LABELS = {
	damage: {
		combat: 'Genesys.ActiveEffects.Types.ModifyAttack.Options.DamageCombat',
		melee: 'Genesys.ActiveEffects.Types.ModifyAttack.Options.DamageMelee',
		ranged: 'Genesys.ActiveEffects.Types.ModifyAttack.Options.DamageRanged',
	},
	critical: {
		combat: 'Genesys.ActiveEffects.Types.ModifyAttack.Options.CriticalCombat',
		melee: 'Genesys.ActiveEffects.Types.ModifyAttack.Options.CriticalMelee',
		ranged: 'Genesys.ActiveEffects.Types.ModifyAttack.Options.CriticalRanged',
	},
} as const satisfies Record<AttackChangeField, Record<AttackChangeScope, string>>;

/**
 * The keys the Changes tab offers, by group.
 */
export const CHANGE_KEYS: { group: string; keys: ChangeKey[] }[] = [
	{
		group: 'Genesys.ActiveEffects.Types.ModifyCharacteristic',
		keys: [
			...CHARACTERISTICS.map(({ characteristic, label }) => ({
				key: `system.characteristics.${characteristic}`,
				appliesTo: ACTOR_GLYPH,
				label,
			})),
			{ key: 'system.silhouette', appliesTo: ANY_ACTOR_GLYPH, label: 'Genesys.Labels.Silhouette' },
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
			{ key: 'system.pilotedVehicleDefense', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.PilotedVehicleDefense' },
			{ key: 'system.hullTrauma.max', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.HullTraumaThreshold' },
			{ key: 'system.systemStrain.max', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.SystemStrainThreshold' },
			{ key: 'system.passengers.value', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.Passengers' },
			{ key: 'system.passengers.threshold', appliesTo: VEHICLE_GLYPH, label: 'Genesys.Labels.PassengerCapacity' },
			{ key: 'system.encumbrance.value', appliesTo: ANY_ACTOR_GLYPH, label: 'Genesys.Labels.Encumbrance' },
			{ key: 'system.encumbrance.threshold', appliesTo: ANY_ACTOR_GLYPH, label: 'Genesys.Labels.EncumbranceThreshold' },
		],
	},
	{
		// The defense that sources such as cover provide, of which the actor keeps the best: written with the Upgrade type
		// (CRB p. 106).
		group: 'Genesys.ActiveEffects.Types.ProvideDefense',
		keys: [
			{ key: 'system.providedDefense.melee', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.MeleeDefense' },
			{ key: 'system.providedDefense.ranged', appliesTo: ACTOR_GLYPH, label: 'Genesys.Labels.RangedDefense' },
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
				key: 'genesys.pool.combat.self',
				appliesTo: SELF_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.CombatCheck',
			},
			{
				key: 'genesys.pool.melee.self',
				appliesTo: SELF_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.MeleeAttack',
			},
			{
				key: 'genesys.pool.ranged.self',
				appliesTo: SELF_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.RangedAttack',
			},
			// Initiative has no target, so it has no key of the checks that target the actor.
			{
				key: 'genesys.pool.initiative.self',
				appliesTo: SELF_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.InitiativeCheck',
			},
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
			{
				key: 'genesys.pool.combat.target',
				appliesTo: TARGET_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.CombatCheck',
			},
			{
				key: 'genesys.pool.melee.target',
				appliesTo: TARGET_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.MeleeAttack',
			},
			{
				key: 'genesys.pool.ranged.target',
				appliesTo: TARGET_GLYPH,
				label: 'Genesys.ActiveEffects.Types.ModifyDicePool.Options.RangedAttack',
			},
		],
	},
	{
		// What the effect's actor adds to the Critical Injury rolls of the injuries it inflicts on its targets, and of those
		// it suffers itself.
		group: 'Genesys.CriticalInjuryPrompt.Effects.GroupLabel',
		keys: [
			{ key: CRITICAL_CHANGE_KEYS.inflicted, appliesTo: TARGET_GLYPH, label: 'Genesys.CriticalInjuryPrompt.Effects.Inflicted' },
			{ key: CRITICAL_CHANGE_KEYS.suffered, appliesTo: SELF_GLYPH, label: 'Genesys.CriticalInjuryPrompt.Effects.Suffered' },
		],
	},
	{
		// What the effect's actor adds to the wounds their Medicine checks heal, as Surgeon does (CRB p. 74).
		group: 'Genesys.Recovery.Effects.GroupLabel',
		keys: [{ key: HEALING_CHANGE_KEYS.medicineWounds, appliesTo: SELF_GLYPH, label: 'Genesys.Recovery.Effects.MedicineWounds' }],
	},
	{
		// What the effect's actor adds to the damage and to the Critical rating of the attacks it makes, as Battle Rage does
		// (RoT p. 67).
		group: 'Genesys.ActiveEffects.Types.ModifyAttack.GroupLabel',
		keys: ATTACK_CHANGE_FIELDS.flatMap((field) =>
			ATTACK_CHANGE_SCOPES.map((scope) => ({
				key: attackChangeKey(field, scope),
				appliesTo: SELF_GLYPH,
				label: ATTACK_CHANGE_LABELS[field][scope],
			})),
		),
	},
	{
		// The skill the effect's character counts as a career skill, as Bard does (RoT p. 87).
		group: 'Genesys.ActiveEffects.Types.CareerSkill.GroupLabel',
		keys: [{ key: CAREER_SKILL_CHANGE_KEY, appliesTo: ACTOR_GLYPH, label: 'Genesys.ActiveEffects.Types.CareerSkill.Option' }],
	},
	{
		group: 'Genesys.ActiveEffects.Types.ModifyItem',
		keys: ITEM_CHANGE_FIELDS.map((field) => ({ key: itemChangeKey(field), appliesTo: ITEM_GLYPH, label: ITEM_CHANGE_LABELS[field] })),
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
	// The types let any key look up a type, which only the registered ones hold.
	return ActiveEffect.CHANGE_TYPES as Record<string, ChangeType>;
}

/**
 * The change types the type selects offer, sorted by label as Foundry's sheet lists them. A change keeps a type no
 * module registers anymore, which Foundry's form processing then leaves as stored, rather than taking the first one.
 * The type of Pool Modifications is left out: their key gives it, and it would leave any other change unapplied.
 */
function changeTypeChoices(changes: EditedChange[]) {
	const labels = Object.entries(changeTypes())
		.filter(([type]) => type !== POOL_MODIFICATION_TYPE)
		.map(([type, { label }]): [string, string] => [type, game.i18n.localize(label)]);
	const unregistered = changes.flatMap(({ type }): [string, string][] => (type && !(type in changeTypes()) ? [[type, type]] : []));
	return Object.fromEntries([...labels.sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang)), ...unregistered]);
}

/**
 * The sheet of an Active Effect, whose Changes tab offers the system's keys and Pool Modifications. The class keeps its
 * name: Foundry identifies a sheet as `genesys.<class name>` in the `core.sheetClass` flag of the effects.
 */
export class GenesysEffectSheetV2 extends foundry.applications.sheets.ActiveEffectConfig {
	static override DEFAULT_OPTIONS = {
		classes: ['effect-sheet-v2'],
	};

	static override PARTS = {
		...super.PARTS,
		changes: { template: 'systems/genesys/templates/sheets/effect-changes-tab.hbs' },
	};

	override async _preparePartContext(partId: string, context: RenderContext, options: RenderOptions) {
		const partContext = await super._preparePartContext(partId, context, options);

		if (partId === 'changes') {
			// Each change shows the field that edits what its key applies to.
			const changes = (foundry.utils.getProperty(partContext.source, 'system.changes') as EditedChange[]).map((change) => {
				const edited = toEditedChange(change);
				return { ...edited, subjectField: subjectFieldForKey(edited.key) };
			});

			// The template reads the system's own entries, which the types of Foundry's context lack.
			Object.assign(partContext, {
				changeFields: this.#changeFields(),
				changes,
				keys: keyOptions(),
				skills: skillChoices(
					CONFIG.genesys.skills.map((skill) => skill.name),
					changes,
				),
				characteristics: CHARACTERISTICS,
				changeTypes: changeTypeChoices(changes),
				priorities: Object.fromEntries(Object.entries(changeTypes()).map(([type, { defaultPriority }]) => [type, defaultPriority])),
				// A weapon's own effect can count for its attacks only (#929).
				weaponAttacksOnly: offersWeaponAttacksOnly(this.document, this.document.parent)
					? {
							checked: isForWeaponAttacksOnly(partContext.source, this.document.parent),
							name: `flags.genesys.${WEAPON_ATTACKS_ONLY_FLAG}`,
						}
					: undefined,
			});
		}

		return partContext;
	}

	/**
	 * The fields of a change, which the tab's inputs render.
	 */
	#changeFields() {
		return this.document.system.schema.fields.changes.element.fields;
	}

	override _onChangeForm(formConfig: foundry.applications.api.ApplicationV2.FormConfiguration, event: Event) {
		super._onChangeForm(formConfig, event);

		const target = event.target as HTMLElement;
		if (target?.matches('select[name^="system.changes."][name$=".key"]')) {
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

	override _processFormData(event: SubmitEvent | null, form: HTMLFormElement, formData: foundry.applications.ux.FormDataExtended) {
		const formDataExpanded = super._processFormData(event, form, formData);

		// Foundry's actions that add and delete a change read the changes from the processed form data too.
		const changes = foundry.utils.getProperty(formDataExpanded, 'system.changes') as Record<string, EditedChange> | undefined;
		foundry.utils.setProperty(formDataExpanded, 'system.changes', Object.values(changes ?? {}).map(fromEditedChange));

		return formDataExpanded;
	}
}
