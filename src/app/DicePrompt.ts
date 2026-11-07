import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysItem } from '@/item/GenesysItem';
import VueDicePrompt from '@/vue/apps/DicePrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';
import { Characteristic } from '@/data/Characteristics';
import { type CheckRoll, rollCheck } from '@/dice/CheckRoll';
import { diceRollerTarget } from '@/dice/DiceRoller';
import type { AttackProfile } from '@/item/WeaponProfiles';

/**
 * What the Dice Prompt rolls the check for.
 */
export const RollType = {
	Skill: 'skill',
	Attack: 'attack',
	Initiative: 'initiative',
} as const;

/**
 * A check the Dice Prompt is answered for, and what its roll type needs on top of the dice pool: the weapon of an
 * attack and the Weapon Profile it is made with.
 */
export type DicePromptRoll =
	| { type: typeof RollType.Skill }
	| { type: typeof RollType.Attack; weapon: GenesysItem<'weapon' | 'vehicleWeapon'>; profile: AttackProfile }
	| { type: typeof RollType.Initiative };

/**
 * What the Dice Prompt shows.
 */
export type DicePromptContext = {
	actor?: GenesysActor;
	skillName?: string;
	roll: DicePromptRoll;
	difficulty: string;
	characteristic?: Characteristic;
};

/**
 * What a Dice Prompt opens with, besides its actor and skill.
 */
export type DicePromptOptions = {
	/**
	 * The check rolled, a skill check by default.
	 */
	roll?: DicePromptRoll;
	/**
	 * The difficulty's Pool Modification glyphs, the world's default difficulty when left out.
	 */
	difficulty?: string;
	/**
	 * Characteristic rolled when no skill is selected: the characteristic of a Characteristic Check, or of a skill the
	 * actor can't roll.
	 */
	characteristic?: Characteristic;
};

/**
 * Dice pool prompt: it answers with the check and the dice pool the user built, undefined when they close it without
 * rolling.
 */
export class DicePrompt extends VuePrompt<CheckRoll | undefined>(undefined) {
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
		const app = new DicePrompt(actor, skillName, options);
		const checkRoll = await app.prompt();
		if (!checkRoll) {
			return;
		}

		await rollCheck(checkRoll, app.roll.type === RollType.Attack ? app.roll.profile : undefined);
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

	actor?: GenesysActor;
	skillName?: string;
	roll: DicePromptRoll;
	difficulty: string;
	characteristic?: Characteristic;

	constructor(actor?: GenesysActor, skillName?: string, { roll, difficulty, characteristic }: DicePromptOptions = {}) {
		super();

		this.actor = actor;
		this.skillName = skillName;
		this.roll = roll ?? { type: RollType.Skill };
		this.difficulty = difficulty ?? CONFIG.genesys.settings.defaultDifficulty;
		this.characteristic = characteristic;
	}

	override async getVueContext(): Promise<DicePromptContext> {
		return {
			actor: this.actor,
			skillName: this.skillName,
			roll: this.roll,
			difficulty: this.difficulty,
			characteristic: this.characteristic,
		};
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
