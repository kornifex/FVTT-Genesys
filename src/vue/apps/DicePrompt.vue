<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef, useId } from 'vue';
import type { Stored } from '@/data/Stored';
import { type DicePromptAnswer, DicePromptContext, RollType } from '@/app/DicePrompt';
import { chanceComputation, chanceToSucceed, formatChance, simulatedChance } from '@/dice/ChanceToSucceed';
import { chanceToSucceedInWorker } from '@/dice/chanceToSucceedInWorker';
import { CHARACTERISTIC_ABBREVIATIONS, CHARACTERISTICS, Characteristic } from '@/data/Characteristics';
import { DEFENSE_LABELS } from '@/data/Actors';
import { singleTargetActor } from '@/app/singleTarget';
import { rollPool } from '@/dice/CheckRoll';
import { GenesysItem } from '@/item/GenesysItem';
import { EQUIPMENT_DAMAGE_LABELS } from '@/item/data/EquipmentDamage';
import { useSheetContext } from '@/vue/SheetContext';
import { usePromptAnswer } from '@/vue/usePrompt';
import ActionButton from '@/vue/components/ActionButton.vue';
import DescriptionFold from '@/vue/components/DescriptionFold.vue';
import Glyphs from '@/vue/components/Glyphs.vue';
import Localized from '@/vue/components/Localized.vue';
import PoolModificationIcon from '@/vue/components/PoolModificationIcon.vue';
import PromptFooter from '@/vue/components/PromptFooter.vue';
import { vLocalize } from '@/vue/directives';
import type { DieCategory } from '@/dice/dice/GenesysDie';
import {
	DIE_GLYPHS,
	GRADE_GLYPHS,
	poolModificationLabel,
	removalGlyph,
	SYMBOL_GLYPHS,
	worldGlyphLocalizer,
} from '@/dice/GenesysPoolModifications';
import { promptSkills } from '@/data/Skills';
import {
	type Check,
	type CheckPoolModification,
	type CheckRequest,
	canPickCharacteristic,
	canRollWithoutCharacteristic,
	carriedPoolModificationStates,
	checkDicePool,
	resolveCheck,
	vehicleAttacker,
	worldCheckRules,
} from '@/dice/Check';
import { matchOrigin } from '@/effects/PoolModifications';
import { stateReminders } from '@/effects/TokenStates';
import { type DicePool, poolEntries, sortPoolModifications } from '@/dice/DicePool';
import {
	clickedLevel,
	type Difficulty,
	DIFFICULTY_LABELS,
	difficultyGlyphs,
	difficultyLabel,
	difficultyRow,
	IMPOSSIBLE,
	receivedDifficulty,
	withLevel,
} from '@/dice/Difficulty';
import {
	canRollWithSpends,
	type CheckSpend,
	chosenSpends,
	SPEND_GLYPHS,
	type SpendContext,
	spendGlyphs,
	spendOptions,
} from '@/dice/CheckStoryPoints';
import type { StoryPointPool } from '@/data/StoryPoints';
import type { ContainedAdditionalEffect } from '@/item/data/Spells';
import { canCheckEffect, difficultyAddedBy } from '@/item/SpellCasting';
import { attackRangeOf, checkPurposeOf, poolModificationOriginLabel } from '@/dice/PromptCheck';

type AlsoNone<T> = T | undefined;

type PromptSkill = Stored<GenesysItem<'skill'>>;

const DIE_CATEGORIES: DieCategory[] = ['positive', 'negative'];

// The dice box's buttons, by the glyph of the manual change each one adds, in rows of three; a shorter row leaves the
// rest of it empty.
const DICE_BOX = [
	[DIE_GLYPHS.Ability, DIE_GLYPHS.Proficiency, DIE_GLYPHS.Boost],
	[GRADE_GLYPHS.UpgradeAbility, GRADE_GLYPHS.DowngradeAbility],
	[DIE_GLYPHS.Difficulty, DIE_GLYPHS.Challenge, DIE_GLYPHS.Setback],
	[GRADE_GLYPHS.UpgradeDifficulty, GRADE_GLYPHS.DowngradeDifficulty],
	[SYMBOL_GLYPHS.Advantage, SYMBOL_GLYPHS.Success, SYMBOL_GLYPHS.Triumph],
	[SYMBOL_GLYPHS.Threat, SYMBOL_GLYPHS.Failure, SYMBOL_GLYPHS.Despair],
];

const USE_SUPER_CHARACTERISTICS = CONFIG.genesys.settings.useSuperCharacteristics;
const CHANCE_TO_SUCCEED_BY_SIMULATION_NUM_ROLLS = CONFIG.genesys.settings.showChanceToSucceedFromSimulations.amountOfRolls;
const USE_CHANCE_TO_SUCCEED_BY_PERMUTATION = CONFIG.genesys.settings.showChanceToSucceedFromPermutations;
const USE_CHANCE_TO_SUCCEED = USE_CHANCE_TO_SUCCEED_BY_PERMUTATION || CONFIG.genesys.settings.showChanceToSucceedFromSimulations.enabled;

const context = useSheetContext<DicePromptContext>();
const attack = context.value.roll.type === RollType.Attack ? context.value.roll : undefined;
const spell = context.value.roll.type === RollType.Spell ? context.value.roll.spell : undefined;
// The Token States of the roller that change no dice, such as Staggered, which the prompt reminds them of.
const stateReminderLabels = stateReminders(context.value.actor?.statuses ?? []);

// Shallow, so that the dice pool reaches the chance Worker as it is: a reactive proxy can't be cloned to a Worker.
const currentDicePool = shallowRef<DicePool>({
	dice: {},
	symbols: {},
	usesSuperCharacteristic: false,
});
const check = shallowRef<Check<PromptSkill>>();
// The roller sets the Difficulty before any Pool Modification; whatever else the received difficulty holds starts as
// manual changes.
const received = receivedDifficulty(context.value.difficulty, context.value.impossible);
const difficulty = ref<Difficulty>(received.difficulty);
const manualChanges = ref<string[]>(received.manualChanges);
const difficultyName = computed(() => game.i18n.localize(difficultyLabel(difficulty.value.level)));
const impossible = computed(() => difficulty.value.level === IMPOSSIBLE);

