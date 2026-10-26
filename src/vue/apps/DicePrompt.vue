<script lang="ts" setup>
import { computed, inject, onMounted, ref, shallowRef, toRaw } from 'vue';
import { DicePromptContext, type AttackRollData, RollType, type InitiativeRollData } from '@/app/DicePrompt';
import { chanceToSucceed as countChanceToSucceed } from '@/dice/ChanceToSucceed';
import { chanceToSucceedInWorker } from '@/dice/chanceToSucceedInWorker';
import { CHARACTERISTIC_ABBREVIATIONS, CHARACTERISTICS, Characteristic } from '@/data/Characteristics';
import { GenesysRoller } from '@/dice/GenesysRoller';
import { GenesysItem } from '@/item/GenesysItem';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { RootContext } from '@/vue/SheetContext';
import Localized from '@/vue/components/Localized.vue';
import { vLocalize } from '@/vue/directives';
import { GenesysDice } from '@/dice';
import { DieCategory } from '@/dice/dice/GenesysDie';
import { GenesysSymbol } from '@/dice/GenesysSymbol';
import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysPoolGradeOperation } from '@/dice/GenesysPoolGradeOperation';
import { GenesysPoolModifications } from '@/dice/GenesysPoolModifications';
import { promptSkills } from '@/data/Skills';
import {
	type Check,
	type CheckPoolModification,
	type CheckRequest,
	canPickCharacteristic,
	canRollWithoutCharacteristic,
	checkDicePool,
	resolveCheck,
	worldCheckRules,
} from '@/dice/Check';
import {
	type DicePool,
	type DieGradeOperationName,
	type DieName,
	type SymbolName,
	compileDiceFormula,
	compileSymbolsData,
	hasSameChanceToSucceed,
	parsePoolModifications,
	sortPoolModifications,
} from '@/dice/DicePool';

type AlsoNone<T> = T | undefined;

type SimplePoolEntity = DieName | SymbolName;

type PromptSkill = GenesysItem<SkillDataModel>;

const SORT_ORDER: Record<SimplePoolEntity, number> = {
	Proficiency: 0,
	Ability: 1,
	Boost: 2,

	Success: 3,
	Triumph: 4,
	Advantage: 5,

	Challenge: 0,
	Difficulty: 1,
	Setback: 2,

	Failure: 3,
	Despair: 4,
	Threat: 5,
};

const USE_SUPER_CHARACTERISTICS = CONFIG.genesys.settings.useSuperCharacteristics;
const CHANCE_TO_SUCCEED_BY_SIMULATION_NUM_ROLLS = CONFIG.genesys.settings.showChanceToSucceedFromSimulations.amountOfRolls;
const USE_CHANCE_TO_SUCCEED_BY_PERMUTATION = CONFIG.genesys.settings.showChanceToSucceedFromPermutations;
const USE_CHANCE_TO_SUCCEED = USE_CHANCE_TO_SUCCEED_BY_PERMUTATION || CONFIG.genesys.settings.showChanceToSucceedFromSimulations.enabled;

const context = inject<DicePromptContext>(RootContext)!;

const currentDicePool = ref<DicePool>({
	dice: {},
	symbols: {},
	usesSuperCharacteristic: false,
});
const check = shallowRef<Check<PromptSkill>>();
const baseDifficulty = parsePoolModifications(context.difficulty);
const manualChanges = ref<string[]>([]);
// The Pool Modifications of the check, each turned on or off by the roller.
const effects = ref<{ key: string; name: string; enabled: boolean; mods: string[] }[]>([]);
// The skills the attacking weapon lists, offered first and only there.
const weaponSkills = ref<PromptSkill[]>([]);
const availableSkills = ref<PromptSkill[]>([]);
// Skills from the Skills Compendium that the actor doesn't own; rolling one of these is an Unranked Skill Check.
const unrankedSkills = ref<PromptSkill[]>([]);
const selectedSkill = ref<AlsoNone<PromptSkill>>();
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
	const actor = toRaw(context.actor);

	if (actor) {
		const weapon = context.rollType === RollType.Attack ? (context.rollData as AttackRollData).weapon : undefined;
		// A vehicle weapon's attack is rolled by a crew member for their role, not with an Attack Skill.
		const skills = promptSkills(actor.skills, CONFIG.genesys.skills, weapon?.type === 'weapon' ? weapon.systemData.skills : []);
		weaponSkills.value = skills.weapon;
		availableSkills.value = skills.owned;
		unrankedSkills.value = skills.unranked;
	}

	resolve({ skillName: context.skillName, fallbackCharacteristic: context.characteristic });
});

