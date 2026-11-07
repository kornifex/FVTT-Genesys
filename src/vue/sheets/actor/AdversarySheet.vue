<script lang="ts" setup>
import { computed } from 'vue';
import type { Stored } from '@/data/Stored';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Characteristic from '@/vue/components/character/Characteristic.vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import QualityList from '@/vue/components/QualityList.vue';
import RollLink from '@/vue/components/RollLink.vue';
import SheetTabs from '@/vue/components/SheetTabs.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';
import { AdversaryDataModel, type AdversaryType } from '@/actor/data/AdversaryDataModel';
import Editor from '@/vue/components/Editor.vue';
import { GenesysItem } from '@/item/GenesysItem';
import AdversarySkills from '@/vue/components/adversary/AdversarySkills.vue';
import AttackSkillSelect from '@/vue/components/AttackSkillSelect.vue';
import { DicePrompt } from '@/app/DicePrompt';
import RowActions from '@/vue/components/RowActions.vue';
import type { RowAction } from '@/vue/components/RowAction';
import type { ContextMenuHandle } from '@/vue/components/ContextMenuHandle';
import Enriched from '@/vue/components/Enriched.vue';
import { vLocalize } from '@/vue/directives';
import Motivations from '@/vue/components/Motivations.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { CHARACTERISTICS, Characteristic as CharacteristicType, toggledSuperCharacteristics } from '@/data/Characteristics';
import { startDocumentDrag } from '@/data/DragTransferData';
import { isEmptyDescription } from '@/data/Descriptions';
import { attackSkillChoices } from '@/data/Skills';
import { talentRankChange } from '@/actor/data/AdversaryItems';
import { attackSkill, attackWith, openSheet, stepTalentRank } from '@/operations/ItemActions';
import type { StepDirection } from '@/actor/data/Inventory';
import { profileRowName, type WeaponProfile, weaponProfiles } from '@/item/WeaponProfiles';
import WeaponProfileStats from '@/vue/components/WeaponProfileStats.vue';
import ListEmpty from '@/vue/components/ListEmpty.vue';
import { EQUIPMENT_TYPES, itemsOfType } from '@/item/ItemTypes';
import type { ArmorDataModel } from '@/item/data/ArmorDataModel';

const { document: actor, system, editable } = useSheetDocument<GenesysActor<AdversaryType>>();

// The menu of each talent and ability, by id, for a right-click on its description to open it, as one on its name does.
const rowMenus = new Map<string, ContextMenuHandle>();
function rowMenu(id: string) {
	return (handle: unknown) => {
		if (handle) {
			rowMenus.set(id, handle as ContextMenuHandle);
		} else {
			rowMenus.delete(id);
		}
	};
}

const hasDescription = computed(() => !isEmptyDescription(system.value.description));

const talents = computed(() => itemsOfType(actor.value, 'talent'));
const abilities = computed(() => itemsOfType(actor.value, 'ability'));
const equipment = computed(() =>
	itemsOfType(actor.value, EQUIPMENT_TYPES).filter((i) => AdversaryDataModel.isRelevantTypeForContext('INVENTORY', i.type)),
);
const injuries = computed(() => itemsOfType(actor.value, 'injury'));
// A row for each Weapon Profile of each weapon, its main profile first, with its Attack Skill: a profile without one
// offers no attack.
const weapons = computed(() =>
	itemsOfType(actor.value, 'weapon').flatMap((item) =>
		weaponProfiles(item.system).map((profile) => ({
			item,
			profile,
			name: profileRowName(item.name, profile, game.i18n),
			skill: attackSkill(actor.value, profile),
		})),
	),
);

const { effects, addEffect } = useDocumentEffects();

const TABS = [
	{ id: 'stats', label: 'Genesys.Tabs.Data' },
	{ id: 'miscellaneous', label: 'Genesys.Tabs.Miscellaneous' },
	{ id: 'effects', label: 'Genesys.Tabs.Effects' },
];

async function rollCharacteristicCheck(characteristic: CharacteristicType) {
	await DicePrompt.promptForCharacteristicCheck(actor.value, characteristic);
}

// A talent's own actions: its Rank Up and Rank Down. A non-ranked talent offers no rank change, as on characters.
function talentActions(talent: Stored<GenesysItem<'talent'>>): RowAction[] {
	if (talentRankChange(talent, 1).action === 'refuse') {
		return [];
	}

	const step = (direction: StepDirection) => () => stepTalentRank(actor.value, talent, direction);
	return [
		{ icon: 'fas fa-circle-up', label: 'Genesys.Labels.RankUp', run: step(1) },
		{ icon: 'fas fa-circle-down', label: 'Genesys.Labels.RankDown', run: step(-1) },
	];
}