// The Story Points the roller chose to spend on the check, each once; those the check no longer offers, as the point of
// a task no longer Impossible, are left out of its spends.
const chosen = ref<CheckSpend[]>([]);
const spendContext = computed<SpendContext>(() => ({
	isGM: game.user.isGM,
	gmConnected: context.value.gmConnected,
	storyPoints: context.value.storyPoints,
	impossible: impossible.value,
}));
const spends = computed(() => chosenSpends(chosen.value, spendContext.value));
const options = computed(() => spendOptions(chosen.value, spendContext.value));
const canRoll = computed(() => canRollWithSpends(spends.value, impossible.value));

// The ids of the spell's Additional Effects the caster checked: those that start checked, as the difficulty received
// counts them already.
const checkedEffects = ref<string[]>(context.value.roll.type === RollType.Spell ? [...context.value.roll.checkedEffects] : []);
const spellEffects = spell?.system.additionalEffects ?? [];
// The levels each checked effect added to the difficulty, which unchecking it gives back. Those checked as the prompt
// opens added their whole difficulty, as the difficulty received counts them already.
const addedByEffect = new Map(
	spellEffects.filter((effect) => checkedEffects.value.includes(effect.id)).map((effect) => [effect.id, effect.difficulty]),
);
const canCheck = (effect: ContainedAdditionalEffect) =>
	!!spell && canCheckEffect(spell.system.difficulty, spellEffects, checkedEffects.value, effect);

// What each spend buys, and the short name of the pool it comes from.
const SPEND_LABELS: Record<CheckSpend, string> = {
	impossible: 'Genesys.DicePrompt.StoryPoints.Impossible',
	upgradeAbility: 'Genesys.DicePrompt.StoryPoints.UpgradeAbility',
	upgradeDifficulty: 'Genesys.DicePrompt.StoryPoints.UpgradeDifficulty',
};
const POOL_LABELS: Record<StoryPointPool, string> = {
	player: 'Genesys.StoryPoints.PlayerShort',
	gm: 'Genesys.StoryPoints.GMShort',
};
// What the prompt needs of the document a Pool Modification's row opens: the item its effect comes from, or the effect.
type SourceDocument = {
	name: string;
	documentName: string;
	sheet: { render(force: boolean): unknown } | null;
	testUserPermission(user: User, level: 'OBSERVER'): boolean;
};

// The link to a source document: the row holds its uuid, not the document, which Vue would wrap in a reactive proxy.
type SourceLink = { uuid: string; tooltip: string; icon: string };

// The icons Foundry's content links show for these types of documents. v13's config gives effects none.
const SOURCE_ICONS: Record<string, string> = { Item: 'fa-solid fa-suitcase', ActiveEffect: 'fa-solid fa-person-rays' };

// The Pool Modifications of the check, each turned on or off by the roller. The origin is the actor or the target, the
// name what the modification comes from.
const effects = ref<{ key: string; origin: string; name: string; link?: SourceLink; enabled: boolean; mods: string[] }[]>([]);
// The skills sit in shallow refs, so that Vue never wraps them in reactive proxies. The skills the attacking weapon
// lists, offered first and only there.
const weaponSkills = shallowRef<PromptSkill[]>([]);
const availableSkills = shallowRef<PromptSkill[]>([]);
// Skills from the Skills Compendium that the actor doesn't own; rolling one of these is an Unranked Skill Check.
const unrankedSkills = shallowRef<PromptSkill[]>([]);
const selectedSkill = shallowRef<AlsoNone<PromptSkill>>();
const selectedCharacteristic = ref<AlsoNone<Characteristic>>();
const probabilityOfSuccess = ref<AlsoNone<string>>();

const characteristicPickable = computed(() => !check.value || canPickCharacteristic(check.value, worldCheckRules()));
const offersNoCharacteristic = computed(() => !check.value || canRollWithoutCharacteristic(check.value));

const useSuperCharacteristic = ref(false);
const showPoolModifications = ref(!CONFIG.genesys.settings.startWithCollapsedPoolModifications);

let previousDicePool: DicePool = {
	dice: {},
	symbols: {},
	usesSuperCharacteristic: false,
};

onMounted(() => {
	const actor = context.value.actor;

	if (actor) {
		// A vehicle weapon's attack is rolled by a crew member for their role, not with an Attack Skill. A spell offers its
		// magic skills first, as a weapon its Attack Skills.
		const listed = spell?.system.skills ?? (attack?.weapon.type === 'weapon' ? attack.profile.skills : []);
		const skills = promptSkills(actor.skills, CONFIG.genesys.skills, listed);
		weaponSkills.value = skills.weapon;
		availableSkills.value = skills.owned;
		unrankedSkills.value = skills.unranked;
	}

	resolve({ skillName: context.value.skillName, fallbackCharacteristic: context.value.characteristic });
});

// The user's single target, read once as the prompt opens: the defense, the attack's Critical Injury and its card all
// use it, whoever the user targets while the prompt is open.
const target = singleTargetActor();

/**
 * Resolve the check again for the skill and characteristic asked for. The Pool Modifications still listed keep their
 * state, new ones follow the world setting.
 */
function resolve(request: CheckRequest<PromptSkill>) {
	const resolved = resolveCheck(
		context.value.actor,
		{
			...request,
			purpose: checkPurposeOf(context.value.roll),
			target,
			attackRange: attackRangeOf(context.value.roll),
			attacker: vehicleAttacker(attack?.weapon),
			weapon: attack?.weapon,
			attackQualities: attack?.profile.qualities,
			usesSuperCharacteristic: useSuperCharacteristic.value,
		},
		worldCheckRules(),
	);

	effects.value = carriedPoolModificationStates(
		effects.value,
		resolved.poolModifications,
		CONFIG.genesys.settings.autoApplyPoolModifications,
	).map((modification) => ({
		key: modification.key,
		origin: game.i18n.localize(poolModificationOriginLabel(modification.source)),
		name: poolModificationName(modification),
		link: sourceLink(modification),
		enabled: modification.enabled,
		mods: modification.mods,
	}));

	check.value = resolved;
	selectedSkill.value = resolved.skill;
	selectedCharacteristic.value = resolved.characteristic;

	buildDicePool();
}

