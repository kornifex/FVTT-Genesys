<script lang="ts" setup>
import { inject, onMounted, ref, toRaw } from 'vue';
import { DicePromptContext, type AttackRollData, RollType, type InitiativeRollData, CALCULATE_CHANCE_WORKER_NAME } from '@/app/DicePrompt';
import { Characteristic } from '@/data/Characteristics';
import GenesysRoller from '@/dice/GenesysRoller';
import GenesysItem from '@/item/GenesysItem';
import SkillDataModel from '@/item/data/SkillDataModel';
import { RootContext } from '@/vue/SheetContext';
import Localized from '@/vue/components/Localized.vue';
import { vLocalize } from '@/vue/directives';
import MinionDataModel from '@/actor/data/MinionDataModel';
import { GenesysDice } from '@/dice';
import { DieCategory } from '@/dice/types/GenesysDie';
import { GenesysSymbol } from '@/dice/types/GenesysSymbol';
import CharacterDataModel from '@/actor/data/CharacterDataModel';
import AdversaryDataModel from '@/actor/data/AdversaryDataModel';
import GenesysActor from '@/actor/GenesysActor';
import { GenesysPoolGradeOperation } from '@/dice/types/GenesysPoolGradeOperation';
import { GenesysPoolModifications } from '@/dice/types/GenesysPoolModifications';
import { poolModificationsForCheck } from '@/effects/PoolModifications';
import {
	type DicePool,
	type DicePoolModifications,
	type DieGradeOperationName,
	type DieName,
	type SymbolName,
	buildDicePool as buildPoolFromInputs,
	compileDiceFormula,
	compileSymbolsData,
	hasSameChanceToSucceed,
	parsePoolModifications,
	sortPoolModifications,
} from '@/dice/DicePool';

type AlsoNone<T> = T | undefined;

type SimplePoolEntity = DieName | SymbolName;

type NonVehicleActorDataModel = CharacterDataModel | AdversaryDataModel;

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

const USE_UNCOUPLED_SKILLS = CONFIG.genesys.settings.uncoupleSkillsFromCharacteristics;
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
const poolModifications = ref<DicePoolModifications>({
	baseDifficulty: [],
	manualChanges: [],
	effects: [],
});
const availableSkills = ref<GenesysItem<SkillDataModel>[]>([]);
// Skills from the Skills Compendium that an adversary doesn't own; rolling one of these is an Unranked Skill Check.
// Characters own every skill they can roll, so they don't get these.
const unrankedSkills = ref<GenesysItem<SkillDataModel>[]>([]);
const selectedSkill = ref<AlsoNone<GenesysItem<SkillDataModel>>>();
const selectedCharacteristic = ref<AlsoNone<Characteristic>>();
const probabilityOfSuccess = ref<AlsoNone<string>>();

const useSuperCharacteristic = ref(false);
const showPoolModifications = ref(!CONFIG.genesys.settings.startWithCollapsedPoolModifications);

let previousDicePool: DicePool = {
	dice: {},
	symbols: {},
	usesSuperCharacteristic: false,
};

onMounted(() => {
	const actor = toRaw(context.actor);

	poolModifications.value.baseDifficulty = parsePoolModifications(context.difficulty);
	availableSkills.value = actor ? (actor.items.filter((item) => item.type === 'skill') as GenesysItem<SkillDataModel>[]).sort(sortSkillsByName) : [];

	const ownedSkillNames = new Set(availableSkills.value.map((skill) => skill.name.toLowerCase()));
	unrankedSkills.value = actor && ['minion', 'rival', 'nemesis'].includes(actor.type) ? CONFIG.genesys.skills.filter((skill) => !ownedSkillNames.has(skill.name.toLowerCase())).sort(sortSkillsByName) : [];

	if (context.skillName) {
		const skillName = context.skillName.toLowerCase();
		selectedSkill.value = [...availableSkills.value, ...unrankedSkills.value].find((skill) => skill.name.toLowerCase() === skillName) as AlsoNone<GenesysItem<SkillDataModel>>;
	}
	selectedCharacteristic.value = selectedSkill.value?.systemData.characteristic ?? context.characteristic;

	calculatePoolModificationsForSkill();
	buildDicePool();
});

