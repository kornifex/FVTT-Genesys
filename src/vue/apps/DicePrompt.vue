<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef } from 'vue';
import type { Stored } from '@/data/Stored';
import { DicePromptContext, RollType } from '@/app/DicePrompt';
import { chanceComputation, chanceToSucceed, formatChance, simulatedChance } from '@/dice/ChanceToSucceed';
import { chanceToSucceedInWorker } from '@/dice/chanceToSucceedInWorker';
import { CHARACTERISTIC_ABBREVIATIONS, CHARACTERISTICS, Characteristic } from '@/data/Characteristics';
import { DEFENSE_LABELS } from '@/data/Actors';
import { rollCheck, rollPool } from '@/dice/CheckRoll';
import { GenesysItem } from '@/item/GenesysItem';
import { useSheetContext } from '@/vue/SheetContext';
import Localized from '@/vue/components/Localized.vue';
import PoolModificationIcon from '@/vue/components/PoolModificationIcon.vue';
import { vLocalize } from '@/vue/directives';
import type { DieCategory } from '@/dice/dice/GenesysDie';
import { DIE_GLYPHS, GRADE_GLYPHS, removalGlyph, SYMBOL_GLYPHS } from '@/dice/GenesysPoolModifications';
import { promptSkills } from '@/data/Skills';
import {
	type Check,
	type CheckPoolModification,
	type CheckPurpose,
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
import { type DicePool, parsePoolModifications, poolEntries, sortPoolModifications } from '@/dice/DicePool';

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

// Shallow, so that the dice pool reaches the chance Worker as it is: a reactive proxy can't be cloned to a Worker.
const currentDicePool = shallowRef<DicePool>({
	dice: {},
	symbols: {},
	usesSuperCharacteristic: false,
});
const check = shallowRef<Check<PromptSkill>>();
const baseDifficulty = parsePoolModifications(context.value.difficulty);
const manualChanges = ref<string[]>([]);
// The Pool Modifications of the check, each turned on or off by the roller.
const effects = ref<{ key: string; name: string; enabled: boolean; mods: string[] }[]>([]);
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
		// A vehicle weapon's attack is rolled by a crew member for their role, not with an Attack Skill.
		const skills = promptSkills(actor.skills, CONFIG.genesys.skills, attack?.weapon.type === 'weapon' ? attack.profile.skills : []);
		weaponSkills.value = skills.weapon;
		availableSkills.value = skills.owned;
		unrankedSkills.value = skills.unranked;
	}

	resolve({ skillName: context.value.skillName, fallbackCharacteristic: context.value.characteristic });
});

/**
 * Resolve the check again for the skill and characteristic asked for. The Pool Modifications still listed keep their
 * state, new ones follow the world setting.
 */
function resolve(request: CheckRequest<PromptSkill>) {
	const [target] = game.user.targets.size === 1 ? game.user.targets : [];
	const resolved = resolveCheck(
		context.value.actor,
		{
			...request,
			purpose: checkPurpose(),
			target: target?.actor ?? undefined,
			attackRange: attack?.profile.range,
			attacker: vehicleAttacker(attack?.weapon),
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
		name: poolModificationName(modification),
		enabled: modification.enabled,
		mods: modification.mods,
	}));

	check.value = resolved;
	selectedSkill.value = resolved.skill;
	selectedCharacteristic.value = resolved.characteristic;

	buildDicePool();
}

/**
 * What the prompt rolls the check for.
 */
function checkPurpose(): CheckPurpose {
	switch (context.value.roll.type) {
		case RollType.Attack:
			return { kind: 'attack', weaponName: context.value.roll.profile.attackName };

		case RollType.Initiative:
			return { kind: 'initiative' };

		default:
			return { kind: 'check' };
	}
}

function poolModificationName({ source, from }: CheckPoolModification) {
	return (
		game.i18n.localize(
			source === 'self' ? 'Genesys.DicePrompt.PoolModifications.SelfEffects' : 'Genesys.DicePrompt.PoolModifications.TargetEffects',
		) +
		matchOrigin(from, {
			effect: (name) => name,
			defense: (defense) => game.i18n.localize(DEFENSE_LABELS[defense]),
			silhouette: ({ target, attacker }) =>
				game.i18n.format('Genesys.DicePrompt.PoolModifications.SilhouetteDifference', {
					target: String(target),
					attacker: String(attacker),
				}),
		})
	);
}