// A weapon's own action: the attack of the row's Weapon Profile, as its name rolls it, which edits nothing and stays
// on a sheet the user can't edit.
function weaponActions(weapon: Stored<GenesysItem<'weapon'>>, profile: WeaponProfile, skill: string | undefined): RowAction[] {
	return skill
		? [
				{
					icon: 'fas fa-dice-d20',
					label: 'Genesys.Labels.PerformCheck',
					edits: false,
					run: () => attackWith(actor.value, weapon, profile),
				},
			]
		: [];
}

// An adversary has no Character Creation, so it can mark and unmark super-characteristics at any time.
async function toggleSuper(characteristic: CharacteristicType) {
	const superCharacteristics = toggledSuperCharacteristics(system.value.superCharacteristics, characteristic);
	if (!superCharacteristics) {
		ui.notifications.warn('Genesys.Notifications.TooManySuperCharacteristics', { localize: true });
		return;
	}

	await actor.value.update({
		system: { superCharacteristics },
	});
}
</script>

<template>
	<div class="adversary-sheet">
		<header>
			<img :src="actor.img ?? undefined" :alt="actor.name" data-edit="img" />
			<input type="text" name="name" :value="actor.name" v-localize:aria-label="'Genesys.Labels.Name'" />
			<label class="silhouette">
				<Localized label="Genesys.Labels.Silhouette" />
				<input type="number" name="system.silhouette" :value="system.silhouette" min="0" step="1" />
			</label>
		</header>

		<SheetTabs :tabs="TABS">
			<template #stats>
				<section class="stats-tab">
					<!-- A sheet the user can't edit has nothing to show for an empty description, not even its edit toggle. -->
					<div v-if="editable || hasDescription || system.source.trim() !== ''" class="description-area">
						<div :class="['adversary-description', { empty: !hasDescription }]">
							<Editor name="system.description" />
							<Enriched class="source" :value="system.source" />
						</div>
					</div>

					<div class="characteristics-container">
						<div class="characteristics-row">
							<Characteristic
								v-for="{ characteristic, label } in CHARACTERISTICS"
								:key="characteristic"
								:label="label"
								:value="system.characteristics[characteristic]"
								:name="`system.characteristics.${characteristic}`"
								can-edit
								can-roll-characteristic-check
								@rollCharacteristicCheck="rollCharacteristicCheck(characteristic)"
								:is-super="system.superCharacteristics.has(characteristic)"
								can-mark-super
								@toggle-super="toggleSuper(characteristic)"
							/>
						</div>
					</div>

					<div class="stats-row">
						<slot name="stats" />
					</div>

					<div class="adversary-items">
						<slot name="skills">
							<AdversarySkills label="Genesys.Adversary.Skills" />
						</slot>
					</div>

					<div class="adversary-items">
						<h3><Localized label="Genesys.Adversary.Talents" /></h3>
						<div class="container">
							<ListEmpty v-if="talents.length === 0" />
							<div
								v-for="talent in talents"
								:key="talent.id"
								class="talent"
								@contextmenu="rowMenus.get(talent.id)?.open($event)"
							>
								<RowActions
									:ref="rowMenu(talent.id)"
									:document="talent"
									:actions="talentActions(talent)"
									orientation="right"
								>
									<!-- Not a label, which would pass a click anywhere on it to its first button. -->
									<span class="item-label">
										<ActionButton @click="openSheet(talent)"
											>{{ talent.name }}
											{{ talent.system.ranked === 'yes' ? talent.system.rank : null }}</ActionButton
										>
									</span>
								</RowActions>
								<Enriched class="description" v-if="talent.system.description" :value="talent.system.description" />
							</div>
						</div>
					</div>

					<div class="adversary-items">
						<h3><Localized label="Genesys.Adversary.Abilities" /></h3>
						<div class="container">
							<ListEmpty v-if="abilities.length === 0" />
							<div
								v-for="ability in abilities"
								:key="ability.id"
								class="talent"
								@contextmenu="rowMenus.get(ability.id)?.open($event)"
							>
								<RowActions :ref="rowMenu(ability.id)" :document="ability" orientation="right">
									<span class="item-label">
										<ActionButton @click="openSheet(ability)">{{ ability.name }}</ActionButton>
									</span>
								</RowActions>
								<Enriched class="description" v-if="ability.system.description" :value="ability.system.description" />
							</div>
						</div>
					</div>

					<div class="adversary-items">
						<h3><Localized label="Genesys.Adversary.Equipment" /></h3>
						<div class="container">
							<ListEmpty v-if="equipment.length === 0" />
							<!-- A row for each Weapon Profile, whose ⋮ the focus finds again by the profile. -->
							<RowActions
								v-for="{ item, profile, name, skill } in weapons"
								:key="`${item.id}-${profile.index}`"
								class="weapon"
								:document="item"
								:actions="weaponActions(item, profile, skill)"
								:focus-key="`${item.uuid}-${profile.index}`"
								orientation="right"
							>
								<!-- The name attacks with a profile that has an Attack Skill, and opens the weapon's sheet otherwise. The
								button holds the name alone: its details hold the Attack Skill's select, which a button can't. The drag
								starts on the button's wrapper, since Firefox starts none from a button. -->
								<span draggable="true" @dragstart="startDocumentDrag($event, item)"
									><RollLink
										v-if="skill"
										class="weapon-attack"
										label="Genesys.Tooltips.RollAttack"
										:label-data="{ weapon: name }"
										@roll="attackWith(actor, item, profile)"
										>{{ name }}</RollLink
									><ActionButton v-else class="weapon-name" @click="openSheet(item)">{{ name }}</ActionButton></span
								>
								(<span class="weapon-details">
									<span v-if="skill">
										<AttackSkillSelect
											:key="skill"
											:weapon="item"
											:profile-index="profile.index"
											:choices="attackSkillChoices(profile.skills)"
											:attack-skill="skill"
										/>
									</span>
									<span v-else><Localized label="Genesys.Labels.NoSkill" /></span>
									<WeaponProfileStats layout="inline" :profile="profile" :characteristics="system.characteristics" />
									<QualityList :qualities="profile.qualities" class="weapon-qualities" /> </span
								>)
							</RowActions>
							<RowActions
								v-for="item in equipment.filter((i) => i.type !== 'weapon')"
								:key="item.id"
								class="inventory-item"
								:document="item"
								orientation="right"
							>
								<!-- The drag starts on the button's wrapper, since Firefox starts none from a button. -->
								<span draggable="true" @dragstart="startDocumentDrag($event, item)">
									<ActionButton class="item-name" @click="openSheet(item)">
										{{ item.name }}

										<span v-if="item.type === 'armor'" class="soak">
											(+{{ (item.system as ArmorDataModel).soak }} <Localized label="Genesys.Labels.Soak" />)
										</span>

										<i v-if="item.type !== 'weapon'" class="fas fa-arrow-up-right-from-square"></i>
									</ActionButton>
								</span>
							</RowActions>
						</div>
					</div>
				</section>
			</template>

			<template #miscellaneous>
				<section class="motivations">
					<div class="adversary-items">
						<h3><Localized label="Genesys.Labels.CriticalInjuries" /></h3>
						<div class="container">
							<ListEmpty v-if="injuries.length === 0" />
							<div v-for="injury in injuries" :key="injury.id" class="injury">
								<RowActions :document="injury" orientation="right">
									<span class="item-label"
										><ActionButton @click="openSheet(injury)">{{ injury.name }}</ActionButton></span
									>
								</RowActions>
								<Enriched class="description" v-if="injury.system.description" :value="injury.system.description" />
							</div>
						</div>
					</div>

					<h3><Localized label="Genesys.Labels.Motivations" /></h3>
					<Motivations :motivations="system.motivations" />

					<DataRow class="data-row" label="Genesys.Labels.Source" name="system.source" :value="system.source" />
				</section>
			</template>

			<template #effects>
				<EffectsView :effects="[...effects]" @add-effect="addEffect" />
			</template>
		</SheetTabs>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/data-row.scss';
