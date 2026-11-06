<script lang="ts" setup>
import { ref, shallowRef, useId, watch } from 'vue';
import { type DocumentSheetContext, useSheetContext } from '@/vue/SheetContext';
import { GenesysActor } from '@/actor/GenesysActor';
import { crewForSkills, crewMemberSkills, crewSkillsByMember, crewSkillsBySkill, Role } from '@/actor/data/CrewRoster';
import { type ActorCrewMemberSkill, crewActors, rollForCrew } from '@/operations/CrewRoll';
import { CHARACTERISTIC_ABBREVIATIONS } from '@/data/Characteristics';
import { worldCheckRules } from '@/dice/Check';
import { openSheet } from '@/operations/ItemActions';
import { usePendingContent } from '@/vue/PendingContent';

import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import SkillRanks from '@/vue/components/character/SkillRanks.vue';

type MemberRow = {
	member: string;
	actor: GenesysActor;
	role: Role;
	skills: ActorCrewMemberSkill[];
};

type SkillRow = {
	skillName: string;
	skillImage: string;
	members: ActorCrewMemberSkill[];
};

type GroupingMode = 'member' | 'skill';

const context = useSheetContext<DocumentSheetContext<GenesysActor<'vehicle'>>>();

const groupingMode = ref<GroupingMode>('member');
const groupingId = useId();
const byMember = shallowRef<MemberRow[]>([]);
const bySkill = shallowRef<SkillRow[]>([]);

const pendingContent = usePendingContent();

// The sheet renders again after a change to the vehicle or to one of its crew, which sets its context again. The tab
// watches the whole context as its render tick: a crew member's change leaves the vehicle and its system data as they were.
// The sheet opens on this tab, and measures its content once the first tables show.
watch(
	context,
	({ document: vehicle }, _oldContext, onCleanup) => {
		// Resolving the members is asynchronous: a later render's tables replace the ones still being computed.
		let stale = false;
		onCleanup(() => (stale = true));
		pendingContent(showCrewSkills(vehicle, () => stale));
	},
	{ immediate: true },
);

/**
 * Show the tables of a vehicle's crew skills, unless a later render made them stale while its crew was being resolved.
 */
async function showCrewSkills(vehicle: GenesysActor<'vehicle'>, isStale: () => boolean) {
	const crew = vehicle.system.crew;
	const actors = await crewActors(crew.roles.flatMap((role) => role.members));
	if (isStale()) {
		return;
	}

	const roleSkills = crewForSkills(
		crew,
		crew.roles.flatMap((role) => role.skills),
	);
	const memberSkills = crewMemberSkills(roleSkills, actors, worldCheckRules());
	byMember.value = crewSkillsByMember(crew, memberSkills, game.i18n.lang).flatMap((row) => {
		const actor = actors.get(row.member);
		return actor ? [{ ...row, actor }] : [];
	});
	bySkill.value = crewSkillsBySkill(crew, memberSkills, CONFIG.genesys.skills, game.i18n.lang);
}
</script>

<template>
	<section class="tab-skills">
		<div class="grouping-mode">
			<label :for="groupingId"><Localized label="Genesys.Labels.GroupBy" />:</label>
			<select :id="groupingId" v-model="groupingMode">
				<option value="member"><Localized label="Genesys.Tabs.Crew" /></option>
				<option value="skill"><Localized label="Genesys.Labels.Skill" /></option>
			</select>
		</div>
		<div v-if="groupingMode === 'member'" class="members-container">
			<section v-for="details in byMember" :key="details.member">
				<div class="member-details">
					<img class="member-image" :src="details.actor.img ?? undefined" :alt="details.actor.name" draggable="false" />
					<h3 class="member-heading">
						<ActionButton class="member-name" @click="openSheet(details.actor)">{{ details.actor.name }}</ActionButton>
					</h3>
					<div class="member-roles"><Localized label="Genesys.Labels.Role" />: {{ details.role.name }}</div>

					<div class="member-skills" v-if="details.skills.length > 0">
						<h4><Localized label="Genesys.Labels.RoleSkills" /></h4>

						<div class="member-skills-container">
							<div v-for="rolledSkill in details.skills" :key="rolledSkill.skillName" class="member-skill">
								<img :src="rolledSkill.skill.img ?? undefined" :alt="rolledSkill.skill.name" />
								<ActionButton class="skill-name" @click="rollForCrew([rolledSkill])">
									<span
										>{{ rolledSkill.skill.name }} (<Localized
											:label="CHARACTERISTIC_ABBREVIATIONS[rolledSkill.skill.system.characteristic]"
										/>)</span
									>
								</ActionButton>

								<span class="skill-rank">{{ rolledSkill.rank }}</span>
								<SkillRanks :skill-value="rolledSkill.rank" :characteristic-value="rolledSkill.characteristicValue" />
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
		<div v-else-if="groupingMode === 'skill'" class="skills-container">
			<section v-for="details in bySkill" :key="details.skillName">
				<div class="skill-details">
					<h3 class="skill-details-name">
						<img class="skill-details-image" :src="details.skillImage" :alt="details.skillName" draggable="false" />
						{{ details.skillName }}
					</h3>
					<div class="skill-contents">
						<div class="columns">
							<div class="skill-content-header-charName"><Localized label="Genesys.Labels.CrewMember" /></div>
							<div class="skill-content-header-roles"><Localized label="Genesys.Labels.Role" /></div>
							<div class="skill-content-header-skill"><Localized label="Genesys.Labels.Skill" /></div>
						</div>

						<div v-for="memberSkill in details.members" :key="memberSkill.member" class="skill-content-details">
							<img
								class="skill-content-details-charImage"
								:src="memberSkill.actor.img ?? undefined"
								:alt="memberSkill.actor.name"
								draggable="false"
							/>
							<ActionButton class="skill-content-details-charName" @click="openSheet(memberSkill.actor)">{{
								memberSkill.actor.name
							}}</ActionButton>
							<div>{{ memberSkill.role.name }}</div>
							<div class="skill-content-details-skillRank">{{ memberSkill.rank }}</div>
							<ActionButton
								class="skill-content-details-roll"
								label="Genesys.Labels.PerformCheck"
								@click="rollForCrew([memberSkill])"
							>
								<template #icon>
									<SkillRanks :skill-value="memberSkill.rank" :characteristic-value="memberSkill.characteristicValue" />
								</template>
							</ActionButton>
						</div>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use 'sass:color';
