<script lang="ts" setup>
import { computed } from 'vue';
import type { Stored } from '@/data/Stored';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import Characteristic from '@/vue/components/character/Characteristic.vue';
import Localized from '@/vue/components/Localized.vue';
import QualityList from '@/vue/components/QualityList.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';
import { AdversaryDataModel, type AdversaryType } from '@/actor/data/AdversaryDataModel';
import Editor from '@/vue/components/Editor.vue';
import { GenesysItem } from '@/item/GenesysItem';
import AdversarySkills from '@/vue/components/adversary/AdversarySkills.vue';
import AttackSkillSelect from '@/vue/components/AttackSkillSelect.vue';
import { DicePrompt } from '@/app/DicePrompt';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';
import Enriched from '@/vue/components/Enriched.vue';
import Motivations from '@/vue/components/Motivations.vue';
import DataRow from '@/vue/components/DataRow.vue';
import { CHARACTERISTICS, Characteristic as CharacteristicType, toggledSuperCharacteristics } from '@/data/Characteristics';
import { startDocumentDrag } from '@/data/DragTransferData';
import { attackSkillChoices } from '@/data/Skills';
import { talentRankChange } from '@/actor/data/AdversaryItems';
import { attackSkill, attackWith, deleteItem, openSheet, sendToChat, stepTalentRank } from '@/operations/ItemActions';
import type { StepDirection } from '@/actor/data/Inventory';
import { RANGE_LABELS, weaponDamage } from '@/item/Weapons';
import { EQUIPMENT_TYPES, itemsOfType } from '@/item/ItemTypes';
import type { ArmorDataModel } from '@/item/data/ArmorDataModel';

const { document: actor, system, editable } = useSheetDocument<GenesysActor<AdversaryType>>();

const hasDescription = computed(() => system.value.description.trim() !== '');

const talents = computed(() => itemsOfType(actor.value, 'talent'));
const abilities = computed(() => itemsOfType(actor.value, 'ability'));
const equipment = computed(() =>
	itemsOfType(actor.value, EQUIPMENT_TYPES).filter((i) => AdversaryDataModel.isRelevantTypeForContext('INVENTORY', i.type)),
);
const injuries = computed(() => itemsOfType(actor.value, 'injury'));
// The weapons, each with its Attack Skill: a weapon without one offers no attack.
const weapons = computed(() =>
	itemsOfType(actor.value, 'weapon').map((item) => ({
		item,
		skill: attackSkill(actor.value, item),
	})),
);

const { effects, addEffect } = useDocumentEffects();

async function rollCharacteristicCheck(characteristic: CharacteristicType) {
	await DicePrompt.promptForCharacteristicCheck(actor.value, characteristic);
}

// A non-ranked talent offers no rank change, as on characters.
function canChangeTalentRank(talent: Stored<GenesysItem<'talent'>>) {
	return talentRankChange(talent, 1).action !== 'refuse';
}

async function changeTalentRank(talent: Stored<GenesysItem<'talent'>>, direction: StepDirection) {
	await stepTalentRank(actor.value, talent, direction);
}