@use '@scss/mixins/headings.scss';
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

// The adversary's skills, motivations and source row are rendered by child components, which these rules reach with :deep().
.adversary-sheet {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;

	.stats-tab {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		gap: 0.5em;

		.description-area {
			display: grid;
			grid-template-rows: 1fr auto;

			.adversary-description {
				display: flex;
				flex-direction: column;

				.source {
					width: 100%;
					font-family: 'Roboto Serif', serif;
					font-style: italic;
					font-size: 0.8em;
					text-align: right;
					padding-top: 0.25rem;
					padding-right: 1.5rem;
					margin-bottom: 0.5rem;
					border-top: 1px dashed colors.$ink;

					&:empty {
						border-top: none;
					}
				}

				// An empty description takes the room of its edit toggle alone, which shows in it rather than over it, and
				// the editor's minimum height once it opens.
				&.empty {
					> .editor {
						min-height: 0;

						:deep(prose-mirror.inactive) {
							gap: 0;

							// A flex box, as the editor shows its toggle, which centres the icon.
							> button.toggle:enabled {
								display: flex;
								visibility: hidden;
								position: static;
								align-self: flex-end;
							}

							&:hover > button.toggle:enabled {
								visibility: visible;
							}
						}
					}

					> .editor:has(> prose-mirror.active) {
						min-height: 10rem;
					}

					> .source:empty {
						display: none;
					}
				}
			}
		}
	}

	.description {
		display: grid;
		grid-template-rows: 1fr;
		min-height: 2rem;
	}

	.adversary-items {
		width: 100%;
		display: flex;
		flex-direction: column;

		// A row's ⋮ is its menu's own, which :deep() reaches: it follows the row's text on its line.
		:deep(.menu-trigger) {
			margin-left: 0.2em;
		}
	}

	header {
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 0.5rem;
		align-items: center;

		img {
			grid-row: 1 / span 2;
			border: 1px solid colors.$gold;
			background: colors.alpha(colors.$gold, 0.5);
			border-radius: 1em;
			height: 3.5rem;
		}

		@include reset.input;
		input[type='text'] {
			width: 100%;
			@include headings.font;
			font-size: 2rem;
			color: colors.$text-blue;
			height: 2rem;

			&,
			&:focus {
				border-bottom: 1px solid colors.$dark-blue;
			}

			&:focus {
				font-family: 'Modesto Condensed', sans-serif;
			}
		}

		// The silhouette sits under the name, with the actor's identity rather than its combat stats.
		.silhouette {
			display: flex;
			gap: 0.5em;
			align-items: baseline;
			@include headings.font;
			color: colors.$text-blue;

			input {
				width: 3em;
				text-align: center;
				font-family: 'Roboto', sans-serif;
				border-bottom: 1px solid colors.$dark-blue;
			}
		}
	}

	.stats-row {
		display: flex;
		gap: 1em;
		align-items: center;
		justify-content: space-around;
	}

	.characteristics-container {
		display: grid;
		grid-template-columns: 1fr auto 1fr;

		.characteristics-row {
			grid-column: 2 / span 1;
		}
	}

	.characteristics-row {
		position: relative;
		display: flex;
		justify-content: center;
		gap: 3em;
		align-items: center;
		padding-bottom: 0.25rem;

		&::after {
			display: block;
			content: '';
			position: absolute;
			top: 0;
			left: -1.5rem;
			width: calc(100% + 3rem);
			height: 100%;
			background: colors.$gold;
			border-radius: 4rem;

			clip-path: polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%);
		}

		.characteristic-field {
			z-index: 1;
		}
	}

	:deep(.container) {
		padding-left: 1em;
	}

	.inventory-item {
		display: inline-flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: center;
		gap: 0.5em;

		&::after {
			display: block;
			content: ',';
			margin-right: 0.25em;
			margin-left: -0.4em;
		}

		&:last-of-type::after {
			display: none;
		}
	}

	.soak {
		padding-right: 0.2em;
	}

	// A Weapon Profile's stats are among the details, the roots of a component with several, which take no scope attribute
	// from the sheet: :deep() reaches them.
	.weapon-details > :deep(span) {
		&::after {
			display: inline;
			content: ';';
			margin-right: 0.25em;
		}

		&:last-of-type::after {
			display: none;
		}
	}

	.talent,
	.injury {
		display: grid;
		grid-template-rows: repeat(2, auto);

		.item-label {
			font-weight: bold;
		}

		.description {
			border-left: 2px solid colors.$light-blue;
			padding-left: 0.5em;
			font-size: 0.9em;
		}
	}

	.motivations {
		// An adversary's motivations share their tab with its Critical Injuries, so they start shorter, their editor filling
		// the height they take.
		:deep(.motivation .body) {
			display: grid;
			grid-template-rows: 1fr;
			min-height: 4rem;
		}

		// DataRow renders the Source row's label and input, so the row is reached with :deep(): the mixin's rules on them
		// then carry no scope attribute.
		:deep(.data-row) {
			border-top: 1px dashed colors.$ink;
			margin-top: 1rem;
			@include data-row.grid;
		}
	}
}
</style>