function sortSkillsByName(first: GenesysItem<SkillDataModel>, second: GenesysItem<SkillDataModel>) {
	const nameA = first.name.toLowerCase();
	const nameB = second.name.toLowerCase();
	return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
}

function isSelectedSkillUnranked() {
	return !!selectedSkill.value && unrankedSkills.value.includes(selectedSkill.value);
}

function calculatePoolModificationsForSkill() {
	const [target] = game.user.targets.size === 1 ? game.user.targets : [];
	const modifications = poolModificationsForCheck(toRaw(context.actor), (target?.actor as GenesysActor | null) ?? undefined, {
		characteristic: selectedCharacteristic.value,
		skillName: selectedSkill.value?.name,
		attackRange: context.rollType === RollType.Attack ? (context.rollData as AttackRollData).weapon.systemData.range : undefined,
	});

	poolModifications.value.effects = modifications.map(({ source, from, mods }) => ({
		name:
			game.i18n.localize(source === 'self' ? 'Genesys.DicePrompt.PoolModifications.SelfEffects' : 'Genesys.DicePrompt.PoolModifications.TargetEffects') +
			('effect' in from ? from.effect : game.i18n.localize(`Genesys.Labels.${from.defense.capitalize()}Defense`)),
		enabled: CONFIG.genesys.settings.autoApplyPoolModifications,
		mods,
	}));
}

function buildDicePool() {
	const actor = context.actor as AlsoNone<GenesysActor<NonVehicleActorDataModel>>;
	let characteristicValue = 0;
	let skillValue = 0;
	let usesSuperCharacteristic = USE_SUPER_CHARACTERISTICS;

	// The characteristic and the skill feed Step 1 of building the dice pool.
	if (actor) {
		characteristicValue = selectedCharacteristic.value ? actor.systemData.characteristics[selectedCharacteristic.value] : 0;
		const isUnranked = isSelectedSkillUnranked();
		skillValue = isUnranked ? 0 : selectedSkill.value?.systemData.rank ?? 0;

		if (actor.type === 'minion' && selectedSkill.value && !isUnranked) {
			skillValue = (actor.systemData as MinionDataModel).groupSkillRank;
		}

		usesSuperCharacteristic &&= !!selectedCharacteristic.value && actor.systemData.superCharacteristics.has(selectedCharacteristic.value);
	} else {
		usesSuperCharacteristic &&= useSuperCharacteristic.value;
	}

	currentDicePool.value = buildPoolFromInputs({
		characteristicValue,
		skillRank: skillValue,
		usesSuperCharacteristic,
		modifications: poolModifications.value,
	});

	approximateProbability();
}