/**
 * Resolve the check again for the skill and characteristic asked for. The Pool Modifications still listed keep their
 * state, new ones follow the world setting.
 */
function resolve(request: CheckRequest<PromptSkill>) {
	const [target] = context.rollType !== RollType.Initiative && game.user.targets.size === 1 ? game.user.targets : [];
	const resolved = resolveCheck(
		toRaw(context.actor),
		{
			...request,
			// Initiative never has a target.
			target: (target?.actor as GenesysActor | null) ?? undefined,
			attackRange: context.rollType === RollType.Attack ? (context.rollData as AttackRollData).weapon.systemData.range : undefined,
			usesSuperCharacteristic: useSuperCharacteristic.value,
		},
		worldCheckRules(),
	);

	const enabledByKey = new Map(effects.value.map((effect) => [effect.key, effect.enabled]));
	effects.value = resolved.poolModifications.map((modification) => ({
		key: modification.key,
		name: poolModificationName(modification),
		enabled: enabledByKey.get(modification.key) ?? CONFIG.genesys.settings.autoApplyPoolModifications,
		mods: modification.mods,
	}));

	check.value = resolved;
	selectedSkill.value = resolved.skill;
	selectedCharacteristic.value = resolved.characteristic;

	buildDicePool();
}

function poolModificationName({ source, from }: CheckPoolModification) {
	return (
		game.i18n.localize(
			source === 'self' ? 'Genesys.DicePrompt.PoolModifications.SelfEffects' : 'Genesys.DicePrompt.PoolModifications.TargetEffects',
		) + ('effect' in from ? from.effect : game.i18n.localize(`Genesys.Labels.${from.defense.capitalize()}Defense`))
	);
}

