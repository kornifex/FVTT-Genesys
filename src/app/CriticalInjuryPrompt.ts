/** @file The Roll a Critical Injury dialog, opened from an attack's card, an actor's sheet or a message, and the roll it draws from the world's Critical Injury table. */

import { GenesysActor } from '@/actor/GenesysActor';
import VueCriticalInjuryPrompt from '@/vue/apps/CriticalInjuryPrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';
import {
	attackWeaponOf,
	CRITICAL_INJURY_FLAG,
	criticalInjuryFormula,
	type CriticalInjuryRequest,
	criticalInjuryResults,
} from '@/dice/CriticalInjuryRoll';

/**
 * What the dialog rolls a Critical Injury for: the actor who suffers it, and the attack that inflicts it, when known.
 */
type CriticalInjuryPromptRequest = CriticalInjuryRequest<GenesysActor>;

/**
 * What the dialog shows: what it rolls for, the name of the table it draws from, and the names Vicious goes by, in
 * English and in the world's language.
 */
export type CriticalInjuryPromptContext = {
	request: CriticalInjuryPromptRequest;
	tableName: string;
	viciousNames: string[];
};

/**
 * The dialog's answer: the modifier added to the d100.
 */
export type CriticalInjuryAnswer = { modifier: number };

/**
 * The English name of the Vicious quality, which a weapon's quality may have whatever the world's language.
 */
const VICIOUS = 'Vicious';

/**
 * The world's Critical Injury table, or undefined when the GM has picked none, or it was deleted.
 */
function worldCriticalInjuryTable(): RollTable.Implementation | undefined {
	const uuid = CONFIG.genesys.settings.criticalInjuryTable;
	const table = uuid ? fromUuidSync(uuid) : null;
	return table instanceof RollTable ? table : undefined;
}

/**
 * The Roll a Critical Injury dialog: the lines of the modifier, each editable, summed into the d100's bonus.
 */
export class CriticalInjuryPrompt extends VuePrompt<CriticalInjuryAnswer | undefined>(undefined) {
	override get vueComponent() {
		return VueCriticalInjuryPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-critical-injury-prompt'],
		position: { width: 420 },
		window: { title: 'Genesys.CriticalInjuryPrompt.Title' },
	};

	/**
	 * Open the dialog for a Critical Injury, then roll it on the world's table and post the result to the chat. The user
	 * is told when the world has no table.
	 */
	static async promptForCriticalInjury(request: CriticalInjuryPromptRequest) {
		const table = worldCriticalInjuryTable();
		if (!table) {
			ui.notifications.warn('Genesys.CriticalInjuryPrompt.NoTable', { localize: true });
			return;
		}

		const answer = await new CriticalInjuryPrompt(request, table.name).prompt();
		if (answer) {
			await rollCriticalInjury(table, answer.modifier, request);
		}
	}

	/**
	 * Open the dialog for a Critical Injury an actor suffers outside an attack, as from their sheet or from going past
	 * their wound threshold.
	 */
	static async promptForActor(actor: GenesysActor) {
		await CriticalInjuryPrompt.promptForCriticalInjury({ actor });
	}

	readonly request: CriticalInjuryPromptRequest;
	readonly tableName: string;

	constructor(request: CriticalInjuryPromptRequest, tableName: string) {
		super();

		this.request = request;
		this.tableName = tableName;
	}

	override async getVueContext(): Promise<CriticalInjuryPromptContext> {
		return {
			request: this.request,
			tableName: this.tableName,
			viciousNames: [VICIOUS, game.i18n.localize('Genesys.CriticalInjuryPrompt.ViciousQuality')],
		};
	}
}

/**
 * Roll a Critical Injury on a table with a modifier, and post the results it draws, with a link to each one's item, to
 * the chat: as the attacker for an attack (CRB p. 103), as the actor otherwise. Nothing is added to an actor: the GM or
 * the player drags the injury onto the sheet.
 */
async function rollCriticalInjury(table: RollTable.Implementation, modifier: number, { actor, attack }: CriticalInjuryPromptRequest) {
	const roll = await new Roll(criticalInjuryFormula(modifier)).evaluate();
	const results = criticalInjuryResults(table.results.contents, roll.total);
	if (results.length === 0) {
		ui.notifications.warn(game.i18n.format('Genesys.CriticalInjuryPrompt.NoResult', { total: String(roll.total) }));
		return;
	}

	const speaker = attack?.attacker ?? actor;
	await table.toMessage(results, {
		roll,
		messageData: {
			speaker: ChatMessage.getSpeaker({ actor: speaker as Actor.Stored | undefined }),
			flavor: actor
				? game.i18n.format('Genesys.CriticalInjuryPrompt.MessageFor', { actor: actor.name })
				: game.i18n.localize('Genesys.CriticalInjuryPrompt.Message'),
		},
	});
}

/**
 * The actor a uuid of an attack's message points to, when it still exists.
 */
function actorOf(uuid: string | null): GenesysActor | undefined {
	const actor = uuid ? fromUuidSync(uuid) : null;
	return actor instanceof GenesysActor ? actor : undefined;
}

/**
 * Open the dialog for the Critical Injury a message offers: the one an attack triggered, for its target when the roller
 * targeted one, or the one of a character gone past their wound threshold, without an attack.
 */
async function promptFromMessage(event: MouseEvent) {
	const button = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-message-id] button.roll-critical-injury');
	const messageId = button?.closest<HTMLElement>('[data-message-id]')?.dataset.messageId;
	const flag = messageId ? game.messages.get(messageId)?.getFlag('genesys', CRITICAL_INJURY_FLAG) : undefined;
	if (!flag) {
		return;
	}

	await CriticalInjuryPrompt.promptForCriticalInjury({
		actor: actorOf(flag.target),
		...('weapon' in flag && {
			attack: { triggers: flag.triggers, weapon: attackWeaponOf(flag.weapon), attacker: actorOf(flag.attacker) },
		}),
	});
}

/**
 * Open the dialog from the button of a message offering a Critical Injury, wherever the message is rendered: in the chat
 * log, or in a notification or a popped-out message.
 */
export function register() {
	document.addEventListener('click', (event) => void promptFromMessage(event));
}