async function approximateProbability() {
	if (!USE_CHANCE_TO_SUCCEED) {
		return;
	}

	const dicePool = currentDicePool.value;
	const obsoleteDicePool = previousDicePool;
	previousDicePool = dicePool;

	// Slight optimization for a pool without dice.
	if (Object.values(dicePool.dice).reduce((accum, amount) => accum + amount) === 0) {
		const totalSuccesses = (dicePool.symbols.Success ?? 0) + (dicePool.symbols.Triumph ?? 0);
		const totalFailures = (dicePool.symbols.Failure ?? 0) + (dicePool.symbols.Despair ?? 0);
		const deterministicResult = totalSuccesses > totalFailures ? 100 : 0;
		probabilityOfSuccess.value = deterministicResult.toFixed(2);
		return;
	}

	// No need to run this process again if nothing of importance has changed.
	if (hasSameChanceToSucceed(obsoleteDicePool, dicePool)) {
		return;
	}

	let chanceToSucceed = 0;
	if (USE_CHANCE_TO_SUCCEED_BY_PERMUTATION) {
		const worker = game.workers.get(CALCULATE_CHANCE_WORKER_NAME);
		if (!worker) {
			probabilityOfSuccess.value = undefined;
			return;
		}

		const rawDicePool = toRaw(dicePool);
		chanceToSucceed = (await worker.executeFunction('calculateChanceForDicePool', [
			{
				dicePool: rawDicePool.dice,
				extraSymbols: rawDicePool.symbols,
				criteriaType: 'SUCCESS',
			},
		])) as number;
	} else {
		const formula = compileDiceFormula(currentDicePool.value);
		const symbols = { symbols: compileSymbolsData(currentDicePool.value) };
		const simulation = await Promise.all(
			[...Array(CHANCE_TO_SUCCEED_BY_SIMULATION_NUM_ROLLS)].map(async () => {
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
	selectedSkill.value = (availableSkills.value.find((s) => s.id === selectedOption.value) ?? unrankedSkills.value.find((s) => s.id === selectedOption.value)) as AlsoNone<GenesysItem<SkillDataModel>>;
	selectedCharacteristic.value = selectedSkill.value?.systemData.characteristic;

	calculatePoolModificationsForSkill();
	buildDicePool();
}

function onCharacteristicChange(event: Event) {
	const selectedOption = event.currentTarget as HTMLSelectElement;
	selectedCharacteristic.value = selectedOption.value !== '-' ? (selectedOption.value as Characteristic) : undefined;

	buildDicePool();
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
	poolModifications.value.manualChanges.push(`${isRemoval ? '-' : ''}${GenesysDice[dieName].GLYPH}`);
	poolModifications.value.manualChanges.sort(sortPoolModifications);
	buildDicePool();
}

function addSymbolOperation(symbolName: SymbolName, isRemoval: boolean = false) {
	poolModifications.value.manualChanges.push(`${isRemoval ? '-' : ''}${GenesysSymbol[symbolName].GLYPH}`);
	poolModifications.value.manualChanges.sort(sortPoolModifications);
	buildDicePool();
}

function addPoolOperation(operationName: DieGradeOperationName) {
	poolModifications.value.manualChanges.push(GenesysPoolGradeOperation[operationName].GLYPH);
	poolModifications.value.manualChanges.sort(sortPoolModifications);
	buildDicePool();
}

function removeManualChange(index: number) {
	poolModifications.value.manualChanges.splice(index, 1);
	buildDicePool();
}

async function rollPool() {
	const formula = compileDiceFormula(currentDicePool.value);
	const symbols = compileSymbolsData(currentDicePool.value);
	const baseRollData = {
		actor: toRaw(context.actor),
		characteristic: selectedCharacteristic.value,
		usesSuperCharacteristic: currentDicePool.value.usesSuperCharacteristic,
		skillName: selectedSkill.value?.name,
		formula,
		symbols,
	};

	switch (context.rollType) {
		case RollType.Attack:
			await GenesysRoller.attackRoll({
				...baseRollData,
				weapon: (context.rollData as AttackRollData).weapon,
			});
			break;

		case RollType.Initiative:
			(context.rollData as InitiativeRollData).resolvePromise({
				roll: new Roll(formula, { symbols }),
				// Without a skill, initiative is a Characteristic Check.
				skillName: selectedSkill.value?.name ?? (selectedCharacteristic.value ? game.i18n.localize(`Genesys.Characteristics.${selectedCharacteristic.value.capitalize()}`) : ''),
			});
			break;

		default:
			await GenesysRoller.skillRoll(baseRollData);
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
					<div v-for="index in amount" :key="`${dieName}-${index}`" @click="addDiceOperation(dieName as DieName, true)" :class="`die die-${dieName}`">
						{{ GenesysDice[dieName as DieName].GLYPH }}
					</div>
				</template>
				<template v-for="[symbolName, amount] in getOrderedSymbols('positive')" :key="symbolName">
					<div v-for="index in amount" :key="`${symbolName}-${index}`" @click="addSymbolOperation(symbolName as SymbolName, true)" class="symbol">
						{{ GenesysSymbol[symbolName as SymbolName].GLYPH }}
					</div>
				</template>
			</div>

			<!-- Negative Pool -->
			<div class="negative">
				<template v-for="[dieName, amount] in getOrderedDice('negative')" :key="dieName">
					<div v-for="index in amount" :key="`${dieName}-${index}`" @click="addDiceOperation(dieName as DieName, true)" :class="`die die-${dieName}`">
						{{ GenesysDice[dieName as DieName].GLYPH }}
					</div>
				</template>
				<template v-for="[symbolName, amount] in getOrderedSymbols('negative')" :key="symbolName">
					<div v-for="index in amount" :key="`${symbolName}-${index}`" @click="addSymbolOperation(symbolName as SymbolName, true)" class="symbol">
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
			<select name="characteristic" :value="selectedCharacteristic ?? '-'" :disabled="selectedSkill && !USE_UNCOUPLED_SKILLS" @change="onCharacteristicChange">
				<option value="-">—</option>
				<option v-for="[charLabel, charValue] in Object.entries(Characteristic)" :key="charValue" :value="charValue"><Localized :label="`Genesys.Characteristics.${charLabel}`" /></option>
			</select>

			<!-- Skill Selection -->
			<select name="skill" :value="selectedSkill?.id ?? '-'" @change="onSkillChange">
				<option value="-">—</option>
				<option v-for="skill in availableSkills" :key="skill.id" :value="skill.id">{{ skill.name }} (<Localized :label="`Genesys.CharacteristicAbbr.${skill.systemData.characteristic.capitalize()}`" />)</option>
				<optgroup v-if="unrankedSkills.length > 0" v-localize:label="'Genesys.DicePrompt.UnrankedSkills'">
					<option v-for="skill in unrankedSkills" :key="skill.id" :value="skill.id">{{ skill.name }} (<Localized :label="`Genesys.CharacteristicAbbr.${skill.systemData.characteristic.capitalize()}`" />)</option>
				</optgroup>
			</select>
		</div>

		<div v-else-if="USE_SUPER_CHARACTERISTICS" class="super-characteristic-row">
			<input type="checkbox" v-model="useSuperCharacteristic" @change="buildDicePool()" />
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
						<a v-for="(modification, index) in poolModifications.baseDifficulty" :key="index" :data-pool-entity="GenesysPoolModifications[modification].icon.baseName">
							{{ GenesysPoolModifications[modification].icon.baseGlyph }}<i :class="`fas ${GenesysPoolModifications[modification].icon.operator}`"></i>
						</a>
					</div>
				</div>
				<div class="pool-modifications-manual">
					<span><Localized label="Genesys.DicePrompt.PoolModifications.ManualChanges" /></span>
					<div>
						<a v-for="(modification, index) in poolModifications.manualChanges" :key="index" @click="removeManualChange(index)" :data-pool-entity="GenesysPoolModifications[modification].icon.baseName">
							{{ GenesysPoolModifications[modification].icon.baseGlyph }}<i :class="`fas ${GenesysPoolModifications[modification].icon.operator}`"></i>
						</a>
					</div>
				</div>
				<div v-for="(effect, index) in poolModifications.effects" :key="index" class="pool-modifications-effects">
					<span>
						<input type="checkbox" v-model="effect.enabled" @change="buildDicePool()" />
						<label>{{ '\xa0' + effect.name }}</label>
					</span>
					<div>
						<a v-for="(modification, index) in effect.mods" :key="index" :data-pool-entity="GenesysPoolModifications[modification].icon.baseName">
							{{ GenesysPoolModifications[modification].icon.baseGlyph }}<i :class="`fas ${GenesysPoolModifications[modification].icon.operator}`"></i>
						</a>
					</div>
				</div>
			</div>
		</div>

		<div v-if="USE_CHANCE_TO_SUCCEED" class="chance-to-succeed">
			<label>
				<i class="fas fa-circle-info" :data-tooltip="`Genesys.DicePrompt.ChanceToSucceedBy${USE_CHANCE_TO_SUCCEED_BY_PERMUTATION ? 'Permutation' : 'Simulation'}Disclaimer`"></i>
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
@use '@scss/vars/colors.scss';
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
			background: transparentize(black, 0.75);
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