function buildDicePool() {
	const enabledKeys = new Set(effects.value.filter((effect) => effect.enabled).map((effect) => effect.key));
	currentDicePool.value = checkDicePool(check.value!, {
		difficulty: context.value.difficulty,
		manualChanges: manualChanges.value,
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

function addManualChange(glyph: string) {
	manualChanges.value.push(glyph);
	manualChanges.value.sort(sortPoolModifications);
	buildDicePool();
}

function removeManualChange(index: number) {
	manualChanges.value.splice(index, 1);
	buildDicePool();
}

async function onRoll() {
	const checkRoll = { check: check.value!, dicePool: currentDicePool.value };

	switch (context.value.roll.type) {
		case RollType.Attack:
			await rollCheck(checkRoll, context.value.roll.profile);
			break;

		case RollType.Initiative:
			context.value.roll.resolve(checkRoll);
			break;

		default:
			await rollCheck(checkRoll);
	}

	await context.value.app.close();
}
</script>

<template>
	<div class="genesys dice-prompt">
		<header>
			<span class="hint"><Localized label="Genesys.DicePrompt.Hint" /></span>
		</header>

		<div class="preview">
			<div v-for="category in DIE_CATEGORIES" :key="category" :class="category">
				<div
					v-for="(entry, index) in poolEntries(currentDicePool, category)"
					:key="index"
					@click="addManualChange(removalGlyph(entry.glyph))"
					:class="entry.kind === 'die' ? `die die-${entry.name}` : 'symbol'"
				>
					{{ entry.glyph }}
				</div>
			</div>

			<div class="dice-box">
				<template v-for="(row, index) in DICE_BOX" :key="index">
					<PoolModificationIcon v-for="glyph in row" :key="glyph" :glyph @click="addManualChange(glyph)" />
					<span v-if="row.length < 3" />
				</template>
			</div>
		</div>

		<div v-if="context.actor" class="characteristic-skill-row">
			<select
				name="characteristic"
				:value="selectedCharacteristic ?? '-'"
				:disabled="!characteristicPickable"
				@change="onCharacteristicChange"
			>
				<option v-if="offersNoCharacteristic" value="-">—</option>
				<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
					<Localized :label="label" />
				</option>
			</select>

			<select name="skill" :value="selectedSkill?.id ?? '-'" @change="onSkillChange">
				<option value="-">—</option>
				<optgroup v-if="weaponSkills.length > 0" v-localize:label="'Genesys.DicePrompt.WeaponSkills'">
					<option v-for="skill in weaponSkills" :key="skill.id" :value="skill.id">{{ skillLabel(skill) }}</option>
				</optgroup>
				<option v-for="skill in availableSkills" :key="skill.id" :value="skill.id">{{ skillLabel(skill) }}</option>
				<optgroup v-if="unrankedSkills.length > 0" v-localize:label="'Genesys.DicePrompt.UnrankedSkills'">
					<option v-for="skill in unrankedSkills" :key="skill.id" :value="skill.id">{{ skillLabel(skill) }}</option>
				</optgroup>
			</select>
		</div>

		<div v-else-if="USE_SUPER_CHARACTERISTICS" class="super-characteristic-row">
			<input type="checkbox" v-model="useSuperCharacteristic" @change="resolve({})" />
			<label><Localized label="Genesys.DicePrompt.UseSuperCharacteristic" /></label>
		</div>

		<div class="pool-modifications-title" @click="showPoolModifications = !showPoolModifications">
			<i :class="`fas fa-caret-${showPoolModifications ? 'down' : 'right'}`"></i>
			<span><Localized label="Genesys.DicePrompt.PoolModifications.Title" /></span>
		</div>

		<div :class="{ 'pool-modifications-expander': true, 'pool-modifications-expanded': showPoolModifications }">
			<div class="pool-modifications-container">
				<div>
					<span><Localized label="Genesys.DicePrompt.PoolModifications.DefaultDifficulty" /></span>
					<div>
						<PoolModificationIcon v-for="(modification, index) in baseDifficulty" :key="index" :glyph="modification" />
					</div>
				</div>
				<div class="pool-modifications-manual">
					<span><Localized label="Genesys.DicePrompt.PoolModifications.ManualChanges" /></span>
					<div>
						<PoolModificationIcon
							v-for="(modification, index) in manualChanges"
							:key="index"
							:glyph="modification"
							@click="removeManualChange(index)"
						/>
					</div>
				</div>
				<div v-for="effect in effects" :key="effect.key" class="pool-modifications-effects">
					<span>
						<input type="checkbox" v-model="effect.enabled" @change="buildDicePool()" />
						<label>{{ '\xa0' + effect.name }}</label>
					</span>
					<div>
						<PoolModificationIcon v-for="(modification, index) in effect.mods" :key="index" :glyph="modification" />
					</div>
				</div>
			</div>
		</div>

		<div v-if="USE_CHANCE_TO_SUCCEED" class="chance-to-succeed">
			<label>
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

			<i v-if="!probabilityOfSuccess" class="fas fa-spinner fa-spin"></i>
			<span v-else>{{ probabilityOfSuccess }}%</span>
		</div>

		<button class="roll-button" @click.prevent="onRoll"><Localized label="Genesys.DicePrompt.Roll" /></button>
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
@use 'sass:color';
@use '@scss/vars/colors.scss';
@use '@scss/vars/appv1.scss';
@use '@scss/mixins/reset.scss';
@use '@scss/mixins/expandable.scss';

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

	.pool-modifications-title {
		grid-column: 1 / span all;
		grid-row: 4 / span all;
		display: grid;
		grid-template-columns: 1rem 1fr;
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem;
		margin-bottom: -0.5em;
	}

	.pool-modifications-expander {
		grid-column: 1 / span all;
		grid-row: 5 / span all;
		overflow: hidden;
		@include expandable.description($duration: 1s, $easing: ease, $open: pool-modifications-expanded);

		// The expander clips the folded Pool Modifications, and the container, which the mixin would clip too, doesn't, as
		// before the mixin: its icons sit 3px below their place in a row (`top: 3px`), and in the last row their box can
		// pass its bottom edge.
		& > .pool-modifications-container {
			overflow: visible;
		}

		&.pool-modifications-expanded {
			.pool-modifications-container {
				visibility: visible;
			}
		}
	}

	.pool-modifications-container {
		display: grid;
		font-family: 'Roboto', sans-serif;
		margin-left: 1rem;
		border-top: 1px dotted black;

		transition: visibility 1s;
		visibility: hidden;

		& > div {
			display: grid;
			grid-template-columns: 2fr 1.2fr;
			border-bottom: 1px dotted black;
			min-height: 1.2rem;

			& > span {
				padding-right: 4px;
			}

			& > div {
				border-left: 1px dotted black;
				padding-left: 0.5rem;

				a {
					position: relative;
					top: 3px;
				}
			}
		}

		a {
			display: inline-flex;
			flex-direction: row;
			flex-wrap: nowrap;
			align-items: flex-start;
			font-family: 'Genesys Symbols', sans-serif;
			margin-right: 0.2rem;
			cursor: default;

			&[data-pool-entity] > :deep(i.fas) {
				-webkit-text-stroke: 0 transparent;
				text-stroke: 0 transparent;
			}

			&[data-pool-entity='Ability'] {
				-webkit-text-stroke: 0.5px black;
				text-stroke: 0.5px black;
				color: colors.$die-ability;
			}

			&[data-pool-entity='Proficiency'] {
				-webkit-text-stroke: 0.5px black;
				text-stroke: 0.5px black;
				color: colors.$die-proficiency;
			}

			&[data-pool-entity='Boost'] {
				-webkit-text-stroke: 0.5px black;
				text-stroke: 0.5px black;
				color: colors.$die-boost;
			}

			&[data-pool-entity='Difficulty'] {
				-webkit-text-stroke: 0.5px black;
				text-stroke: 0.5px black;
				color: colors.$die-difficulty;
			}

			&[data-pool-entity='Challenge'] {
				-webkit-text-stroke: 0.5px black;
				text-stroke: 0.5px black;
				color: colors.$die-challenge;
			}

			&[data-pool-entity='Setback'] {
				-webkit-text-stroke: 0.5px black;
				text-stroke: 0.5px black;
				color: colors.$die-setback;
			}
		}

		:deep(i) {
			color: black;
			position: relative;
			font-size: 0.5em;
			top: -0.25em;
		}

		.pool-modifications-manual {
			a {
				cursor: pointer;
			}
		}

		.pool-modifications-effects {
			@include reset.input;
			input {
				height: 1em;
			}
		}
	}

	.chance-to-succeed {
		grid-column: 1 / span 2;
		grid-row: 6 / span 1;
		margin-top: 1rem;

		label {
			margin-right: 1rem;
		}
	}

	.roll-button {
		grid-column: 3 / span 1;
		grid-row: 6 / span 1;
		margin-top: 1rem;
	}
	//#endregion

	header {
		color: colors.$blue;
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2em;
	}

	.roll-button {
		color: colors.$blue;
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.25em;
	}

	.preview {
		display: grid;
		grid-template-columns: /* Pool Previews */ 1fr /* Dice Box */ auto;
		grid-template-rows: /* Positive Dice */ 1fr /* Negative Dice */ 1fr;
		gap: 0.5em;

		background: linear-gradient(to bottom, black -40%, colors.$blue 20%, colors.$blue-shade 70%, black 130%);
		border-top: 1px solid black;
		border-bottom: 1px solid black;
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
			background: color.adjust(black, $alpha: -0.75);
			border-top-left-radius: 0.5rem;
			border-bottom-left-radius: 0.5rem;
			color: white;
			padding: 0.5em;
			column-gap: 0.25em;
			align-items: center;
			justify-items: center;
			font-size: 1.25em;

			display: grid;
			grid-template-columns: repeat(3, auto);

			a {
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
					-webkit-text-stroke: 0.5px white;
					text-stroke: 0.5px white;
					color: colors.$die-difficulty;

					:deep(i) {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}

				&[data-pool-entity='Challenge'] {
					-webkit-text-stroke: 0.5px white;
					text-stroke: 0.5px white;
					color: colors.$die-challenge;

					:deep(i) {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}

				&[data-pool-entity='Setback'] {
					-webkit-text-stroke: 0.5px white;
					text-stroke: 0.5px white;
					color: colors.$die-setback;

					:deep(i) {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}
			}

			:deep(i) {
				color: white;
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
			color: white;
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
			-webkit-text-stroke: 2px black;
			text-stroke: 2px black;
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
