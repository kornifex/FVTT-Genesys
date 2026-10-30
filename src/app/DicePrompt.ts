import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysItem } from '@/item/GenesysItem';
import VueDicePrompt from '@/vue/apps/DicePrompt.vue';
import { VueSheet } from '@/vue/VueSheet';
import { Characteristic } from '@/data/Characteristics';
import type { CheckRoll } from '@/dice/CheckRoll';
import { diceRollerTarget } from '@/dice/DiceRoller';

/**
 * What the Dice Prompt rolls the check for.
 */
export const RollType = {
	Skill: 'skill',
	Attack: 'attack',
	Initiative: 'initiative',
} as const;

/**
 * A check the Dice Prompt rolls, and what its roll type needs on top of the dice pool: the weapon of an attack, the
 * promise of an initiative, settled when the check is rolled or the prompt closed.
 */
export type DicePromptRoll =
	| { type: typeof RollType.Skill }
	| { type: typeof RollType.Attack; weapon: GenesysItem<'weapon' | 'vehicleWeapon'> }
	| { type: typeof RollType.Initiative; resolve: (checkRoll: CheckRoll) => void; reject: () => void };

/**
 * What the Dice Prompt shows and rolls.
 */
export type DicePromptContext = {
	actor?: GenesysActor;
	skillName?: string;
	roll: DicePromptRoll;
	difficulty: string;
	characteristic?: Characteristic;
	app: DicePrompt;
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
 * Dice pool prompt.
 */
export class DicePrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
	override get vueComponent() {
		return VueDicePrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-dice-prompt'],
		position: { width: 500 },
		window: { title: 'Genesys.DicePrompt.Title' },
	};

	/**
	 * Open a Dice Prompt for an actor's check with a skill, or a bare one without an actor.
	 */
	static async promptForRoll(actor: GenesysActor | undefined, skillName: string, options: DicePromptOptions = {}) {
		const app = new DicePrompt(actor, skillName, options);
		await app.render(true);
	}

	/**
	 * Open a Dice Prompt for an actor's Characteristic Check.
	 */
	static async promptForCharacteristicCheck(actor: GenesysActor, characteristic: Characteristic) {
		await DicePrompt.promptForRoll(actor, '', { characteristic });
	}

	/**
	 * Open a Dice Prompt for an actor's initiative, and wait for the check rolled. Rejects when the prompt is closed
	 * without a roll.
	 */
	static async promptForInitiative(actor: GenesysActor | undefined, skillName: string, options: Omit<DicePromptOptions, 'roll'> = {}) {
		return new Promise<CheckRoll>((resolve, reject) => {
			const app = new DicePrompt(actor, skillName, { ...options, roll: { type: RollType.Initiative, resolve, reject } });

			void app.render(true);
		});
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

	protected override async _preClose(options: object) {
		if (this.roll.type === RollType.Initiative) {
			this.roll.reject();
		}

		await super._preClose(options);
	}

	override async getVueContext(): Promise<DicePromptContext> {
		return {
			actor: this.actor,
			skillName: this.skillName,
			roll: this.roll,
			difficulty: this.difficulty,
			characteristic: this.characteristic,
			app: this,
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
