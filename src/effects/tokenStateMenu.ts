/**
 * @file The Token States in the token's status menu: their registration as Foundry status effects, and their application for a number of rounds.
 */

import { isFoundryV13 } from '@/foundryGeneration';
import { durationInRounds, lapsingFor } from '@/effects/GenesysEffect';
import { enteredRounds } from '@/effects/LapsingEffects';
import { TOKEN_STATES, type TokenState, tokenState } from '@/effects/TokenStates';

type ChangeType = TokenState['changes'][number]['type'];

// v13: the mode of each type of change.
const V13_MODES = { custom: 'CUSTOM' } as const satisfies Record<ChangeType, string>;

/**
 * Adds the Token States to Foundry's status effects, after Foundry's own. A Lapsing state lasts one round by default.
 */
export function registerTokenStates() {
	// v13: a change has a numeric mode, which v14 replaced with a type, and logs a deprecation warning for.
	const changeType = (type: ChangeType) => (isFoundryV13() ? { mode: CONST.ACTIVE_EFFECT_MODES[V13_MODES[type]] } : { type });
	for (const state of TOKEN_STATES) {
		CONFIG.statusEffects.push({
			id: state.id,
			name: state.name,
			img: state.img,
			changes: state.changes.map(({ key, value, type }) => ({ key, value, ...changeType(type) })),
			...(state.lapses && lapsingFor(1)),
		} as CONFIG.StatusEffect);
	}
}

/**
 * The options of {@link GenesysActor.toggleStatusEffect}: Foundry's, and the rounds a Lapsing state is applied for.
 */
export type ToggleStatusEffectOptions = Actor.ToggleStatusEffectOptions & {
	/** The rounds a Lapsing Token State lasts, which the user is asked for when left undefined. */
	rounds?: number;
};

/**
 * The Lapsing Token State a toggle applies, or undefined when it toggles anything else: another status, a state the
 * actor already has, or a state turned off.
 */
export function lapsingStateApplied(actor: Actor.Implementation, statusId: string, { active }: ToggleStatusEffectOptions) {
	const state = tokenState(statusId);
	if (!state?.lapses || active === false) {
		return undefined;
	}

	// Foundry's own toggle finds the effect of a state among the actor's effects that hold that status alone.
	const has = actor.effects.some((effect) => effect.statuses.size === 1 && effect.statuses.has(statusId));
	return has ? undefined : state;
}

/**
 * Applies a Lapsing Token State to an actor for a number of rounds, asking the user for them when none is given. Gives
 * the effect created, or undefined when the user closed the question.
 */
export async function applyLapsingState(
	actor: Actor.Implementation,
	state: TokenState,
	{ rounds, overlay }: ToggleStatusEffectOptions,
): Promise<ActiveEffect.Stored | undefined> {
	const lasting = rounds ?? (await askRounds(state));
	if (lasting === undefined) {
		return undefined;
	}

	// As Foundry's own toggle creates it, with the rounds asked for.
	const EffectClass = CONFIG.ActiveEffect.documentClass;
	const effect = await EffectClass.fromStatusEffect(state.id, { parent: actor });
	effect.updateSource({ duration: durationInRounds(lasting) });
	if (overlay) {
		effect.updateSource({ flags: { core: { overlay: true } } });
	}

	return (await EffectClass.create(effect.toObject(), { parent: actor, keepId: true })) ?? undefined;
}

/**
 * Asks the user how many rounds a state lasts, one by default. Undefined when they close the question.
 */
async function askRounds(state: TokenState): Promise<number | undefined> {
	const label = document.createElement('label');
	label.textContent = game.i18n.localize('Genesys.TokenStates.Rounds');
	const input = document.createElement('input');
	input.type = 'number';
	input.name = 'rounds';
	// The attribute, not the value: Foundry's dialog renders the content from its HTML.
	input.defaultValue = '1';
	input.min = '1';
	input.step = '1';
	input.autofocus = true;
	input.id = `genesys-token-state-rounds-${foundry.utils.randomID()}`;
	label.htmlFor = input.id;
	const fields = document.createElement('div');
	fields.className = 'form-fields';
	fields.append(input);
	const group = document.createElement('div');
	group.className = 'form-group';
	group.append(label, fields);
	// Foundry's dialog takes its content's children, and refuses an element with attributes.
	const content = document.createElement('div');
	content.append(group);

	const config: foundry.applications.api.DialogV2.PromptConfig = {
		window: { title: state.name },
		content,
		ok: {
			label: 'Genesys.TokenStates.Apply',
			callback: (_event, button) => {
				const entered = button.form?.elements.namedItem('rounds') as HTMLInputElement | null;
				return enteredRounds(entered?.valueAsNumber ?? NaN);
			},
		},
		rejectClose: false,
	};
	const rounds: unknown = await foundry.applications.api.DialogV2.prompt(config);

	return typeof rounds === 'number' ? rounds : undefined;
}