/**
 * What a Pool Modification comes from: its effect, followed by the item the effect comes from when they are named apart.
 */
function poolModificationName({ from }: CheckPoolModification) {
	return matchOrigin(from, {
		effect: (name, _uuid, item) =>
			item && item.name !== name
				? game.i18n.format('Genesys.DicePrompt.PoolModifications.EffectOfItem', { effect: name, item: item.name })
				: name,
		defense: (defense) => game.i18n.localize(DEFENSE_LABELS[defense]),
		silhouette: ({ target, attacker }) =>
			game.i18n.format('Genesys.DicePrompt.PoolModifications.SilhouetteDifference', {
				target: String(target),
				attacker: String(attacker),
			}),
		encumbrance: ({ value, threshold }) =>
			game.i18n.format('Genesys.DicePrompt.PoolModifications.Encumbrance', { value: String(value), threshold: String(threshold) }),
		itemDamage: ({ name, damage }) =>
			game.i18n.format('Genesys.DicePrompt.PoolModifications.ItemDamage', {
				item: name,
				damage: game.i18n.localize(EQUIPMENT_DAMAGE_LABELS[damage]),
			}),
	});
}

/**
 * The link to the document the roller opens to read a Pool Modification's conditions: the item its effect comes from, or
 * the effect when it comes from none, or the damaged weapon. None when the user may not see that document, as a player on a target's item.
 */
function sourceLink({ from }: CheckPoolModification): SourceLink | undefined {
	const uuid = matchOrigin(from, {
		effect: (_name, uuid, item) => item?.uuid ?? uuid,
		defense: () => undefined,
		silhouette: () => undefined,
		encumbrance: () => undefined,
		itemDamage: ({ uuid }) => uuid ?? undefined,
	});
	const document = sourceDocument(uuid);
	if (!uuid || !document?.testUserPermission(game.user, 'OBSERVER')) {
		return undefined;
	}

	return {
		uuid,
		tooltip: game.i18n.format('Genesys.DicePrompt.PoolModifications.OpenSource', { name: document.name }),
		icon: SOURCE_ICONS[document.documentName],
	};
}

function sourceDocument(uuid: string | undefined) {
	return uuid ? (fromUuidSync(uuid) as SourceDocument | null) : null;
}

function openSource(link: SourceLink) {
	void sourceDocument(link.uuid)?.sheet?.render(true);
}

function buildDicePool() {
	const enabledKeys = new Set(effects.value.filter((effect) => effect.enabled).map((effect) => effect.key));
	currentDicePool.value = checkDicePool(check.value!, {
		difficulty: difficultyGlyphs(difficulty.value),
		// A Story Point's upgrade applies as the roller's own changes do.
		manualChanges: [...manualChanges.value, ...spendGlyphs(spends.value)].sort(sortPoolModifications),
		isEnabled: (modification) => enabledKeys.has(modification.key),
	});

	void approximateProbability();
}

async function approximateProbability() {
	if (!USE_CHANCE_TO_SUCCEED) {
		return;
	}

	const dicePool = currentDicePool.value;
	const obsoleteDicePool = previousDicePool;
	previousDicePool = dicePool;

	let chance: number;
	switch (chanceComputation(dicePool, obsoleteDicePool, USE_CHANCE_TO_SUCCEED_BY_PERMUTATION ? 'permutation' : 'simulation')) {
		case 'count':
			chance = chanceToSucceed(dicePool);
			break;

		case 'unchanged':
			return;

		case 'permutation': {
			const { dice, symbols } = dicePool;
			chance = await chanceToSucceedInWorker({ dice, symbols });
			break;
		}

		case 'simulation': {
			const simulation = await Promise.all(
				Array.from({ length: CHANCE_TO_SUCCEED_BY_SIMULATION_NUM_ROLLS }, () => rollPool(currentDicePool.value)),
			);
			chance = simulatedChance(simulation.map(({ results }) => results));
			break;
		}
	}

	probabilityOfSuccess.value = formatChance(chance);
}

function onSkillChange(event: Event) {
	const selectedOption = event.currentTarget as HTMLSelectElement;
	const skill = [...weaponSkills.value, ...availableSkills.value, ...unrankedSkills.value].find((s) => s.id === selectedOption.value);

	resolve({ skillName: skill?.name });
}

function onCharacteristicChange(event: Event) {
	const selectedOption = event.currentTarget as HTMLSelectElement;

	resolve({
		skillName: selectedSkill.value?.name,
		characteristic: selectedOption.value !== '-' ? (selectedOption.value as Characteristic) : null,
	});
}

function skillLabel(skill: { name: string; system: { characteristic: Characteristic } }) {
	return `${skill.name} (${game.i18n.localize(CHARACTERISTIC_ABBREVIATIONS[skill.system.characteristic])})`;
}

function onDifficultyDieClick(die: number) {
	difficulty.value = withLevel(difficulty.value, clickedLevel(difficulty.value.level, die));
	buildDicePool();
}

/**
 * Check or uncheck one of the spell's Additional Effects, which raises or lowers the difficulty by its own (CRB p. 215),
 * from whatever level the roller left it at.
 */
function onEffectChange(effect: ContainedAdditionalEffect, event: Event) {
	const checked = (event.currentTarget as HTMLInputElement).checked;
	const others = checkedEffects.value.filter((id) => id !== effect.id);
	checkedEffects.value = checked ? [...others, effect.id] : others;
	const added = checked ? difficultyAddedBy(difficulty.value.level, effect) : -(addedByEffect.get(effect.id) ?? 0);
	if (checked) {
		addedByEffect.set(effect.id, added);
	} else {
		addedByEffect.delete(effect.id);
	}
	difficulty.value = withLevel(difficulty.value, difficulty.value.level + added);
	buildDicePool();
}

