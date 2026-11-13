/** @file #211: the Dice Prompt and checks: the pool a check rolls, its Pool Modifications, its links, its chance to succeed and its messages. */
import type { Client, ScenarioContext } from '../scenario.ts';
import { type Doc, type PromptState, installDicePromptHelpers, type DicePromptContext } from './dicePrompt/shared.ts';
import { skillsAndCharacteristicsPart } from './dicePrompt/skillsAndCharacteristics.ts';
import { targetModificationsPart } from './dicePrompt/targetModifications.ts';
import { attackSkillsPart } from './dicePrompt/attackSkills.ts';
import { silhouettesPart } from './dicePrompt/silhouettes.ts';
import { checkMessagesPart } from './dicePrompt/checkMessages.ts';
import { customSkillEffectsPart } from './dicePrompt/customSkillEffects.ts';
import { gmCheckLinksPart } from './dicePrompt/gmCheckLinks.ts';
import { playerCheckLinksPart } from './dicePrompt/playerCheckLinks.ts';
import { poolLinksPart } from './dicePrompt/poolLinks.ts';
import { settingsPart } from './dicePrompt/settings.ts';
import { chanceToSucceedPart } from './dicePrompt/chanceToSucceed.ts';
import { storyPointTrackerPart } from './dicePrompt/storyPointTracker.ts';
import { weaponProfilesPart } from './dicePrompt/weaponProfiles.ts';
import { diceRollerPart } from './dicePrompt/diceRoller.ts';
import { modificationFoldsPart } from './dicePrompt/modificationFolds.ts';
import { sameNameEffectsPart } from './dicePrompt/sameNameEffects.ts';
import { difficultyPart } from './dicePrompt/difficulty.ts';
import { damageHintPart } from './dicePrompt/damageHint.ts';
import { diceGlyphsPart } from './dicePrompt/diceGlyphs.ts';
import { modificationLinksPart } from './dicePrompt/modificationLinks.ts';
import { modificationColumnsPart } from './dicePrompt/modificationColumns.ts';
import { glyphLabelsPart } from './dicePrompt/glyphLabels.ts';
import { encumbranceAndItemDamagePart } from './dicePrompt/encumbranceAndItemDamage.ts';
import { skillDifficultyPart } from './dicePrompt/skillDifficulty.ts';
import { storyPointSpendsPart } from './dicePrompt/storyPointSpends.ts';
import { criticalInjuriesPart } from './dicePrompt/criticalInjuries.ts';
import { tokenStateDicePart } from './dicePrompt/tokenStateDice.ts';
import { combatManeuversPart } from './dicePrompt/combatManeuvers.ts';
import { medicineHealPart } from './dicePrompt/medicineHeal.ts';
import { recoveryPart } from './dicePrompt/recovery.ts';
import { qualityEffectsPart } from './dicePrompt/qualityEffects.ts';
import { attachmentsPart } from './dicePrompt/attachments.ts';
import { spellCastingPart } from './dicePrompt/spellCasting.ts';
import { repeatableEffectsPart } from './dicePrompt/repeatableEffects.ts';
import { magicAttackPart } from './dicePrompt/magicAttack.ts';
import { healSpellPart } from './dicePrompt/healSpell.ts';