@use '@scss/mixins/headings.scss';
@use '@scss/vars/colors.scss';

.tab-skills {
	display: flex;
	flex-direction: column;

	.grouping-mode {
		@include headings.font;
		font-size: 1em;
		margin-left: auto;

		select {
			margin-left: 0.5rem;
		}
	}

	.members-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5em;
		margin-top: 0.5em;

		.member-details {
			display: grid;
			grid-template-rows: auto auto auto 1fr;
			grid-template-columns: 3rem auto;
			background: colors.alpha(colors.$light-blue, 0.2);
			border-radius: 1em;
			height: 100%;
			gap: 0.5em;
			padding: 0.5rem;

			.member-image {
				grid-row: 1 / span 2;
				grid-column: 1 / span 1;
				border-radius: 0.25em;
			}

			.member-heading {
				grid-row: 1 / span 1;
				grid-column: 2 / span 1;
				align-self: center;
			}

			.member-roles {
				grid-row: 2 / span 1;
				grid-column: 2 / span 1;

				font-family: 'Roboto Serif', serif;
				font-size: 0.9em;
				color: colors.$dark-blue;
				margin-left: 0.5em;
			}

			.member-skills {
				grid-row: 4 / span 1;
				grid-column: 1 / span all;

				.member-skills-container {
					border: 1px solid black;

					.member-skill {
						width: 100%;
						display: grid;
						grid-template-columns: /* image */ 1.5rem /* name */ 1fr /* rank */ auto /* Dice Preview */ 80px;
						align-items: center;
						gap: 0.25rem;

						border-bottom: 1px dashed black;
						padding: 1px;

						&:last-of-type {
							border-bottom: none;
						}

						& > * {
							padding: 0.2em;
						}

						img {
							border: none;
							padding: 0;
							margin-left: 0.1em;
						}

						.skill-name {
							text-overflow: ellipsis;
							overflow: hidden;

							span {
								font-family: 'Roboto Slab', serif;
							}
						}

						.skill-rank {
							background: color.adjust(white, $alpha: -0.5);
							border: 1px dashed black;
							border-radius: 0.75rem;
							text-align: center;
							margin: 0.1em;
							width: 1.5rem;
							height: 1.5rem;
						}
					}
				}
			}
		}
	}

	.skills-container {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		gap: 0.5em;
		padding: 0.5em;

		.skill-details {
			display: grid;
			grid-template-rows: auto auto;
			background: colors.alpha(colors.$light-blue, 0.2);
			border-radius: 1em;
			height: 100%;
			gap: 0.5em;
			padding: 0.5rem;

			.skill-details-name {
				grid-row: 1 / span 1;
				width: 100%;

				.skill-details-image {
					width: 1.5em;
					border: none;
					border-radius: 0.25rem;
					vertical-align: middle;
				}
			}

			.skill-contents {
				grid-row: 2 / span 1;
				display: grid;
				grid-template-rows: auto auto;

				.columns {
					grid-row: 1 / span 1;
					display: grid;
					grid-template-columns: 1.5rem 2fr 1.5fr 1.5em 80px;
					@include headings.font;
					align-items: center;
					justify-items: center;
					gap: 0.5em;

					.skill-content-header-charName {
						grid-column: 1 / span 2;
						justify-self: left;
					}

					.skill-content-header-roles {
						grid-column: 3 / span 1;
					}

					.skill-content-header-skill {
						grid-column: 4 / span 2;
					}
				}

				.skill-content-details {
					grid-row: auto / span 1;
					display: grid;
					width: 100%;
					grid-template-columns: 1.5rem 2fr 1.5fr 1.5em 80px;
					border-top: 1px dashed colors.$blue;
					align-items: center;
					justify-items: center;
					padding: 2px 0;
					gap: 0.5em;

					.skill-content-details-charImage {
						border: none;
						border-radius: 0.25rem;
					}

					.skill-content-details-charName {
						font-family: 'Roboto Serif', serif;
						font-size: 1rem;
						justify-self: left;
					}

					.skill-content-details-skillRank {
						background: color.adjust(white, $alpha: -0.5);
						border: 1px dashed black;
						border-radius: 0.75rem;
						text-align: center;
						margin: 0.1em;
						width: 1.5em;
						height: 1.5em;
						line-height: 1.5em;
					}
				}
			}
		}
	}
}
</style>