function onSpendChange(spend: CheckSpend, event: Event) {
	const others = chosen.value.filter((other) => other !== spend);
	chosen.value = (event.currentTarget as HTMLInputElement).checked ? [...others, spend] : others;
	buildDicePool();
}

function addManualChange(glyph: string) {
	manualChanges.value.push(glyph);
	manualChanges.value.sort(sortPoolModifications);
	buildDicePool();
}

function removeManualChange(index: number) {
	manualChanges.value.splice(index, 1);
	buildDicePool();
}

const glyphLocalizer = worldGlyphLocalizer();

/**
 * A Pool Modification in words, which names the button applying it: "Upgrade 1 Ability die".
 */
function modificationName(glyph: string) {
	return poolModificationLabel([glyph], glyphLocalizer);
}

/**
 * The name of the button cancelling a manual change: "Cancel: Remove 1 Ability die".
 */
function cancelName(glyph: string) {
	return game.i18n.format('Genesys.DicePrompt.PoolModifications.Cancel', { modification: modificationName(glyph) });
}

// The prompt answers with the check, the pool built for it and the Story Points spent on it; it spends them, and its
// caller rolls the check.
usePromptAnswer<DicePromptAnswer>(() => {
	const answered = {
		// The check is resolved as the prompt mounts, before the roller can answer.
		check: check.value!,
		dicePool: currentDicePool.value,
		spends: spends.value,
		targetUuid: target?.uuid ?? undefined,
	};
	return spell ? { ...answered, type: RollType.Spell, spellEffects: [...checkedEffects.value] } : { ...answered, type: 'check' };
});

const superCharacteristicId = useId();
const effectId = useId();
const chanceId = useId();
const spendId = useId();
</script>

