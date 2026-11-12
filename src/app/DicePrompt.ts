import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysItem } from '@/item/GenesysItem';
import VueDicePrompt from '@/vue/apps/DicePrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';
import { Characteristic } from '@/data/Characteristics';
import { type CheckRoll, rollCheck } from '@/dice/CheckRoll';
import { diceRollerTarget } from '@/dice/DiceRoller';
import type { AttackProfile } from '@/item/WeaponProfiles';
import { EQUIPMENT_DAMAGE_LABELS, isUnusable } from '@/item/data/EquipmentDamage';
import { openingDifficulty } from '@/dice/Difficulty';
import type { RecoveryRequest } from '@/actor/Recovery';
import { type CheckSpend, spentPoints } from '@/dice/CheckStoryPoints';
import { StoryPointTracker } from '@/app/StoryPointTracker';
import { NAMESPACE as SETTINGS_NAMESPACE } from '@/settings';
import { KEY_STORY_POINTS, type StoryPointData } from '@/settings/storyPoints';
import { useUpEffects } from '@/effects/maneuverEffects';
import { ownedSkill } from '@/data/Skills';
import { spellAttackProfile, spellCast } from '@/item/SpellCasting';

/**
 * What the Dice Prompt rolls the check for.
 */
export const RollType = {
	Skill: 'skill',
	Attack: 'attack',
	Spell: 'spell',
	Initiative: 'initiative',
} as const;

/**
 * A check the Dice Prompt is answered for, and what its roll type needs on top of the dice pool: the weapon of an
 * attack and the Weapon Profile it is made with; the spell cast and the Additional Effects checked as the prompt opens.
 */
export type DicePromptRoll =
	| { type: typeof RollType.Skill }
	| { type: typeof RollType.Attack; weapon: GenesysItem<'weapon' | 'vehicleWeapon'>; profile: AttackProfile }
	| { type: typeof RollType.Spell; spell: GenesysItem<'spell'>; checkedEffects: string[] }
	| { type: typeof RollType.Initiative };

/**
 * What the Dice Prompt shows.
 */
export type DicePromptContext = {
	actor?: GenesysActor;
	skillName?: string;
	roll: DicePromptRoll;
	difficulty: string;
	impossible: boolean;
	characteristic?: Characteristic;
	/** The pools the roller spends from, as the world stores them when the prompt renders. */
	storyPoints: StoryPointData;
	/** Whether a GM is connected, who writes a player's spend. */
	gmConnected: boolean;
};

/**
 * The Dice Prompt's answer: the check and its dice pool, the Story Points the roller spends on it, and for a spell the
 * ids of the Additional Effects checked.
 */
export type DicePromptAnswer = CheckRoll & { spends: CheckSpend[]; spellEffects?: string[] };

/**
 * What a Dice Prompt opens with, besides its actor and skill.
 */
export type DicePromptOptions = {
	/**
	 * The check rolled, a skill check by default.
	 */
	roll?: DicePromptRoll;
	/**
	 * The difficulty's Pool Modification glyphs. When left out, the Skills Compendium skill's default difficulty, else
	 * the world's.
	 */
	difficulty?: string;
	/**
	 * Whether the check is an Impossible task, whose difficulty's glyphs are a Formidable one's.
	 */
	impossible?: boolean;
	/**
	 * Characteristic rolled when no skill is selected: the characteristic of a Characteristic Check, or of a skill the
	 * actor can't roll.
	 */
	characteristic?: Characteristic;
	/**
	 * The recovery the check is rolled for, whatever skill the roller picks: its card offers to heal the patient by the
	 * results.
	 */
	recovery?: RecoveryRequest;
};

/**
 * Dice pool prompt: it answers with the check and the dice pool the user built, once the Story Points they chose are
 * spent, undefined when they close it without rolling.
 */
export class DicePrompt extends VuePrompt<DicePromptAnswer | undefined>(undefined) {
	override get vueComponent() {
		return VueDicePrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-dice-prompt'],
		position: { width: 500 },
		window: { title: 'Genesys.DicePrompt.Title' },
	};