// The scenario controls and targets tokens on the canvas.
export const needsCanvas = true;
export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	const player = await e2e.player();
	// §#414: the compatibility warnings Foundry logs through `console.warn` as the page reaches the roll modes v14
	// deprecated, read from the console from before the GM reloads.
	const rollModeWarnings: string[] = [];
	for (const client of [gm, player]) {
		client.page.on('console', (message) => {
			const text = message.text();
			if (message.type() === 'warning' && /Deprecated since Version/.test(text) && /roll ?mode/i.test(text)) {
				rollModeWarnings.push(`${client.user}: ${text.split('\n')[0]}`);
			}
		});
	}
	await e2e.setUpCombat({
		combatants: [
			{ name: 'Hero', type: 'character' },
			{ name: 'Foe', type: 'rival' },
		],
	});
	// §#100: the Skills Compendium is loaded again on a reload.
	await gm.reload();
	for (const client of [gm, player]) await client.evaluate(installDicePromptHelpers);
	const saved = await gm.evaluate((user) => window.dicePromptE2E.settings(user), e2e.playerUser);
	const settings = {
		uncoupleSkills: false,
		useSuperCharacteristics: false,
		defaultDifficulty: 'DD',
		skillsCompendium: 'genesys.crb-skills',
		showDamageOnFailure: false,
		dicePoolCollapseModificationsDetails: false,
	};
	const setUp = async () => {
		await gm.evaluate(
			(settings) => Promise.all(Object.entries(settings).map(([key, value]) => window.dicePromptE2E.setSetting({ key, value }))),
			settings,
		);
		try {
			await gm.evaluate((user) => window.dicePromptE2E.setUp(user), e2e.playerUser);
		} catch (error) {
			e2e.log('set up errors', gm.errors);
			throw error;
		}
	};
	await setUp();
	await e2e.step('set up');

	const opened = async (client: Client, action: () => Promise<unknown>) => {
		await client.evaluate(() => window.dicePromptE2E.closePrompts());
		await action();
		return client.evaluate(() => window.dicePromptE2E.waitForPrompt());
	};
	// What an action opened: how many Dice Prompts, and the notifications it gave.
	const noPrompt = async (client: Client, action: () => Promise<unknown>) => {
		await client.evaluate(() => window.dicePromptE2E.closePrompts());
		await client.evaluate(() => window.dicePromptE2E.clearNotifications());
		await action();
		await e2e.settle();
		return client.evaluate(() => ({
			prompts: window.dicePromptE2E.openPrompts(),
			notifications: window.dicePromptE2E.notifications(),
		}));
	};
	const click = (client: Client, doc: Doc, path: string) => () =>
		client.evaluate((args) => window.dicePromptE2E.click(args), { doc, path });
	const select = (name: 'characteristic' | 'skill', option: string) =>
		gm.evaluate((args) => window.dicePromptE2E.promptSelect(args), { name, option });
	const toggle = (name: string) => gm.evaluate((name) => window.dicePromptE2E.promptToggle(name), name);
	const roll = () => gm.evaluate(() => window.dicePromptE2E.promptRoll());
	const setSetting = (key: string, value: unknown) => gm.evaluate((args) => window.dicePromptE2E.setSetting(args), { key, value });
	const update = (doc: Doc, data: object) => gm.evaluate((args) => window.dicePromptE2E.update(args), { doc, data });
	const target = (name: string | null) => gm.evaluate((name) => window.e2e.target(name), name);
	const control = (client: Client, names: string[]) => client.evaluate((names) => window.dicePromptE2E.control(names), names);
	// The Apply button of a check that heals, as a client sees it, and an actor's wounds and strain (§#686, §#687).
	const recoveryButton = (client: Client, id: string, click = false) =>
		client.evaluate((args) => window.dicePromptE2E.recoveryButton(args), { id, click });
	const recoveryCard = (client: Client, id: string) => client.evaluate((id) => window.dicePromptE2E.recoveryCard(id), id);
	const health = (name: string) => gm.evaluate((name) => window.dicePromptE2E.health(name), name);
	const ada = { actor: 'Ada' };
	const skillRoll = (skill: string) => click(gm, ada, `.tab-skills .skill button.skill-name|${skill} (`);
	const characteristicRoll = (index: number, doc: Doc = ada) =>
		click(gm, doc, `.tab-skills .characteristics-row .characteristic-field:nth-child(${index}) .characteristic-label button`);
	const attack = (weapon: string) => click(gm, ada, `.tab-combat .weapon .name button|E2E ${weapon}`);
	const rows = (state: PromptState) => state.modifications;
	const named = (state: PromptState, prefix: string) => state.modifications.filter(({ name }) => name.startsWith(prefix));
	const journal = { journal: 'Links' };
	const skiff = { actor: 'Skiff' };
	const combatWeapons = (actor: string) => gm.evaluate((actor) => window.dicePromptE2E.combatWeapons(actor), actor);
	const linkPrompt = async (client: Client, doc: Doc | { message: string }, skill: string, difficulty?: string) => {
		const state = await opened(client, () =>
			client.evaluate((args) => window.dicePromptE2E.clickLink(args), { doc, skill, difficulty }),
		);
		return { actor: state.actor, skill: state.skill, pool: state.pool };
	};
	const seekerCheck = (client: Client) =>
		opened(
			client,
			click(
				client,
				{ actor: 'Seeker' },
				'.tab-skills .characteristics-row .characteristic-field:nth-child(3) .characteristic-label button',
			),
		);

	const context: DicePromptContext = {
		e2e,
		gm,
		player,
		setUp,
		opened,
		noPrompt,
		click,
		select,
		toggle,
		roll,
		setSetting,
		update,
		target,
		control,
		recoveryButton,
		recoveryCard,
		health,
		ada,
		skillRoll,
		characteristicRoll,
		attack,
		rows,
		named,
		journal,
		skiff,
		combatWeapons,
		linkPrompt,
		seekerCheck,
	};

	// Each part starts from the setup, whatever the parts before it changed, so that it runs the same alone as after them:
	// no target, no token controlled, no window open, the settings and documents of the setup.
	let partRan = false;
	const part = (name: string, fn: () => Promise<void>) =>
		e2e.part(name, async () => {
			if (partRan) {
				await target(null);
				for (const client of [gm, player]) {
					await control(client, []);
					await client.evaluate(async () => {
						await window.dicePromptE2E.closePrompts();
						await window.dicePromptE2E.closeSheets();
					});
				}
				await setUp();
			}
			partRan = true;
			await fn();
		});

	// A: the skills the prompt offers (§#49, §#100). B: the characteristic menu (§#184, §#204, §#50), from A's prompt.
	await part('skillsAndCharacteristics', () => skillsAndCharacteristicsPart(context));

	// C: Pool Modifications of the actor and of the target (§#32, §#40, §#49, §#201).
	await part('targetModifications', () => targetModificationsPart(context));

	// D: Attack Skills (§#49, §#196).
	await part('attackSkills', () => attackSkillsPart(context));

	// M: the silhouette difference between the attacker and the target (§#380). Every character and Adversary is at 1,
	// every vehicle at 0, unless set here.
	await part('silhouettes', () => silhouettesPart(context));

	// E: healing and initiative with a skill the actor lacks (§#49), and the messages of checks (§#50, §#157).
	await part('checkMessages', () => checkMessagesPart(context));

	// F: effect sheets keep a Pool Modification for a skill outside the Skills Compendium (§#40).
	await part('customSkillEffects', () => customSkillEffectsPart(context));

	// G: `@check` links as the GM (§#51, §#95, §#157).
	await part('gmCheckLinks', () => gmCheckLinksPart(context));

	// H: `@check` links as a player (§#51).
	await part('playerCheckLinks', () => playerCheckLinksPart(context));

	// I: `@pool` links in a journal page (§#115).
	await part('poolLinks', () => poolLinksPart(context));

	// J: the Default Difficulty and Skills Compendium settings (§#32, §#100).
	await part('settings', () => settingsPart(context));

	// K: the chance to succeed, as the player (§#90, §#157).
	await part('chanceToSucceed', () => chanceToSucceedPart(context));

	// L: the Story Point Tracker with a GM and a player (§#157).
	await part('storyPointTracker', () => storyPointTrackerPart(context));

	// N: an attack from the row of a weapon's extra Weapon Profile rolls that profile (§#366).
	await part('weaponProfiles', () => weaponProfilesPart(context));

	// #367: the chat's dice button and `/gendr` open the Dice Roller, for the single controlled token's actor.
	await part('diceRoller', () => diceRollerPart(context));

	// §#396: the Pool Modifications fold and unfold through the expandable mixin, in the 0.2s ease-out of every fold since
	// #516 (1s before), and their folded container is hidden from Tab. §#579: their title is a `DescriptionFold`'s chevron.
	await part('modificationFolds', () => modificationFoldsPart(context));

	// O: Pool Modifications of effects named alike are turned on one at a time (§#445).
	await part('sameNameEffects', () => sameNameEffectsPart(context));

	// P: the roller sets the Difficulty, before any Pool Modification; a die removed by hand still comes after them
	// (§#450).
	await part('difficulty', () => difficultyPart(context));

	// Q: the hint of the Show Attack Damage On Failure setting in the game settings window, in each language of the system
	// (§#434). The language is a client setting the page reads as it loads: the GM's client reloads in French and Spanish,
	// then in English again.
	await part('damageHint', () => damageHintPart(context));

	// R: the glyphs of the Genesys dice (§#488). Foundry gives the class `die` to a core die's result in a roll's tooltip
	// too, which keeps its own font; the glyphs the enrichers set in a line of text sit in it.
	await part('diceGlyphs', () => diceGlyphsPart(context));

	// S: a Pool Modification's row opens the item its effect comes from, or the effect, for a user who may see it (§#495).
	// The Seeker's Intellect check, with the Veiled targeted.
	await part('modificationLinks', () => modificationLinksPart(context));

	// T: the Pool Modifications' columns (§#513). The Seeker's Intellect check, its talent's effect named long enough to
	// wrap, with manual changes.
	await part('modificationColumns', () => modificationColumnsPart(context));

	// §#582: the dice and symbols read in words, as an image's or a button's name to a screen reader and as its tooltip:
	// the Dice Prompt's pool and Pool Modifications, a check's chat card, a die's result in a roll's tooltip, and the links
	// of a journal. Each element reads as its glyphs' text and its name, null when it is neither.
	await part('glyphLabels', () => glyphLabelsPart(context));

	// V: the checks a character's encumbrance and a weapon's damage hinder (§#668). Ada's Brawn of 3 gives her a threshold of
	// 8; an anvil puts her 2 over it.
	await part('encumbranceAndItemDamage', () => encumbranceAndItemDamagePart(context));

	// W: the difficulty the prompt opens at: its caller's, else the Skills Compendium skill's, else the world's (§#669). The
	// system's compendium sets the melee skills to Average (CRB p. 102); the world's Default Difficulty is set to Easy.
	await part('skillDifficulty', () => skillDifficultyPart(context));

	// X: Story Points spent from the Dice Prompt, by a player through the GM's client, and by the GM (§#671).
	await part('storyPointSpends', () => storyPointSpendsPart(context));

	// C: Critical Injuries rolled on the world's table (§#685), from an attack's card and from the sheets.
	await part('criticalInjuries', () => criticalInjuriesPart(context));

	// S: the Token States of the roller in the Dice Prompt (§#682, CRB p. 114). Their menu and rounds sit in `combat.ts`,
	// part `tokenStates`.
	await part('tokenStateDice', () => tokenStateDicePart(context));

	// M: the maneuvers of the Combat tab, Aim and Guarded Stance, and the In Cover and Prone states, in the attacks (§#683,
	// CRB p. 98–100, 108).
	await part('combatManeuvers', () => combatManeuversPart(context));

	// H: the Heal action beside Medicine, a Medicine check for a patient at the difficulty of their state of health, whose
	// card heals them by its results, for the GM and the patient's owners (§#686, CRB p. 116).
	await part('medicineHeal', () => medicineHealPart(context));

	// R: the End of encounter and Night's rest actions beside a character's strain and wounds: a Simple Discipline or Cool
	// check whose card recovers a strain per Success, and a night's rest that recovers all strain and heals a wound
	// (§#687, CRB pp. 116–117).
	await part('recovery', () => recoveryPart(context));

	// Q: the qualities of weapons, whose Active Effects their rank scales, on the weapon's attacks only, while it is
	// equipped (§#694, CRB pp. 86–89).
	await part('qualityEffects', () => qualityEffectsPart(context));

	await part('attachments', () => attachmentsPart(context));

	// S: casting a spell from the Magic tab, with its magic skill, at its difficulty raised by the Additional Effects
	// checked in the Dice Prompt, never beyond Formidable, and the 2 strain it costs (§#705, CRB pp. 210–217).
	await part('spellCasting', () => spellCastingPart(context));

	// RE: an Additional Effect that can be added more than once, as Range, whose count in the Dice Prompt adds its
	// difficulty each time, never beyond Formidable, and which the card lists once with its count (§#761, CRB p. 215).
	await part('repeatableEffects', () => repeatableEffectsPart(context));

	// MA: a magic attack, an attack spell whose card shows its damage, its effects' qualities and the Critical Injury it
	// inflicts on a Triumph only, as it has no Critical rating (§#706, CRB p. 215).
	await part('magicAttack', () => magicAttackPart(context));

	// HS: a Heal spell, cast in place of a Medicine check on a patient picked as Medicine's is, at the spell's difficulty,
	// whose card heals the patient by its results (§#707, CRB p. 217).
	await part('healSpell', () => healSpellPart(context));

	e2e.expect('#414 A2 no compatibility warning about the roll modes v14 deprecated is logged', rollModeWarnings, []);
	await gm.evaluate((settings) => window.dicePromptE2E.restore(settings), { user: e2e.playerUser, settings: saved });
}