<template>
	<div class="genesys dice-prompt">
		<header>
			<span class="hint"><Localized label="Genesys.DicePrompt.Hint" /></span>
			<ul v-if="stateReminderLabels.length > 0" class="state-reminders">
				<li v-for="reminder in stateReminderLabels" :key="reminder">
					<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
					<Localized :label="reminder" />
				</li>
			</ul>
		</header>

		<div class="preview">
			<div v-for="category in DIE_CATEGORIES" :key="category" :class="category">
				<!-- The glyph draws the die: the button is named by what a click does, "Remove 1 Ability die". -->
				<ActionButton
					v-for="(entry, index) in poolEntries(currentDicePool, category)"
					:key="index"
					:localized-label="modificationName(removalGlyph(entry.glyph))"
					:class="entry.kind === 'die' ? `die die-${entry.name}` : 'symbol'"
					@click="addManualChange(removalGlyph(entry.glyph))"
				>
					<template #icon>{{ entry.glyph }}</template>
				</ActionButton>
			</div>

			<div class="dice-box">
				<template v-for="(row, index) in DICE_BOX" :key="index">
					<ActionButton
						v-for="glyph in row"
						:key="glyph"
						:localized-label="modificationName(glyph)"
						@click="addManualChange(glyph)"
					>
						<template #icon><PoolModificationIcon :glyph /></template>
					</ActionButton>
					<span v-if="row.length < 3" />
				</template>
			</div>
		</div>

		<div v-if="context.actor" class="characteristic-skill-row">
			<select
				name="characteristic"
				v-localize:aria-label="'Genesys.Labels.Characteristic'"
				:value="selectedCharacteristic ?? '-'"
				:disabled="!characteristicPickable"
				@change="onCharacteristicChange"
			>
				<option v-if="offersNoCharacteristic" value="-">—</option>
				<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
					<Localized :label="label" />
				</option>
			</select>

			<select name="skill" v-localize:aria-label="'Genesys.Labels.Skill'" :value="selectedSkill?.id ?? '-'" @change="onSkillChange">
				<option value="-">—</option>
				<optgroup
					v-if="weaponSkills.length > 0"
					v-localize:label="spell ? 'Genesys.DicePrompt.SpellSkills' : 'Genesys.DicePrompt.WeaponSkills'"
				>
					<option v-for="skill in weaponSkills" :key="skill.id" :value="skill.id">{{ skillLabel(skill) }}</option>
				</optgroup>
				<option v-for="skill in availableSkills" :key="skill.id" :value="skill.id">{{ skillLabel(skill) }}</option>
				<optgroup v-if="unrankedSkills.length > 0" v-localize:label="'Genesys.DicePrompt.UnrankedSkills'">
					<option v-for="skill in unrankedSkills" :key="skill.id" :value="skill.id">{{ skillLabel(skill) }}</option>
				</optgroup>
			</select>
		</div>

		<div v-else-if="USE_SUPER_CHARACTERISTICS" class="super-characteristic-row">
			<input :id="superCharacteristicId" type="checkbox" v-model="useSuperCharacteristic" @change="resolve({})" />
			<label :for="superCharacteristicId"><Localized label="Genesys.DicePrompt.UseSuperCharacteristic" /></label>
		</div>

		<DescriptionFold v-model:open="showPoolModifications" class="pool-modifications-title">
			<template #summary>
				<span><Localized label="Genesys.DicePrompt.PoolModifications.Title" /></span>
			</template>
			<template #fold>
				<div class="pool-modifications-container">
					<div class="pool-modifications-difficulty">
						<span>
							<Localized label="Genesys.DicePrompt.PoolModifications.Difficulty" :format-args="{ level: difficultyName }" />
						</span>
						<div>
							<button
								v-for="(die, index) in difficultyRow(difficulty)"
								:key="index"
								type="button"
								:name="`difficulty-${index + 1}`"
								:class="`difficulty-die difficulty-die-${die}`"
								:data-tooltip="DIFFICULTY_LABELS[index + 1]"
								v-localize:aria-label="DIFFICULTY_LABELS[index + 1]"
								@click="onDifficultyDieClick(index + 1)"
							>
								{{ die === 'Challenge' ? DIE_GLYPHS.Challenge : DIE_GLYPHS.Difficulty }}
							</button>
							<!-- After the five dice, the level above Formidable, whose dice it rolls (CRB p. 18). -->
							<button
								type="button"
								:name="`difficulty-${IMPOSSIBLE}`"
								:class="['difficulty-impossible', { on: impossible }]"
								:aria-pressed="impossible"
								:data-tooltip="DIFFICULTY_LABELS[IMPOSSIBLE]"
								v-localize:aria-label="DIFFICULTY_LABELS[IMPOSSIBLE]"
								@click="onDifficultyDieClick(IMPOSSIBLE)"
							>
								<i class="fa-solid fa-skull" aria-hidden="true"></i>
							</button>
						</div>
					</div>
					<div v-for="effect in effects" :key="effect.key" class="pool-modifications-effects">
						<input type="checkbox" v-model="effect.enabled" @change="buildDicePool()" />
						<span>
							<!-- Not a label: one would pass a click on its text to the source's button. The source's button opens it,
						the checkbox alone turns the modification on. -->
							<!-- prettier-ignore -->
							<span class="effect-name">{{ effect.origin }}<ActionButton v-if="effect.link" class="source-link" :data-tooltip="effect.link.tooltip" @click="openSource(effect.link)">{{ effect.name }}<i :class="effect.link.icon"></i></ActionButton><template v-else>{{ effect.name }}</template></span>
						</span>
						<div>
							<PoolModificationIcon v-for="(modification, index) in effect.mods" :key="index" :glyph="modification" />
						</div>
					</div>
					<!-- Below the effects' rows, which its label, empty, would read as the heading of. -->
					<div class="pool-modifications-manual">
						<span><Localized label="Genesys.DicePrompt.PoolModifications.ManualChanges" /></span>
						<div>
							<ActionButton
								v-for="(modification, index) in manualChanges"
								:key="index"
								:localized-label="cancelName(modification)"
								@click="removeManualChange(index)"
							>
								<template #icon><PoolModificationIcon :glyph="modification" /></template>
							</ActionButton>
						</div>
					</div>
				</div>
			</template>
		</DescriptionFold>

		<!-- Out of the Pool Modifications' fold: the Additional Effects checked change the spell, not only its dice; an Impossible
		task's point, without which it can't be rolled, stays in sight. -->
		<div class="choices">
			<fieldset v-if="spellEffects.length > 0" class="spell-effects">
				<legend><Localized label="Genesys.Labels.AdditionalEffects" /></legend>
				<div v-for="effect in spellEffects" :key="effect.id" class="spell-effect">
					<input
						:id="`${effectId}-${effect.id}`"
						type="checkbox"
						:name="`effect-${effect.id}`"
						:checked="checkedEffects.includes(effect.id)"
						:disabled="!canCheck(effect)"
						:aria-describedby="canCheck(effect) ? undefined : `${effectId}-${effect.id}-why`"
						@change="onEffectChange(effect, $event)"
					/>
					<label :for="`${effectId}-${effect.id}`">{{ effect.name }}</label>
					<Glyphs class="glyph" :glyphs="`+${DIE_GLYPHS.Difficulty.repeat(effect.difficulty)}`" />
					<span v-if="!canCheck(effect)" :id="`${effectId}-${effect.id}-why`" class="why">
						<Localized label="Genesys.DicePrompt.BeyondFormidable" />
					</span>
				</div>
			</fieldset>

			<fieldset class="story-points">
				<legend><Localized label="Genesys.DicePrompt.StoryPoints.Title" /></legend>
				<div v-for="option in options" :key="option.spend" :class="['story-point-spend', option.spend]">
					<input
						:id="`${spendId}-${option.spend}`"
						type="checkbox"
						:name="`spend-${option.spend}`"
						:checked="spends.includes(option.spend)"
						:disabled="!!option.refusal"
						:aria-describedby="option.refusal || option.spend === 'impossible' ? `${spendId}-${option.spend}-why` : undefined"
						@change="onSpendChange(option.spend, $event)"
					/>
					<label :for="`${spendId}-${option.spend}`">
						<Localized :label="SPEND_LABELS[option.spend]" />
						<!-- The pool's name in words, after a space Vue would drop between the two elements: a screen reader reads the
					label as one. -->
						<span class="pool">{{ ' ' }}(<Localized :label="POOL_LABELS[option.pool]" />)</span>
					</label>
					<span v-if="SPEND_GLYPHS[option.spend]" class="glyph"
						><PoolModificationIcon :glyph="SPEND_GLYPHS[option.spend]!"
					/></span>
					<span v-if="option.refusal" :id="`${spendId}-${option.spend}-why`" class="why"
						><Localized :label="option.refusal"
					/></span>
					<span v-else-if="option.spend === 'impossible'" :id="`${spendId}-${option.spend}-why`" class="why">
						<Localized label="Genesys.DicePrompt.StoryPoints.ImpossibleCost" />
					</span>
				</div>
			</fieldset>
		</div>

		<div v-if="USE_CHANCE_TO_SUCCEED" class="chance-to-succeed">
			<label :for="chanceId">
				<i
					class="fas fa-circle-info"
					:data-tooltip="
						USE_CHANCE_TO_SUCCEED_BY_PERMUTATION
							? 'Genesys.DicePrompt.ChanceToSucceedByPermutationDisclaimer'
							: 'Genesys.DicePrompt.ChanceToSucceedBySimulationDisclaimer'
					"
				></i>
				{{ '\xa0' }}
				<Localized label="Genesys.DicePrompt.ChanceToSucceed" />
			</label>

			<output :id="chanceId">
				<i v-if="!probabilityOfSuccess" class="fas fa-spinner fa-spin"></i>
				<span v-else>{{ probabilityOfSuccess }}%</span>
			</output>
		</div>

		<PromptFooter class="roll-button" label="Genesys.DicePrompt.Roll" :disabled="!canRoll" />
	</div>