	/**
	 * Open a Dice Prompt for an actor's check with a skill, or a bare one without an actor, and roll the check it answers
	 * with.
	 */
	static async promptForRoll(actor: GenesysActor | undefined, skillName: string, options: DicePromptOptions = {}) {
		// The weapon can take major damage while the prompt is open: the attack is refused as it opens and as it rolls.
		if (options.roll?.type === RollType.Attack && refuseUnusableWeapon(options.roll.weapon)) {
			return;
		}

		const app = new DicePrompt(actor, skillName, options);
		const checkRoll = await app.prompt();
		if (!checkRoll || (app.roll.type === RollType.Attack && refuseUnusableWeapon(app.roll.weapon))) {
			return;
		}

		const cast = app.roll.type === RollType.Spell && actor ? castOf(actor, app.roll.spell, checkRoll.spellEffects ?? []) : undefined;
		await rollCheck(checkRoll, {
			attack: attackOf(app.roll, checkRoll, actor),
			recovery: app.recovery,
			spell: cast,
		});
		// The caster suffers the strain once the check is resolved, whatever its result (CRB p. 210). Past their strain
		// threshold, the update incapacitates them, as any strain does.
		if (cast && actor) {
			await sufferStrain(actor, cast.strain);
		}
		// Once rolled, the check uses up the effects it was the next check for, as an attack the roller's Aim.
		if (actor) {
			await useUpEffects(actor, checkRoll.check.purpose);
		}
	}

	/**
	 * Open a Dice Prompt for an actor's Characteristic Check.
	 */
	static async promptForCharacteristicCheck(actor: GenesysActor, characteristic: Characteristic) {
		await DicePrompt.promptForRoll(actor, '', { characteristic });
	}

	/**
	 * Open a Dice Prompt for an actor's initiative, and wait for the check to roll. Undefined when the prompt is closed
	 * without a roll.
	 */
	static async promptForInitiative(actor: GenesysActor | undefined, skillName: string, options: Omit<DicePromptOptions, 'roll'> = {}) {
		return new DicePrompt(actor, skillName, { ...options, roll: { type: RollType.Initiative } }).prompt();
	}

	/**
	 * Render the open Dice Prompts again, for the Story Points they offer: once the pools or the connected GMs change.
	 */
	static renderOpen() {
		for (const app of foundry.applications.instances.values()) {
			if (app instanceof DicePrompt) void app.render();
		}
	}

	actor?: GenesysActor;
	skillName?: string;
	roll: DicePromptRoll;
	difficulty: string;
	impossible: boolean;
	characteristic?: Characteristic;
	recovery?: RecoveryRequest;

	constructor(
		actor?: GenesysActor,
		skillName?: string,
		{ roll, difficulty, impossible, characteristic, recovery }: DicePromptOptions = {},
	) {
		super();

		this.actor = actor;
		this.skillName = skillName;
		this.roll = roll ?? { type: RollType.Skill };
		// Set once: picking another skill in the prompt leaves the difficulty alone.
		this.difficulty = openingDifficulty(difficulty, CONFIG.genesys.skills, skillName, CONFIG.genesys.settings.defaultDifficulty);
		this.impossible = impossible ?? false;
		this.characteristic = characteristic;
		this.recovery = recovery;
	}

	override async getVueContext(): Promise<DicePromptContext> {
		return {
			actor: this.actor,
			skillName: this.skillName,
			roll: this.roll,
			difficulty: this.difficulty,
			impossible: this.impossible,
			characteristic: this.characteristic,
			storyPoints: game.settings.get(SETTINGS_NAMESPACE, KEY_STORY_POINTS),
			gmConnected: !!game.users.activeGM,
		};
	}

	/**
	 * Spend the Story Points the roller chose before the check rolls, as they change its dice pool: the prompt stays open
	 * when they can't be, as the pool emptied or the GM left since it rendered.
	 */
	protected override async accept(answer: DicePromptAnswer | undefined) {
		const spent = spentPoints(answer?.spends ?? [], game.user.isGM);
		// An attack whose weapon became unusable while the prompt was open is refused once it answers: nothing is spent on it.
		const refusedAttack = this.roll.type === RollType.Attack && isUnusable(this.roll.weapon.system.damage);
		if ((!spent.player && !spent.gm) || refusedAttack) {
			return true;
		}

		return StoryPointTracker.spendStoryPoints(spent);
	}
}

/**
 * Whether an attack with a weapon is refused, as its major damage makes it unusable (CRB p. 89): the user is told which
 * weapon, and why.
 */
