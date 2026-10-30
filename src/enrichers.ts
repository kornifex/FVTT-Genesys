import { GenesysActor } from '@/actor/GenesysActor';
import { DicePrompt } from '@/app/DicePrompt';
import { checkLinkActor, checkLinkDifficulty } from '@/dice/CheckLinks';
import { diceGlyphs, poolModificationIcons } from '@/dice/EnricherGlyphs';
import { DIE_GLYPHS, PoolModGlyphPattern } from '@/dice/GenesysPoolModifications';

type Enricher = (typeof CONFIG.TextEditor.enrichers)[number];

/**
 * Shows Genesys dice, from die letters (A, P, B, D or I, C, S) or from colour letters (G, Y, B, P, R, K), in any case.
 */
const diceEnricher: Enricher = {
	pattern: /@dic?e\[(col(or)?s?,(?<colors>[GYBPRK]+)|(?<dice>[APBDICS]+))]/gim,
	enricher: async (match) => {
		const glyphs = diceGlyphs({ dice: match.groups?.['dice'], colors: match.groups?.['colors'] });
		if (glyphs.length === 0) {
			return null;
		}

		const container = document.createElement('span');
		container.className = 'font-genesys-symbols';
		for (const glyph of glyphs) {
			const die = document.createElement('i');
			die.className = `die die-${glyph}`;
			die.innerText = glyph;
			container.appendChild(die);
		}

		return container;
	},
};

/**
 * Shows Genesys symbols.
 */
const symbolsEnricher: Enricher = {
	pattern: /@sym(bols?)?\[(?<symbols>[asthfd123]+)]/gim,
	enricher: async (match) => {
		const container = document.createElement('span');
		container.className = `font-genesys-symbols nolig ${CONFIG.genesys.settings.useMagicalGirlSymbols ? 'mg' : ''}`;
		container.innerText = match.groups?.['symbols']?.toLowerCase() ?? '';

		return container;
	},
};

/**
 * The bold anchor of a check, behind a die icon.
 */
function checkAnchor(html: string) {
	const anchor = document.createElement('a');
	anchor.style.fontWeight = 'bold';
	anchor.innerHTML = `<i class="fas fa-dice-d20"></i> ${html}`;

	return anchor;
}

/**
 * Shows an opposed check between two skills.
 */
const opposedCheckEnricher: Enricher = {
	pattern: /@(skill-)?check\[(?<skill1>[^|\]]+?)\|(?<skill2>[^|\]]+?)]/gim,
	enricher: async (match) => {
		const skill1 = match.groups?.['skill1'];
		const skill2 = match.groups?.['skill2'];
		if (!skill1 || !skill2) {
			return null;
		}

		return checkAnchor(game.i18n.format('Genesys.Enrichers.Opposed', { skill1, skill2 }));
	},
};

/**
 * Shows a skill check against a difficulty, as a link that rolls it.
 */
const checkEnricher: Enricher = {
	pattern: /@(skill-)?check\[(?<skill>[^,\]|]+?)(,(?<difficulty>\d+)(\^(?<upgrades>\d+))?)?]/gim,
	enricher: async (match) => {
		const skill = match.groups?.['skill'];
		if (!skill) {
			return null;
		}

		const { label, challengeDice, difficultyDice } = checkLinkDifficulty(
			parseInt(match.groups?.['difficulty'] ?? '2', 10),
			parseInt(match.groups?.['upgrades'] ?? '0', 10),
		);

		const dieIcon = (glyph: string) => `<span class="die die-${glyph}">${glyph}</span>`;
		const difficultyIcons = dieIcon(DIE_GLYPHS.Challenge).repeat(challengeDice) + dieIcon(DIE_GLYPHS.Difficulty).repeat(difficultyDice);

		const anchor = checkAnchor(
			game.i18n.format('Genesys.Enrichers.Difficulty', {
				difficulty: game.i18n.localize(label),
				symbols: difficultyIcons || '—',
				skill,
			}),
		);
		anchor.dataset.skillCheck = skill;
		anchor.dataset.difficulty = DIE_GLYPHS.Challenge.repeat(challengeDice) + DIE_GLYPHS.Difficulty.repeat(difficultyDice);

		return anchor;
	},
};

/**
 * Shows pool modifications.
 */
const poolModificationsEnricher: Enricher = {
	pattern: new RegExp(`@pool(-mod(ifications?)?)?\\[(?<mods>${PoolModGlyphPattern.source}+)]`, 'gim'),
	enricher: async (match) => {
		// Returning null leaves the text of a glyph in the wrong case as it is.
		const icons = poolModificationIcons(match.groups?.['mods'] ?? '');
		if (!icons) {
			return null;
		}

		const container = document.createElement('span');
		container.className = 'font-genesys-symbols pool-modifications';
		for (const { className, glyph, operator } of icons) {
			const base = document.createElement('i');
			base.className = className;
			base.innerText = glyph;

			const operation = document.createElement('i');
			operation.className = `fas ${operator}`;

			container.append(base, operation);
		}

		return container;
	},
};

/**
 * Register the Genesys enrichers, and roll the check of a `@check` link when it is clicked.
 */
export function register() {
	CONFIG.TextEditor.enrichers.push(diceEnricher, symbolsEnricher, opposedCheckEnricher, checkEnricher, poolModificationsEnricher);

	document.addEventListener('click', (event) => void onCheckLinkClick(event));
}

/**
 * Roll the check of a `@check` link, wherever the link is rendered.
 */
async function onCheckLinkClick(event: MouseEvent) {
	const link = (event.target as HTMLElement | null)?.closest<HTMLElement>('a[data-skill-check]');
	if (!link) {
		return;
	}

	event.preventDefault();

	const appId = link.closest<HTMLElement>('.application')?.id;
	const app = appId ? foundry.applications.instances.get(appId) : undefined;

	const actor = checkLinkActor<GenesysActor>({
		sheetActor: app instanceof foundry.applications.sheets.ActorSheetV2 ? app.actor : undefined,
		controlledActors: (canvas.tokens?.controlled ?? []).map((token) => token.actor ?? undefined),
		assignedCharacter: game.user.character ?? undefined,
	});

	if (!actor) {
		ui.notifications.warn(game.i18n.localize('Genesys.Notifications.NoActorForCheck'));
		return;
	}

	await DicePrompt.promptForRoll(actor, link.dataset.skillCheck ?? '', { difficulty: link.dataset.difficulty });
}