</template>

<style lang="scss">
// Unscoped: window.prompt styles the Foundry window around the component.
@use '@scss/mixins/window.scss';

.app-dice-prompt {
	@include window.prompt(500px, 300px);
}
</style>

<style lang="scss" scoped>
@use 'sass:math';
@use '@scss/vars/colors.scss';
@use '@scss/vars/appv1.scss';
@use '@scss/mixins/reset.scss';
@use '@scss/mixins/headings.scss';

// The Pool Modifications' title: its chevron alone in the margin, its text on the table's left edge.
$title-font-size: 1.2rem;
$chevron-column: 1rem;
$chevron-gap: 0.4 * $title-font-size;

// The Pool Modifications' rows, in rem, as the checkbox's size, so that it is centred on a label's first line: Foundry
// gives inputs a font of their own. Their columns are as far apart as the chevron is from the title.
$row-line-height: 1.25rem;
$row-padding: 0.15rem;
$row-column-gap: 0.4em;
$checkbox-size: 1.25rem;

// Genesys Symbols draws its dice and symbols with the middle of their ink 0.5em above the baseline, where Roboto has the
// middle of its capitals 0.355em above (1456 of 2048 units): on the label's baseline, a glyph sits high, the more so the
// larger it is (§#535). The vertical-align that lowers a glyph `$scale` times the label's size onto the capitals' middle.
@function onto-capitals($scale) {
	@return -(0.5 - math.div(0.355, $scale)) * 1em;
}

// The Difficulty dice, larger than the modifications' glyphs.
$difficulty-die-scale: 1.4;
// The smallest size of a pointer's target (WCAG 2.2, 2.5.8).
$target-size: 24px;