export function refuseUnusableWeapon(weapon: Pick<GenesysItem<'weapon' | 'vehicleWeapon'>, 'name' | 'system'>) {
	if (!isUnusable(weapon.system.damage)) {
		return false;
	}

	ui.notifications.warn(
		game.i18n.format('Genesys.Notifications.UnusableWeapon', {
			name: weapon.name,
			damage: game.i18n.localize(EQUIPMENT_DAMAGE_LABELS[weapon.system.damage]),
		}),
	);
	return true;
}

/**
 * What a spell's card shows of its casting by an actor, with the Additional Effects checked: a quality rated by the
 * caster's ranks counts those they own.
 */
function castOf(actor: GenesysActor, spell: GenesysItem<'spell'>, checked: string[]) {
	return spellCast(spell.system.additionalEffects, checked, ranksOf(actor));
}

/**
 * The ranks an actor owns in a skill, by its name, which a quality rated by the caster's ranks counts.
 */
function ranksOf(actor: GenesysActor | undefined) {
	return (name: string) => (actor && ownedSkill(actor.skills, name)?.system.rank) ?? 0;
}

/**
 * The profile of the attack a check rolls: a weapon's, or the magic attack's of an attack spell, with the Additional
 * Effects checked. Its damage adds the characteristic linked to the skill rolled (CRB p. 215), the characteristic rolled
 * without one.
 */
function attackOf(roll: DicePromptRoll, { check, spellEffects }: DicePromptAnswer, actor: GenesysActor | undefined) {
	if (roll.type === RollType.Attack) {
		return roll.profile;
	}

	if (roll.type !== RollType.Spell || !roll.spell.system.isAttack) {
		return undefined;
	}

	const characteristic = check.skill?.system.characteristic ?? check.characteristic ?? '-';
	return spellAttackProfile(roll.spell, spellEffects ?? [], characteristic, ranksOf(actor));
}

/**
 * Make an actor suffer strain, when they track it. Their strain may go past its threshold: the update's Threshold States
 * then incapacitate them.
 */
async function sufferStrain(actor: GenesysActor, strain: number) {
	const pool = 'strain' in actor.system ? actor.system.strain : undefined;
	if (pool) {
		await actor.update({ system: { strain: { value: pool.value + strain } } });
	}
}

/**
 * Open the Dice Roller: a Dice Prompt for the actor of the user's single controlled token, or a bare one when no token is
 * controlled.
 */
function openDiceRoller() {
	const target = diceRollerTarget<GenesysActor>(
		(canvas?.tokens?.controlled ?? []).map((token) => ({ actor: token.actor ?? undefined, vehicle: token.actor?.type === 'vehicle' })),
	);
	if ('error' in target) {
		ui.notifications.error(game.i18n.localize(target.error));
		return;
	}
	void DicePrompt.promptForRoll(target.actor, '');
}

/**
 * Open the Dice Roller on the `/gendr` chat command (GENesys Dice Roller), which a macro can send, and from a button of
 * the chat controls.
 */
export function register() {
	// A GM's connection opens the players' spends, which only a GM writes, and their leaving closes them.
	Hooks.on('userConnected', (user) => {
		if (user.isGM) DicePrompt.renderOpen();
	});

	Hooks.on('chatMessage', (_chatLog: ChatLog, message: string, _chatData: unknown) => {
		if (/^\/gendr(?:oll)?/i.test(message)) {
			openDiceRoller();
			return false;
		}
		return true;
	});

	// The chat log moves its controls between the notifications, while the sidebar is collapsed, and the chat form, and
	// fires this hook on each move: the button is added once, and moves with them.
	Hooks.on('renderChatInput', (_app, elements) => {
		const controls = elements['#chat-controls'];
		if (!controls || controls.querySelector('.dice-roller')) return;

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'ui-control icon fa-solid fa-dice-d20 dice-roller';
		// An empty tooltip shows the aria-label, as on Foundry's own chat controls.
		button.dataset.tooltip = '';
		button.ariaLabel = game.i18n.localize('Genesys.DicePrompt.OpenDiceRoller');
		button.addEventListener('click', openDiceRoller);

		const modes = controls.querySelector('.split-button');
		if (modes) modes.after(button);
		else controls.prepend(button);
	});
}
