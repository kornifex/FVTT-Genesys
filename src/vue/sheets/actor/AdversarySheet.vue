<script lang="ts" setup>
import { computed, inject, toRaw } from 'vue';
import { ActorSheetContext, RootContext } from '@/vue/SheetContext';
import Characteristic from '@/vue/components/character/Characteristic.vue';
import Localized from '@/vue/components/Localized.vue';
import EffectsView from '@/vue/views/EffectsView.vue';
import { useDocumentEffects } from '@/vue/useDocumentEffects';
import { AdversaryDataModel } from '@/actor/data/AdversaryDataModel';
import Editor from '@/vue/components/Editor.vue';
import { GenesysItem } from '@/item/GenesysItem';
import { TalentDataModel } from '@/item/data/TalentDataModel';
import { AbilityDataModel } from '@/item/data/AbilityDataModel';
import { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import AdversarySkills from '@/vue/components/adversary/AdversarySkills.vue';
import AttackSkillSelect from '@/vue/components/AttackSkillSelect.vue';
import { DicePrompt, RollType } from '@/app/DicePrompt';
import ContextMenu from '@/vue/components/ContextMenu.vue';
import MenuItem from '@/vue/components/MenuItem.vue';
import Enriched from '@/vue/components/Enriched.vue';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { CHARACTERISTICS, Characteristic as CharacteristicType, toggledSuperCharacteristics } from '@/data/Characteristics';
import { InjuryDataModel } from '@/item/data/InjuryDataModel';
import { DragTransferData, constructDragTransferTypeFromData } from '@/data/DragTransferData';
import { attackSkillChoices, attackSkillName } from '@/data/Skills';
import { talentRankChange } from '@/actor/data/AdversaryItems';
import { notify } from '@/notifications';
import { postChatCard } from '@/item/ChatCards';
import { weaponDamage } from '@/item/Weapons';

const context = inject<ActorSheetContext<AdversaryDataModel>>(RootContext)!;
const system = computed(() => toRaw(context.data.actor).systemData);

const talents = computed(() => toRaw(context.data.actor).items.filter((i) => i.type === 'talent') as GenesysItem<TalentDataModel>[]);
const abilities = computed(() => toRaw(context.data.actor).items.filter((i) => i.type === 'ability') as GenesysItem<AbilityDataModel>[]);
const equipment = computed(
	() =>
		toRaw(context.data.actor).items.filter((i) =>
			AdversaryDataModel.isRelevantTypeForContext('INVENTORY', i.type),
		) as GenesysItem<EquipmentDataModel>[],
);
const injuries = computed(() => toRaw(context.data.actor).items.filter((i) => i.type === 'injury') as GenesysItem<InjuryDataModel>[]);

const { effects, addEffect } = useDocumentEffects(() => context.data.actor);

const editLabel = game.i18n.localize('Genesys.Labels.Edit');
const checkLabel = game.i18n.localize('Genesys.Labels.PerformCheck');
const deleteLabel = game.i18n.localize('Genesys.Labels.Delete');
const rankUpLabel = game.i18n.localize('Genesys.Labels.RankUp');
const rankDownLabel = game.i18n.localize('Genesys.Labels.RankDown');

async function rollCharacteristicCheck(characteristic: CharacteristicType) {
	await DicePrompt.promptForCharacteristicCheck(toRaw(context.data.actor), characteristic);
}

async function rollAttack(weapon: GenesysItem) {
	if (weapon.type !== 'weapon') {
		return;
	}

	const attackSkillName = skillForWeapon(weapon);
	if (!attackSkillName) {
		return;
	}

	// The type check above makes it a weapon.
	await DicePrompt.promptForRoll(toRaw(context.data.actor), attackSkillName, {
		rollType: RollType.Attack,
		rollData: { weapon: weapon as GenesysItem<WeaponDataModel> },
	});
}

async function editItem(item: GenesysItem) {
	await toRaw(item).sheet.render(true);
}

async function deleteItem(item: GenesysItem) {
	await toRaw(item).delete();
}

// A non-ranked talent offers no rank change, as on characters.
function canChangeTalentRank(talent: GenesysItem<TalentDataModel>) {
	return talentRankChange(toRaw(talent), 1).action !== 'refuse';
}

async function changeTalentRank(talent: GenesysItem<TalentDataModel>, step: 1 | -1) {
	const actor = toRaw(context.data.actor);
	const change = talentRankChange(toRaw(talent), step);
	switch (change.action) {
		case 'update':
			await actor.updateEmbeddedDocuments('Item', [change.update]);
			break;
		case 'delete':
			await actor.deleteEmbeddedDocuments('Item', [change.id]);
			break;
		case 'refuse':
			if (change.refusal) {
				notify(change.refusal);
			}
			break;
	}
}

function skillForWeapon(weapon: GenesysItem) {
	return attackSkillName(toRaw(context.data.actor).skills, weapon.systemData as WeaponDataModel);
}

function damageForWeapon(weapon: GenesysItem) {
	return weaponDamage(weapon.systemData as WeaponDataModel, system.value.characteristics);
}

// An adversary has no Character Creation, so it can mark and unmark super-characteristics at any time.
async function toggleSuper(characteristic: CharacteristicType) {
	const superCharacteristics = toggledSuperCharacteristics(system.value.superCharacteristics, characteristic);
	if (!superCharacteristics) {
		ui.notifications.warn('Genesys.Notifications.TooManySuperCharacteristics', { localize: true });
		return;
	}

	await toRaw(context.data.actor).update({
		'system.superCharacteristics': superCharacteristics,
	});
}

async function sendToChat(item: GenesysItem) {
	await postChatCard(toRaw(item), toRaw(context.data.actor));
}

function dragStart(event: DragEvent, item: GenesysItem) {
	const transferData: DragTransferData = {
		uuid: item.uuid,
		type: item.documentName,
		genesysType: item.type,
	};
	const genesysTransferType = constructDragTransferTypeFromData(item.type, item.uuid);

	event.dataTransfer?.setData('text/plain', JSON.stringify(transferData));
	event.dataTransfer?.setData(genesysTransferType, '');
}
</script>

<template>
	<div class="adversary-sheet">
		<header>
			<img :src="context.data.actor.img" :alt="context.data.actor.name" data-edit="img" />
			<input type="text" name="name" :value="context.data.actor.name" />
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
					<div class="description-area">
						<div :class="`adversary-description ${system.description.trim() === '' ? 'empty' : ''}`">
							<Editor name="system.description" :content="system.description" button />
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
						<slot name="stats">Stats Row Not Populated</slot>
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
								<ContextMenu :disable-menu="!context.data.editable">
									<template v-slot:menu-items>
										<template v-if="canChangeTalentRank(talent)">
											<MenuItem @click="changeTalentRank(talent, 1)">
												<template v-slot:icon><i class="fas fa-circle-up"></i></template>
												{{ rankUpLabel }}
											</MenuItem>

											<MenuItem @click="changeTalentRank(talent, -1)">
												<template v-slot:icon><i class="fas fa-circle-down"></i></template>
												{{ rankDownLabel }}
											</MenuItem>
										</template>

										<MenuItem @click="editItem(talent)">
											<template v-slot:icon><i class="fas fa-edit"></i></template>
											{{ editLabel }}
										</MenuItem>

										<MenuItem @click="deleteItem(talent)">
											<template v-slot:icon><i class="fas fa-trash"></i></template>
											{{ deleteLabel }}
										</MenuItem>
									</template>

									<label>
										<a @click="editItem(talent)"
											>{{ talent.name }} {{ talent.systemData.ranked === 'yes' ? talent.systemData.rank : null }}</a
										>
										<a class="send-to-chat-link" @click="sendToChat(talent)"><i class="fas fa-comment"></i></a>
									</label>
								</ContextMenu>
								<Enriched class="description" v-if="talent.systemData.description" :value="talent.systemData.description" />
							</div>
						</div>
					</div>

					<div class="adversary-items">
						<span class="header"><Localized label="Genesys.Adversary.Abilities" />:</span>
						<div class="container">
							<Localized v-if="abilities.length === 0" label="Genesys.Adversary.None" />
							<div v-for="ability in abilities" :key="ability.id" class="talent">
								<ContextMenu :disable-menu="!context.data.editable">
									<template v-slot:menu-items>
										<MenuItem @click="deleteItem(ability)">
											<template v-slot:icon><i class="fas fa-trash"></i></template>
											{{ deleteLabel }}
										</MenuItem>
									</template>

									<label>
										<a @click="editItem(ability)">{{ ability.name }}</a>
										<a class="send-to-chat-link" @click="sendToChat(ability)"><i class="fas fa-comment"></i></a>
									</label>
								</ContextMenu>
								<Enriched
									class="description"
									v-if="ability.systemData.description"
									:value="ability.systemData.description"
								/>
							</div>
						</div>
					</div>

					<div class="adversary-items">
						<span class="header"><Localized label="Genesys.Adversary.Equipment" />:</span>
						<div class="container">
							<Localized v-if="equipment.length === 0" label="Genesys.Adversary.None" />
							<ContextMenu v-for="item in equipment.filter((i) => i.type === 'weapon')" :key="item.id" class="weapon">
								<template v-slot:menu-items>
									<MenuItem @click="editItem(item)">
										<template v-slot:icon><i class="fas fa-edit"></i></template>
										{{ editLabel }}
									</MenuItem>

									<MenuItem v-if="skillForWeapon(item)" @click="rollAttack(item)">
										<template v-slot:icon><i class="fas fa-dice-d20"></i></template>
										{{ checkLabel }}
									</MenuItem>

									<MenuItem @click="deleteItem(item)">
										<template v-slot:icon><i class="fas fa-trash"></i></template>
										{{ deleteLabel }}
									</MenuItem>
								</template>

								<a @click="rollAttack(item)" draggable="true" @dragstart="dragStart($event, item)">
									<i class="fas fa-dice-d20"></i>
									{{ item.name }}
									(<span class="weapon-details">
										<template v-for="attackSkill in [skillForWeapon(item)]" :key="attackSkill ?? 'skill'">
											<span v-if="attackSkill">
												<AttackSkillSelect
													:weapon="item as GenesysItem<WeaponDataModel>"
													:choices="attackSkillChoices(item.system.skills)"
													:attack-skill="attackSkill"
												/>
											</span>
											<span v-else><Localized label="Genesys.Labels.NoSkill" /></span>
										</template>
										<span><Localized label="Genesys.Labels.Damage" /> {{ damageForWeapon(item) }}</span>
										<span><Localized label="Genesys.Labels.Critical" /> {{ item.system.critical }}</span>
										<span
											><Localized label="Genesys.Labels.Range" /> [<Localized
												:label="`Genesys.Range.${item.system.range.capitalize()}`"
											/>]</span
										>
										<span v-if="item.system.qualities.length > 0" class="weapon-qualities">
											<span v-for="quality in item.system.qualities" :key="quality.name"
												>{{ quality.name }}{{ quality.isRated ? ` ${quality.rating}` : null }}</span
											>
										</span> </span
									>)
								</a>
								<a class="send-to-chat-link" @click="sendToChat(item)"><i class="fas fa-comment"></i></a>
							</ContextMenu>
							<ContextMenu
								v-for="item in equipment.filter((i) => i.type !== 'weapon')"
								:key="item.id"
								class="inventory-item"
								:disable-menu="!context.data.editable"
							>
								<template v-slot:menu-items>
									<MenuItem @click="editItem(item)">
										<template v-slot:icon><i class="fas fa-edit"></i></template>
										{{ editLabel }}
									</MenuItem>

									<MenuItem @click="deleteItem(item)">
										<template v-slot:icon><i class="fas fa-trash"></i></template>
										{{ deleteLabel }}
									</MenuItem>
								</template>

								<a @click="editItem(item)" draggable="true" @dragstart="dragStart($event, item)">
									{{ item.name }}

									<span v-if="item.type === 'armor'" style="padding-right: 0.2em">
										(+{{ item.system.soak }} <Localized label="Genesys.Labels.Soak" />)
									</span>

									<i v-if="item.type !== 'weapon'" class="fas fa-arrow-up-right-from-square"></i>
								</a>
								<a class="send-to-chat-link" @click="sendToChat(item)"><i class="fas fa-comment"></i></a>
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
								<ContextMenu :disable-menu="!context.data.editable">
									<template v-slot:menu-items>
										<MenuItem @click="deleteItem(injury)">
											<template v-slot:icon><i class="fas fa-trash"></i></template>
											{{ deleteLabel }}
										</MenuItem>
									</template>

									<label
										><a @click="editItem(injury)">{{ injury.name }}</a></label
									>
								</ContextMenu>
								<Enriched class="description" v-if="injury.systemData.description" :value="injury.systemData.description" />
							</div>
						</div>
					</div>

					<div class="header"><Localized label="Genesys.Labels.Motivations" /></div>
					<div class="container">
						<!-- Strength -->
						<div class="motivation">
							<div class="header">
								<span><Localized label="Genesys.Labels.Strength" /></span>
								<input type="text" name="system.motivations.strength.name" :value="system.motivations.strength.name" />
							</div>

							<div class="body">
								<Editor
									name="system.motivations.strength.description"
									:content="system.motivations.strength.description"
									button
								/>
							</div>
						</div>

						<!-- Flaw -->
						<div class="motivation">
							<div class="header">
								<span><Localized label="Genesys.Labels.Flaw" /></span>
								<input type="text" name="system.motivations.flaw.name" :value="system.motivations.flaw.name" />
							</div>

							<div class="body">
								<Editor name="system.motivations.flaw.description" :content="system.motivations.flaw.description" button />
							</div>
						</div>

						<!-- Desire -->
						<div class="motivation">
							<div class="header">
								<span><Localized label="Genesys.Labels.Desire" /></span>
								<input type="text" name="system.motivations.desire.name" :value="system.motivations.desire.name" />
							</div>

							<div class="body">
								<Editor
									name="system.motivations.desire.description"
									:content="system.motivations.desire.description"
									button
								/>
							</div>
						</div>

						<!-- Fear -->
						<div class="motivation">
							<div class="header">
								<span><Localized label="Genesys.Labels.Fear" /></span>
								<input type="text" name="system.motivations.fear.name" :value="system.motivations.fear.name" />
							</div>

							<div class="body">
								<Editor name="system.motivations.fear.description" :content="system.motivations.fear.description" button />
							</div>
						</div>
					</div>

					<div class="data-row">
						<label><Localized label="Genesys.Labels.Source" /></label>
						<input type="text" name="system.source" :value="system.source" />
					</div>
				</section>
			</div>

			<div class="tab" data-tab="effects">
				<EffectsView :effects="[...effects]" @add-effect="addEffect" />
			</div>
		</section>
	</div>
</template>

<style lang="scss">
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

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

				&.empty > :first-of-type {
					min-height: 10rem;
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

		.header {
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

		@include reset.input("input[type='text']");
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

	.container {
		padding-left: 1em;
	}

	.skill {
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

	.weapon-qualities span {
		&::after {
			display: inline;
			content: ',';
			margin-right: 0.25em;
		}

		&:last-of-type::after {
			display: none;
		}
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

		.container {
			display: flex;
			flex-direction: column;
			gap: 0.5em;
			width: 100%;
			height: 100%;
		}

		.motivation {
			display: flex;
			flex-direction: column;
			flex-wrap: nowrap;
			border: 1px solid black;
			background: white;

			@include reset.input;
			input {
				font-family: 'Roboto', sans-serif;
			}

			.header {
				display: flex;
				flex-direction: row;
				flex-wrap: nowrap;
				align-items: center;
				font-family: 'Bebas Neue', sans-serif;
				width: 100%;
				gap: 0.5em;
				padding: 0.25em;
				padding-left: 0.5em;
				border-bottom: 1px solid black;
				clip-path: polygon(0% 0%, 100% 0%, 100% calc(100% - 1px), 80% calc(100% - 1px), 80% 100%, 0% 100%);

				span {
					font-size: 1.1em;
				}
			}

			.body {
				display: grid;
				grid-template-rows: 1fr;
				height: 100%;
				min-height: 4rem;
			}
		}

		.data-row {
			display: grid;
			grid-template-columns: minmax(min-content, 30%) 1fr;
			align-items: center;
			border-top: 1px dashed black;
			padding: 0.25em;
			row-gap: 0.1em;
			margin-top: 1rem;

			input:not([type='checkbox']),
			select {
				width: 100%;
			}

			input[type='checkbox'] {
				justify-self: right;
			}

			& > * {
				grid-column: 2 / span 1;
			}

			& > label {
				grid-column: 1 / span 1;
			}
		}
	}
}
</style>