function damageForWeapon(weapon: GenesysItem<'weapon'>) {
	return weaponDamage(weapon.system, system.value.characteristics);
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
			<input type="text" name="name" :value="actor.name" />
		</header>

		<nav class="sheet-tabs" data-group="primary">
			<div class="spacer"></div>

			<a class="item" data-tab="stats"><Localized label="Genesys.Tabs.Data" /></a>
			<a class="item" data-tab="miscellaneous"><Localized label="Genesys.Tabs.Miscellaneous" /></a>
			<a class="item" data-tab="effects"><Localized label="Genesys.Tabs.Effects" /></a>

			<div class="spacer"></div>
		</nav>

		<section class="sheet-body">
			<div class="tab" data-tab="stats">
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
						<span class="header"><Localized label="Genesys.Adversary.Talents" />:</span>
						<div class="container">
							<Localized v-if="talents.length === 0" label="Genesys.Adversary.None" />
							<div v-for="talent in talents" :key="talent.id" class="talent">
								<ContextMenu :disable-menu="!editable">
									<template v-slot:menu-items>
										<template v-if="canChangeTalentRank(talent)">
											<MenuItem
												icon="fas fa-circle-up"
												label="Genesys.Labels.RankUp"
												@click="changeTalentRank(talent, 1)"
											/>

											<MenuItem
												icon="fas fa-circle-down"
												label="Genesys.Labels.RankDown"
												@click="changeTalentRank(talent, -1)"
											/>
										</template>

										<MenuItem icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(talent)" />

										<MenuItem icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(talent)" />
									</template>

									<label>
										<a @click="openSheet(talent)"
											>{{ talent.name }} {{ talent.system.ranked === 'yes' ? talent.system.rank : null }}</a
										>
										<a class="send-to-chat-link" @click="sendToChat(talent, actor)"><i class="fas fa-comment"></i></a>
									</label>
								</ContextMenu>
								<Enriched class="description" v-if="talent.system.description" :value="talent.system.description" />
							</div>
						</div>
					</div>

					<div class="adversary-items">
						<span class="header"><Localized label="Genesys.Adversary.Abilities" />:</span>
						<div class="container">
							<Localized v-if="abilities.length === 0" label="Genesys.Adversary.None" />
							<div v-for="ability in abilities" :key="ability.id" class="talent">
								<ContextMenu :disable-menu="!editable">
									<template v-slot:menu-items>
										<MenuItem icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(ability)" />
									</template>

									<label>
										<a @click="openSheet(ability)">{{ ability.name }}</a>
										<a class="send-to-chat-link" @click="sendToChat(ability, actor)"><i class="fas fa-comment"></i></a>
									</label>
								</ContextMenu>
								<Enriched class="description" v-if="ability.system.description" :value="ability.system.description" />
							</div>
						</div>
					</div>

					<div class="adversary-items">
						<span class="header"><Localized label="Genesys.Adversary.Equipment" />:</span>
						<div class="container">
							<Localized v-if="equipment.length === 0" label="Genesys.Adversary.None" />
							<ContextMenu v-for="{ item, skill } in weapons" :key="item.id" class="weapon">
								<template v-slot:menu-items>
									<MenuItem icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(item)" />

									<MenuItem
										v-if="skill"
										icon="fas fa-dice-d20"
										label="Genesys.Labels.PerformCheck"
										@click="attackWith(actor, item)"
									/>

									<MenuItem icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(item)" />
								</template>

								<a @click="attackWith(actor, item)" draggable="true" @dragstart="startDocumentDrag($event, item)">
									<i class="fas fa-dice-d20"></i>
									{{ item.name }}
									(<span class="weapon-details">
										<span v-if="skill">
											<AttackSkillSelect
												:key="skill"
												:weapon="item"
												:choices="attackSkillChoices(item.system.skills)"
												:attack-skill="skill"
											/>
										</span>
										<span v-else><Localized label="Genesys.Labels.NoSkill" /></span>
										<span><Localized label="Genesys.Labels.Damage" /> {{ damageForWeapon(item) }}</span>
										<span><Localized label="Genesys.Labels.Critical" /> {{ item.system.critical }}</span>
										<span
											><Localized label="Genesys.Labels.Range" /> [<Localized
												:label="RANGE_LABELS[item.system.range]"
											/>]</span
										>
										<QualityList :qualities="item.system.qualities" class="weapon-qualities" /> </span
									>)
								</a>
								<a class="send-to-chat-link" @click="sendToChat(item, actor)"><i class="fas fa-comment"></i></a>
							</ContextMenu>
							<ContextMenu
								v-for="item in equipment.filter((i) => i.type !== 'weapon')"
								:key="item.id"
								class="inventory-item"
								:disable-menu="!editable"
							>
								<template v-slot:menu-items>
									<MenuItem icon="fas fa-edit" label="Genesys.Labels.Edit" @click="openSheet(item)" />

									<MenuItem icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(item)" />
								</template>

								<a @click="openSheet(item)" draggable="true" @dragstart="startDocumentDrag($event, item)">
									{{ item.name }}

									<span v-if="item.type === 'armor'" class="soak">
										(+{{ (item.system as ArmorDataModel).soak }} <Localized label="Genesys.Labels.Soak" />)
									</span>

									<i v-if="item.type !== 'weapon'" class="fas fa-arrow-up-right-from-square"></i>
								</a>
								<a class="send-to-chat-link" @click="sendToChat(item, actor)"><i class="fas fa-comment"></i></a>
							</ContextMenu>
						</div>
					</div>
				</section>
			</div>

			<div class="tab" data-tab="miscellaneous">
				<section class="motivations">
					<div class="adversary-items">
						<span class="header"><Localized label="Genesys.Labels.CriticalInjuries" />:</span>
						<div class="container">
							<Localized v-if="injuries.length === 0" label="Genesys.Adversary.None" />
							<div v-for="injury in injuries" :key="injury.id" class="injury">
								<ContextMenu :disable-menu="!editable">
									<template v-slot:menu-items>
										<MenuItem icon="fas fa-trash" label="Genesys.Labels.Delete" @click="deleteItem(injury)" />
									</template>

									<label
										><a @click="openSheet(injury)">{{ injury.name }}</a></label
									>
								</ContextMenu>
								<Enriched class="description" v-if="injury.system.description" :value="injury.system.description" />
							</div>
						</div>
					</div>

					<div class="header"><Localized label="Genesys.Labels.Motivations" /></div>
					<Motivations :motivations="system.motivations" />

					<DataRow class="data-row" label="Genesys.Labels.Source" name="system.source" :value="system.source" />
				</section>
			</div>

			<div class="tab" data-tab="effects">
				<EffectsView :effects="[...effects]" @add-effect="addEffect" />
			</div>
		</section>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/data-row.scss';
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
					border-top: 1px dashed black;

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

							> button.toggle:enabled {
								display: block;
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

		:deep(.header) {
			font-family: 'Bebas Neue', sans-serif;
			font-size: 1.25em;
			color: colors.$blue;
		}

		.send-to-chat-link {
			margin-left: 0.2em;
		}
	}

	header {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		align-items: center;

		img {
			border: 1px solid colors.$gold;
			background: colors.alpha(colors.$gold, 0.5);
			border-radius: 1em;
			height: 2.5rem;
		}

		@include reset.input;
		input[type='text'] {
			width: 100%;
			font-family: 'Bebas Neue', sans-serif;
			font-size: 2rem;
			color: colors.$blue;
			height: 2rem;

			&,
			&:focus {
				border-bottom: 1px solid colors.$dark-blue;
			}

			&:focus {
				font-family: 'Modesto Condensed', sans-serif;
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

	:deep(.skill) {
		display: inline-block;

		& > a {
			display: inline-flex;
			flex-direction: row;
			flex-wrap: nowrap;
			align-items: center;
			gap: 0.5em;
		}

		& > a::after {
			display: block;
			content: ',';
			margin-right: 0.25em;
			margin-left: -0.4em;
		}

		&:last-of-type > a::after {
			display: none;
		}
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

	.weapon-details > span {
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

		label {
			font-weight: bold;
		}

		.description {
			border-left: 2px solid colors.$light-blue;
			padding-left: 0.5em;
			font-size: 0.9em;
		}
	}

	.motivations {
		& > .header {
			font-family: 'Bebas Neue', sans-serif;
			font-size: 1.25em;
			color: colors.$blue;
		}

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
			border-top: 1px dashed black;
			margin-top: 1rem;
			@include data-row.grid;
		}
	}
}
</style>