.dice-prompt {
	display: grid;
	grid-template-columns: 2fr 1fr 2fr;
	grid-template-rows: /* Header */ auto /* Dice Pool */ 1fr /* Skill & Characteristic */ auto;
	gap: 0.5em;

	//#region Grid Layout
	header {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		grid-column: 1 / span all;
		grid-row: 1 / span 1;

		.hint {
			font-family: 'Roboto', serif;
			font-size: 1rem;
			// Foundry's colour for the hints of a form, which v13 only gives AppV1 windows.
			color: appv1.$text-secondary;
		}

		.state-reminders {
			list-style: none;
			margin: 0.25em 0 0;
			padding: 0;
			font-family: 'Roboto', sans-serif;
			font-size: 1rem;
			font-weight: bold;

			// Vue drops the line break between the icon and the text, which the margin stands for.
			i {
				margin-inline-end: 0.4em;
			}
		}
	}

	.preview {
		grid-column: 1 / span all;
		grid-row: 2 / span 1;
	}

	.characteristic-skill-row {
		display: contents;
	}

	[name='characteristic'],
	[name='skill'] {
		grid-row: 3 / span 1;
	}

	[name='characteristic'] {
		grid-column: 1 / span 1;
	}

	[name='skill'] {
		grid-column: 2 / span 2;
	}

	.super-characteristic-row {
		grid-row: 3 / span 1;
		grid-column: 1 / span all;

		& > * {
			vertical-align: middle;
		}
	}

	// The title and the fold of the Pool Modifications are the roots of a `DescriptionFold`, which take no scope attribute
	// from the prompt: :deep() reaches them.
	& > :deep(.pool-modifications-title) {
		grid-column: 1 / span all;
		grid-row: 4 / span all;
		display: grid;
		// The chevron's column keeps its width whichever way it points, so that the text doesn't move as the section folds;
		// Bebas Neue's letters have almost no side bearing, which the gap makes up for.
		grid-template-columns: $chevron-column 1fr;
		column-gap: $chevron-gap;
		align-items: center;
		@include headings.font;
		font-size: $title-font-size;
		margin-bottom: -0.5em;
		// A button takes its content's width, where the row it replaced filled the prompt's.
		width: 100%;
		text-align: start;

		// `chevron-right` and `chevron-down` are not as wide: centred, they turn on one axis. Smaller than the title, as
		// the chevrons after the rows' names are smaller than the names.
		i {
			justify-self: center;
			font-size: 0.8em;
		}
	}

	& > :deep(.description-fold) {
		grid-column: 1 / span all;
		grid-row: 5 / span all;
		overflow: hidden;

		// The fold clips the folded Pool Modifications, and its content, which `DescriptionFold` would clip too, doesn't:
		// the glow and the focus outline of a Difficulty die, in the first row, pass its top edge. The content, the fold's
		// only child, holds the top border: folded, the fold keeps its 1px, which a border on the container inside would
		// overflow.
		& > .description-fold-content {
			overflow: visible;
			margin-left: $chevron-column + $chevron-gap;
			border-top: 1px dotted colors.$ink;
		}
	}

	.pool-modifications-container {
		display: grid;
		font-family: 'Roboto', sans-serif;

		// A row: its checkbox, left empty for the Difficulty and the manual changes, so that every label starts on one edge
		// and a label that wraps goes on under its own text; then its label, and its modifications.
		& > div {
			display: grid;
			grid-template-columns: $checkbox-size minmax(0, 2fr) minmax(0, 1.2fr);
			column-gap: $row-column-gap;
			border-bottom: 1px dotted colors.$ink;
			line-height: $row-line-height;

			& > span,
			& > div {
				padding-block: $row-padding;
			}

			& > span {
				grid-column: 2;
			}

			& > div {
				grid-column: 3;
				border-left: 1px dotted colors.$ink;
				padding-left: 0.5rem;
			}
		}

		.pool-modification {
			display: inline-flex;
			flex-direction: row;
			flex-wrap: nowrap;
			align-items: flex-start;
			font-family: 'Genesys Symbols', sans-serif;
			margin-right: 0.2rem;
			cursor: default;

			// A modification's icon; the label's link to its source keeps the label's line.
			&[data-pool-entity] {
				vertical-align: onto-capitals(1);
				// A box no taller than the glyph, so that lowering it doesn't make the row taller.
				line-height: 1;
			}

			&[data-pool-entity] > :deep(i.fas) {
				-webkit-text-stroke: 0 transparent;
				text-stroke: 0 transparent;
			}

			&[data-pool-entity='Ability'] {
				-webkit-text-stroke: 0.5px colors.$die-outline;
				text-stroke: 0.5px colors.$die-outline;
				color: colors.$die-ability;
			}

			&[data-pool-entity='Proficiency'] {
				-webkit-text-stroke: 0.5px colors.$die-outline;
				text-stroke: 0.5px colors.$die-outline;
				color: colors.$die-proficiency;
			}

			&[data-pool-entity='Boost'] {
				-webkit-text-stroke: 0.5px colors.$die-outline;
				text-stroke: 0.5px colors.$die-outline;
				color: colors.$die-boost;
			}

			&[data-pool-entity='Difficulty'] {
				-webkit-text-stroke: 0.5px colors.$die-outline;
				text-stroke: 0.5px colors.$die-outline;
				color: colors.$die-difficulty;
			}

			&[data-pool-entity='Challenge'] {
				-webkit-text-stroke: 0.5px colors.$die-outline;
				text-stroke: 0.5px colors.$die-outline;
				color: colors.$die-challenge;
			}

			&[data-pool-entity='Setback'] {
				-webkit-text-stroke: 0.5px colors.$die-outline;
				text-stroke: 0.5px colors.$die-outline;
				color: colors.$die-setback;
			}
		}

		// A manual change is a button holding its glyph: the button is lowered, as the glyph is elsewhere, and its box
		// stays no taller than the glyph.
		.pool-modifications-manual .action-button {
			vertical-align: onto-capitals(1);
			line-height: 1;

			// The glyph shows the button's pointer, where the effects' rows show their own default arrow.
			.pool-modification {
				vertical-align: baseline;
				cursor: inherit;
			}
		}

		:deep(i) {
			color: colors.$ink;
			position: relative;
			font-size: 0.5em;
			top: -0.25em;
		}

		// Five dice in a row, as many lit as the level has Difficulty dice (§#469), then the Impossible mark (§#671): six
		// targets of 24 px side by side, with no margin between them, fill the column without wrapping onto a second line,
		// where they would overlap the first.
		.pool-modifications-difficulty > div {
			white-space: nowrap;
		}

		.pool-modifications-difficulty .difficulty-die,
		.pool-modifications-difficulty .difficulty-impossible {
			// Foundry styles every button as a box; the die shows only its glyph, centred in a box of the smallest target
			// size WCAG 2.2 asks for, 24 px.
			display: inline-block;
			width: auto;
			min-width: $target-size;
			height: $target-size;
			min-height: 0;
			text-align: center;
			// The negative margins keep the lowered die within the row's line, which takes the die's margin box: the
			// focus outline still goes round the whole target. They take back the leading a line of 24 px adds to the
			// glyph's, so the margin box is the glyph's own.
			margin: calc(-0.25em - ($target-size - 1em) / 2) 0;
			padding: 0;
			border: none;
			border-radius: 0;
			background: none;
			font-size: $difficulty-die-scale * 1em;
			line-height: $target-size;
			vertical-align: onto-capitals($difficulty-die-scale);
			cursor: pointer;

			// The focus ring's gap is a box shadow (VueSheet.scss), which a die keeps from the keyboard.
			&:not(:focus-visible) {
				box-shadow: none;
			}

			// Foundry outlines a focused button; a click on a die leaves none, the keyboard still shows it.
			&:focus:not(:focus-visible) {
				outline: none;
			}
		}

		.pool-modifications-difficulty .difficulty-die {
			font-family: 'Genesys Symbols', sans-serif;
			-webkit-text-stroke: 0.5px colors.$die-outline;
			text-stroke: 0.5px colors.$die-outline;

			&.difficulty-die-Difficulty {
				color: colors.$die-difficulty;
			}

			&.difficulty-die-Challenge {
				color: colors.$die-challenge;
			}

			&.difficulty-die-Off {
				color: colors.$die-difficulty;
				opacity: 0.25;
			}

			&:hover {
				text-shadow: 0 0 4px colors.$die-difficulty;
			}
		}

		// The mark of the level above Formidable, after its five dice: lit as a Challenge die once the task is Impossible.
		.pool-modifications-difficulty .difficulty-impossible {
			i {
				position: static;
				top: 0;
				font-size: 0.7em;
				line-height: inherit;
				vertical-align: baseline;
				color: colors.$die-difficulty;
				opacity: 0.25;
			}

			&.on i {
				color: colors.$die-challenge;
				opacity: 1;
			}

			&:hover i {
				text-shadow: 0 0 4px colors.$die-challenge;
			}
		}

		.pool-modifications-effects {
			@include reset.input;
			input {
				grid-column: 1;
				align-self: start;
				// Foundry draws the checkbox as a glyph of this size, which its box takes too.
				--checkbox-size: #{$checkbox-size};
				width: $checkbox-size;
				height: $checkbox-size;
				margin-top: $row-padding + ($row-line-height - $checkbox-size) * 0.5;
			}

			// The name of what a Pool Modification comes from, as plain text that opens it; not the glyph of a Pool
			// Modification, which the rules above style.
			.source-link {
				display: inline;
				margin: 0;
				font-family: inherit;
				color: inherit;
				cursor: pointer;

				&:hover {
					text-decoration: underline;
					text-shadow: none;
				}

				i {
					position: static;
					top: 0;
					margin-left: 0.25em;
					font-size: 0.85em;
					color: inherit;
				}
			}
		}
	}

	// The choices that change more than the dice: a spell's Additional Effects, when it has some, then the Story Points, in
	// one row of the grid, so that a check without effects keeps its rows and gaps.
	.choices {
		grid-column: 1 / span all;
		grid-row: 6 / span 1;
	}

	// A row per spend or per Additional Effect: its checkbox, its label with the pool it comes from, the upgrade or the
	// difficulty it adds, then why it is closed, under the label.
	.story-points,
	.spell-effects {
		margin: 0.5rem 0 0;
		padding: 0;
		border: none;
		font-family: 'Roboto', sans-serif;

		legend {
			@include headings.font;
			font-size: $title-font-size;
			padding: 0;
		}

		.story-point-spend,
		.spell-effect {
			@include reset.input;
			display: grid;
			grid-template-columns: $checkbox-size 1fr auto;
			column-gap: $row-column-gap;
			align-items: center;
			border-bottom: 1px dotted colors.$ink;
			line-height: $row-line-height;
			padding-block: $row-padding;

			input {
				--checkbox-size: #{$checkbox-size};
				width: $checkbox-size;
				height: $checkbox-size;
				margin: 0;
			}

			.pool {
				color: appv1.$text-secondary;
			}

			.glyph {
				font-family: 'Genesys Symbols', sans-serif;
			}

			// The Difficulty dice an Additional Effect adds, in their colour.
			&.spell-effect .glyph {
				color: colors.$die-difficulty;
			}

			.why {
				grid-column: 2 / span 2;
				font-size: 0.9em;
				color: appv1.$text-secondary;
			}
		}
	}

	.chance-to-succeed {
		grid-column: 1 / span 2;
		grid-row: 7 / span 1;
		margin-top: 1rem;

		label {
			margin-right: 1rem;
		}
	}

	.prompt-footer {
		grid-column: 3 / span 1;
		grid-row: 7 / span 1;
		margin-top: 1rem;
	}
	//#endregion

	header {
		color: colors.$text-blue;
		@include headings.font;
		font-size: 2em;
	}

	// The footer's buttons are its own elements, which the scoped rules don't reach.
	.prompt-footer :deep(.roll-button) {
		color: colors.$text-blue;
		@include headings.font;
		font-size: 1.25em;
	}

	.preview {
		display: grid;
		grid-template-columns: /* Pool Previews */ 1fr /* Dice Box */ auto;
		grid-template-rows: /* Positive Dice */ 1fr /* Negative Dice */ 1fr;
		gap: 0.5em;

		background: linear-gradient(to bottom, colors.$shadow -40%, colors.$blue 20%, colors.$blue-shade 70%, colors.$shadow 130%);
		border-top: 1px solid colors.$ink;
		border-bottom: 1px solid colors.$ink;
		margin-left: -0.5rem;
		margin-right: -0.5rem;
		padding-left: 0.5em;

		.positive,
		.negative {
			grid-column: 1 / span 1;

			display: flex;
			align-items: center;
			flex-direction: row;
			flex-wrap: wrap;
		}

		.positive {
			grid-row: 1 / span 1;
		}

		.negative {
			grid-row: 2 / span 1;
		}

		.dice-box {
			grid-column: 2 / span 1;
			grid-row: 1 / span all;
			background: colors.alpha(colors.$shadow, 0.25);
			border-top-left-radius: 0.5rem;
			border-bottom-left-radius: 0.5rem;
			color: colors.$text-on-dark;
			padding: 0.5em;
			column-gap: 0.25em;
			align-items: center;
			justify-items: center;
			font-size: 1.25em;

			display: grid;
			grid-template-columns: repeat(3, auto);

			.pool-modification {
				display: inline-flex;
				flex-direction: row;
				flex-wrap: nowrap;
				align-items: flex-start;
				font-family: 'Genesys Symbols', sans-serif;

				&[data-pool-entity='Ability'] {
					color: colors.$die-ability;
				}

				&[data-pool-entity='Proficiency'] {
					color: colors.$die-proficiency;
				}

				&[data-pool-entity='Boost'] {
					color: colors.$die-boost;
				}

				&[data-pool-entity='Difficulty'] {
					-webkit-text-stroke: 0.5px colors.$text-on-dark;
					text-stroke: 0.5px colors.$text-on-dark;
					color: colors.$die-difficulty;

					:deep(i) {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}

				&[data-pool-entity='Challenge'] {
					-webkit-text-stroke: 0.5px colors.$text-on-dark;
					text-stroke: 0.5px colors.$text-on-dark;
					color: colors.$die-challenge;

					:deep(i) {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}

				&[data-pool-entity='Setback'] {
					-webkit-text-stroke: 0.5px colors.$text-on-dark;
					text-stroke: 0.5px colors.$text-on-dark;
					color: colors.$die-setback;

					:deep(i) {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}
			}

			:deep(i) {
				color: colors.$text-on-dark;
				position: relative;
				font-size: 0.5em;
				top: -0.25em;
			}
		}

		.die,
		.symbol {
			display: inline;
			font-family: 'Genesys Symbols', sans-serif;
			font-size: 2rem;
			color: colors.$text-on-dark;
			cursor: pointer;

			&:hover {
				text-shadow:
					0 0 0 colors.$glow-core,
					0 0 1px colors.$glow-core,
					0 0 2px colors.$glow,
					0 0 3px colors.$glow,
					0 0 4px colors.$glow,
					0 0 5px colors.$glow,
					0 0 6px colors.$glow;
			}
		}

		.die {
			margin-left: -0.1em;
			margin-right: -0.05em;
			margin-top: 0.1em;
			-webkit-text-stroke: 2px colors.$die-outline;
			text-stroke: 2px colors.$die-outline;
			font-size: 2.5rem;

			&.die-Ability {
				color: colors.$die-ability;
			}

			&.die-Difficulty {
				color: colors.$die-difficulty;
			}

			&.die-Proficiency {
				color: colors.$die-proficiency;
			}

			&.die-Challenge {
				color: colors.$die-challenge;
			}

			&.die-Boost {
				color: colors.$die-boost;
			}

			&.die-Setback {
				color: colors.$die-setback;
			}
		}
	}
}
</style>