function buildDicePool() {
	const enabledKeys = new Set(effects.value.filter((effect) => effect.enabled).map((effect) => effect.key));
	currentDicePool.value = checkDicePool(check.value!, {
		difficulty: context.difficulty,
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

	// A pool without dice is counted at once, without a worker or a simulation.
	if (Object.values(dicePool.dice).reduce((accum, amount) => accum + amount) === 0) {
		probabilityOfSuccess.value = (countChanceToSucceed(toRaw(dicePool)) * 100).toFixed(2);
		return;
	}

	// No need to run this process again if nothing of importance has changed.
	if (hasSameChanceToSucceed(obsoleteDicePool, dicePool)) {
		return;
	}

	let chanceToSucceed: number;
	if (USE_CHANCE_TO_SUCCEED_BY_PERMUTATION) {
		const { dice, symbols } = toRaw(dicePool);
		chanceToSucceed = await chanceToSucceedInWorker({ dice, symbols });
	} else {
		const formula = compileDiceFormula(currentDicePool.value);
		const symbols = { symbols: compileSymbolsData(currentDicePool.value) };
		const simulation = await Promise.all(
			Array.from({ length: CHANCE_TO_SUCCEED_BY_SIMULATION_NUM_ROLLS }, async () => {
				const roll = new Roll(formula, symbols);
				const result = await roll.evaluate();
				return GenesysRoller.parseRollResults(result);
			}),
		);
		const successfulRolls = simulation.filter((roll) => roll.netSuccess > 0);
		chanceToSucceed = successfulRolls.length / simulation.length;
	}

	probabilityOfSuccess.value = (Math.round(chanceToSucceed * 10000) / 100).toFixed(2);
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

function getOrderedDice(category: DieCategory) {
	return Object.entries(currentDicePool.value.dice)
		.filter(([dieName]) => GenesysDice[dieName as DieName].CATEGORY === category)
		.sort(([left], [right]) => SORT_ORDER[left as DieName] - SORT_ORDER[right as DieName]);
}

function getOrderedSymbols(category: DieCategory) {
	return Object.entries(currentDicePool.value.symbols)
		.filter(([symbolName]) => GenesysSymbol[symbolName as SymbolName].CATEGORY === category)
		.sort(([left], [right]) => SORT_ORDER[left as SymbolName] - SORT_ORDER[right as SymbolName]);
}

function addDiceOperation(dieName: DieName, isRemoval: boolean = false) {
	manualChanges.value.push(`${isRemoval ? '-' : ''}${GenesysDice[dieName].GLYPH}`);
	manualChanges.value.sort(sortPoolModifications);
	buildDicePool();
}

function addSymbolOperation(symbolName: SymbolName, isRemoval: boolean = false) {
	manualChanges.value.push(`${isRemoval ? '-' : ''}${GenesysSymbol[symbolName].GLYPH}`);
	manualChanges.value.sort(sortPoolModifications);
	buildDicePool();
}

function addPoolOperation(operationName: DieGradeOperationName) {
	manualChanges.value.push(GenesysPoolGradeOperation[operationName].GLYPH);
	manualChanges.value.sort(sortPoolModifications);
	buildDicePool();
}

function removeManualChange(index: number) {
	manualChanges.value.splice(index, 1);
	buildDicePool();
}

async function rollPool() {
	const checkRoll = { check: check.value!, dicePool: toRaw(currentDicePool.value) };

	switch (context.rollType) {
		case RollType.Attack:
			await GenesysRoller.attackRoll({
				...checkRoll,
				weapon: (context.rollData as AttackRollData).weapon,
			});
			break;

		case RollType.Initiative:
			(context.rollData as InitiativeRollData).resolvePromise(checkRoll);
			break;

		default:
			await GenesysRoller.skillRoll(checkRoll);
	}

	await context.app.close();
}
</script>

<template>
	<div class="genesys dice-prompt">
		<!-- Header Text -->
		<header>
			<span class="hint"><Localized label="Genesys.DicePrompt.Hint" /></span>
		</header>

		<!-- Dice Pool Preview -->
		<div class="preview">
			<!-- Positive Pool -->
			<div class="positive">
				<template v-for="[dieName, amount] in getOrderedDice('positive')" :key="dieName">
					<div
						v-for="index in amount"
						:key="`${dieName}-${index}`"
						@click="addDiceOperation(dieName as DieName, true)"
						:class="`die die-${dieName}`"
					>
						{{ GenesysDice[dieName as DieName].GLYPH }}
					</div>
				</template>
				<template v-for="[symbolName, amount] in getOrderedSymbols('positive')" :key="symbolName">
					<div
						v-for="index in amount"
						:key="`${symbolName}-${index}`"
						@click="addSymbolOperation(symbolName as SymbolName, true)"
						class="symbol"
					>
						{{ GenesysSymbol[symbolName as SymbolName].GLYPH }}
					</div>
				</template>
			</div>

			<!-- Negative Pool -->
			<div class="negative">
				<template v-for="[dieName, amount] in getOrderedDice('negative')" :key="dieName">
					<div
						v-for="index in amount"
						:key="`${dieName}-${index}`"
						@click="addDiceOperation(dieName as DieName, true)"
						:class="`die die-${dieName}`"
					>
						{{ GenesysDice[dieName as DieName].GLYPH }}
					</div>
				</template>
				<template v-for="[symbolName, amount] in getOrderedSymbols('negative')" :key="symbolName">
					<div
						v-for="index in amount"
						:key="`${symbolName}-${index}`"
						@click="addSymbolOperation(symbolName as SymbolName, true)"
						class="symbol"
					>
						{{ GenesysSymbol[symbolName as SymbolName].GLYPH }}
					</div>
				</template>
			</div>

			<!-- Dice Box -->
			<div class="dice-box">
				<!-- Add Positive Dice -->
				<a @click="addDiceOperation('Ability')" data-pool-entity="Ability">A<i class="fas fa-plus"></i></a>
				<a @click="addDiceOperation('Proficiency')" data-pool-entity="Proficiency">P<i class="fas fa-plus"></i></a>
				<a @click="addDiceOperation('Boost')" data-pool-entity="Boost">B<i class="fas fa-plus"></i></a>

				<!-- Upgrade/Downgrade Positive Dice -->
				<a @click="addPoolOperation('UpgradeAbility')" data-pool-entity="Ability">A<i class="fas fa-arrow-up"></i></a>
				<a @click="addPoolOperation('DowngradeAbility')" data-pool-entity="Proficiency">P<i class="fas fa-arrow-down"></i></a>
				<span />

				<!-- Add Negative Dice -->
				<a @click="addDiceOperation('Difficulty')" data-pool-entity="Difficulty">D<i class="fas fa-plus"></i></a>
				<a @click="addDiceOperation('Challenge')" data-pool-entity="Challenge">C<i class="fas fa-plus"></i></a>
				<a @click="addDiceOperation('Setback')" data-pool-entity="Setback">S<i class="fas fa-plus"></i></a>

				<!-- Upgrade/Downgrade Negative Dice -->
				<a @click="addPoolOperation('UpgradeDifficulty')" data-pool-entity="Difficulty">D<i class="fas fa-arrow-up"></i></a>
				<a @click="addPoolOperation('DowngradeDifficulty')" data-pool-entity="Challenge">C<i class="fas fa-arrow-down"></i></a>
				<span />

				<!-- Add Positive Symbols -->
				<a @click="addSymbolOperation('Advantage')">a<i class="fas fa-plus"></i></a>
				<a @click="addSymbolOperation('Success')">s<i class="fas fa-plus"></i></a>
				<a @click="addSymbolOperation('Triumph')">t<i class="fas fa-plus"></i></a>

				<!-- Add Negative Symbols -->
				<a @click="addSymbolOperation('Threat')">h<i class="fas fa-plus"></i></a>
				<a @click="addSymbolOperation('Failure')">f<i class="fas fa-plus"></i></a>
				<a @click="addSymbolOperation('Despair')">d<i class="fas fa-plus"></i></a>
			</div>
		</div>

		<div v-if="context.actor" class="characteristic-skill-row">
			<!-- Characteristic Selection -->
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

			<!-- Skill Selection -->
			<select name="skill" :value="selectedSkill?.id ?? '-'" @change="onSkillChange">
				<option value="-">—</option>
				<optgroup v-if="weaponSkills.length > 0" v-localize:label="'Genesys.DicePrompt.WeaponSkills'">
					<!-- prettier-ignore -->
					<option v-for="skill in weaponSkills" :key="skill.id" :value="skill.id">{{ skill.name }} (<Localized :label="CHARACTERISTIC_ABBREVIATIONS[skill.systemData.characteristic]" />)</option>
				</optgroup>
				<!-- prettier-ignore -->
				<option v-for="skill in availableSkills" :key="skill.id" :value="skill.id">{{ skill.name }} (<Localized :label="CHARACTERISTIC_ABBREVIATIONS[skill.systemData.characteristic]" />)</option>
				<optgroup v-if="unrankedSkills.length > 0" v-localize:label="'Genesys.DicePrompt.UnrankedSkills'">
					<!-- prettier-ignore -->
					<option v-for="skill in unrankedSkills" :key="skill.id" :value="skill.id">{{ skill.name }} (<Localized :label="CHARACTERISTIC_ABBREVIATIONS[skill.systemData.characteristic]" />)</option>
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
						<a
							v-for="(modification, index) in baseDifficulty"
							:key="index"
							:data-pool-entity="GenesysPoolModifications[modification].icon.baseName"
						>
							{{ GenesysPoolModifications[modification].icon.baseGlyph
							}}<i :class="`fas ${GenesysPoolModifications[modification].icon.operator}`"></i>
						</a>
					</div>
				</div>
				<div class="pool-modifications-manual">
					<span><Localized label="Genesys.DicePrompt.PoolModifications.ManualChanges" /></span>
					<div>
						<a
							v-for="(modification, index) in manualChanges"
							:key="index"
							@click="removeManualChange(index)"
							:data-pool-entity="GenesysPoolModifications[modification].icon.baseName"
						>
							{{ GenesysPoolModifications[modification].icon.baseGlyph
							}}<i :class="`fas ${GenesysPoolModifications[modification].icon.operator}`"></i>
						</a>
					</div>
				</div>
				<div v-for="effect in effects" :key="effect.key" class="pool-modifications-effects">
					<span>
						<input type="checkbox" v-model="effect.enabled" @change="buildDicePool()" />
						<label>{{ '\xa0' + effect.name }}</label>
					</span>
					<div>
						<a
							v-for="(modification, index) in effect.mods"
							:key="index"
							:data-pool-entity="GenesysPoolModifications[modification].icon.baseName"
						>
							{{ GenesysPoolModifications[modification].icon.baseGlyph
							}}<i :class="`fas ${GenesysPoolModifications[modification].icon.operator}`"></i>
						</a>
					</div>
				</div>
			</div>
		</div>

		<div v-if="USE_CHANCE_TO_SUCCEED" class="chance-to-succeed">
			<label>
				<i
					class="fas fa-circle-info"
					:data-tooltip="`Genesys.DicePrompt.ChanceToSucceedBy${USE_CHANCE_TO_SUCCEED_BY_PERMUTATION ? 'Permutation' : 'Simulation'}Disclaimer`"
				></i>
				{{ '\xa0' }}
				<Localized label="Genesys.DicePrompt.ChanceToSucceed" />
			</label>

			<i v-if="!probabilityOfSuccess" class="fas fa-spinner fa-spin"></i>
			<span v-else>{{ probabilityOfSuccess }}%</span>
		</div>

		<!-- Roll Button -->
		<button class="roll-button" @click.prevent="rollPool"><Localized label="Genesys.DicePrompt.Roll" /></button>
	</div>
</template>

<style lang="scss">
@use '@scss/mixins/backgrounds.scss';

.app-dice-prompt {
	min-width: 500px;
	min-height: 300px;

	.window-content {
		@include backgrounds.crossboxes();
	}
}
</style>

<style lang="scss" scoped>
@use 'sass:color';
@use '@scss/vars/colors.scss';
@use '@scss/vars/appv1.scss';
@use '@scss/vars/sheet.scss';
@use '@scss/mixins/reset.scss';

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
		display: grid;
		grid-template-rows: 0fr;
		overflow: hidden;
		transition: grid-template-rows 1s;

		&.pool-modifications-expanded {
			grid-template-rows: 1fr;

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

		min-height: 0;
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

			&[data-pool-entity] > i.fas {
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

		i {
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

					i {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}

				&[data-pool-entity='Challenge'] {
					-webkit-text-stroke: 0.5px white;
					text-stroke: 0.5px white;
					color: colors.$die-challenge;

					i {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}

				&[data-pool-entity='Setback'] {
					-webkit-text-stroke: 0.5px white;
					text-stroke: 0.5px white;
					color: colors.$die-setback;

					i {
						-webkit-text-stroke: 0 transparent;
						text-stroke: 0 transparent;
					}
				}
			}

			i {
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

			// Ability & Difficulty Die
			&.die-Ability {
				color: colors.$die-ability;
			}

			&.die-Difficulty {
				color: colors.$die-difficulty;
			}

			// Proficiency Die
			&.die-Proficiency {
				color: colors.$die-proficiency;
			}

			&.die-Challenge {
				color: colors.$die-challenge;
			}

			// Boost Die
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
