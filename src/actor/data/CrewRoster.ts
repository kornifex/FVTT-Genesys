/** @file A vehicle's Crew: its passengers and Roles, the operations that keep an actor at most once in it, and the skills its members roll. */

import { skillNamesMatch } from '@/data/Skills';
import { SORT_DENSITY } from '@/data/Sort';
import { type CheckActor, type CheckRules, type CheckSkill, resolveCheck } from '@/dice/Check';

/**
 * An actor aboard a vehicle as a passenger.
 */
export type Passenger = {
	uuid: string;
	sort: number;
};

/**
 * A post in a vehicle's Crew, with the skills its members roll for the vehicle.
 */
export type Role = {
	id: string;
	name: string;
	skills: string[];
	members: string[];
};

/**
 * A vehicle's Crew.
 */
export type Crew = {
	passengers: Passenger[];
	roles: Role[];
};

/**
 * Where an actor is placed in a Crew: among the passengers, first, last, or before or after a passenger; or in a Role,
 * before a member or last.
 */
export type CrewPlace =
	| { kind: 'passengers'; position: 'first' | 'last' }
	| { kind: 'passengers'; position: 'before' | 'after'; passenger: string }
	| { kind: 'role'; roleId: string; before?: string };

/**
 * Whether an actor is in a Crew, as a passenger or a Role member.
 */
export function hasActor(crew: Crew, uuid: string) {
	return crew.passengers.some((passenger) => passenger.uuid === uuid) || crew.roles.some((role) => role.members.includes(uuid));
}

/**
 * The Crew without an actor. Undefined when the actor isn't in it.
 */
export function removeActor(crew: Crew, uuid: string): Crew | undefined {
	return hasActor(crew, uuid) ? withoutActor(crew, uuid) : undefined;
}

/**
 * The Crew with an actor placed in it. Undefined when nothing changes: the actor is placed where it already is, or next
 * to a passenger or in a Role that isn't the vehicle's.
 */
export function placeActor(crew: Crew, uuid: string, place: CrewPlace): Crew | undefined {
	// An actor already in the Crew leaves its place first, so it is never in it twice.
	const rest = withoutActor(crew, uuid);
	const placed = place.kind === 'passengers' ? placePassenger(rest, uuid, place) : placeMember(rest, uuid, place);
	return placed && !sameOrder(crew, placed) ? placed : undefined;
}

/**
 * Whether two Crews hold the same actors in the same order, whatever the passengers' sort values.
 */
function sameOrder(left: Crew, right: Crew) {
	const order = (crew: Crew) => [
		[...crew.passengers].sort((one, other) => one.sort - other.sort).map((passenger) => passenger.uuid),
		...crew.roles.map((role) => role.members),
	];
	const rightOrder = order(right);
	return order(left).every(
		(uuids, index) =>
			uuids.length === rightOrder[index].length && uuids.every((uuid, position) => uuid === rightOrder[index][position]),
	);
}

function placePassenger(crew: Crew, uuid: string, place: CrewPlace & { kind: 'passengers' }): Crew | undefined {
	const sorted = [...crew.passengers].sort((left, right) => left.sort - right.sort);
	const index = passengerIndex(sorted, place);
	if (index === undefined) {
		return undefined;
	}
	sorted.splice(index, 0, { uuid, sort: 0 });

	// The passengers are sorted again from scratch, which keeps the gaps between them even.
	return {
		passengers: sorted.map((passenger, position) => ({ uuid: passenger.uuid, sort: (position + 1) * SORT_DENSITY })),
		roles: crew.roles,
	};
}

/**
 * Where a placed actor lands among the sorted passengers. Undefined when the passenger it is placed next to isn't one.
 */
function passengerIndex(sorted: Passenger[], place: CrewPlace & { kind: 'passengers' }) {
	switch (place.position) {
		case 'first':
			return 0;
		case 'last':
			return sorted.length;
		default: {
			const index = sorted.findIndex((passenger) => passenger.uuid === place.passenger);
			if (index === -1) {
				return undefined;
			}
			return place.position === 'before' ? index : index + 1;
		}
	}
}

function placeMember(crew: Crew, uuid: string, place: CrewPlace & { kind: 'role' }): Crew | undefined {
	const role = crew.roles.find((role) => role.id === place.roleId);
	const index = place.before === undefined ? role?.members.length : role?.members.indexOf(place.before);
	if (!role || index === undefined || index === -1) {
		return undefined;
	}

	const members = [...role.members];
	members.splice(index, 0, uuid);
	return changeRole(crew, role.id, () => ({ ...role, members }));
}

/**
 * The Crew with a new, empty Role last.
 */
export function addRole(crew: Crew, id: string): Crew {
	return { passengers: crew.passengers, roles: [...crew.roles, { id, name: '', skills: [], members: [] }] };
}

/**
 * The Crew without a Role: its members leave the Crew. Undefined when the Role isn't the vehicle's.
 */
export function removeRole(crew: Crew, roleId: string): Crew | undefined {
	const roles = crew.roles.filter((role) => role.id !== roleId);
	return roles.length === crew.roles.length ? undefined : { passengers: crew.passengers, roles };
}

/**
 * The Crew with a Role renamed. Undefined when the Role isn't the vehicle's.
 */
export function renameRole(crew: Crew, roleId: string, name: string): Crew | undefined {
	return changeRole(crew, roleId, (role) => ({ ...role, name }));
}

/**
 * The Crew with a skill added to a Role. Undefined when the Role isn't the vehicle's or already has the skill, whatever
 * its case.
 */
export function addRoleSkill(crew: Crew, roleId: string, skill: string): Crew | undefined {
	return changeRole(crew, roleId, (role) =>
		role.skills.some((roleSkill) => skillNamesMatch(roleSkill, skill)) ? undefined : { ...role, skills: [...role.skills, skill] },
	);
}

/**
 * The Crew with a skill removed from a Role, whatever its case. Undefined when the Role isn't the vehicle's or doesn't
 * have the skill.
 */
export function removeRoleSkill(crew: Crew, roleId: string, skill: string): Crew | undefined {
	return changeRole(crew, roleId, (role) => {
		const skills = role.skills.filter((roleSkill) => !skillNamesMatch(roleSkill, skill));
		return skills.length === role.skills.length ? undefined : { ...role, skills };
	});
}

/**
 * A Role skill a member rolls for the vehicle, named as the Role lists it.
 */
export type CrewSkill = {
	member: string;
	role: Role;
	skillName: string;
};

/**
 * The skills the Crew rolls among some skills: each skill a Role lists, matched whatever its case, for each of the Role's
 * members. In the Roles' order, then their members', then their skills'.
 */
export function crewForSkills(crew: Crew, skillNames: string[]): CrewSkill[] {
	return crew.roles.flatMap((role) => {
		const skills = distinctSkills(role.skills).filter((roleSkill) => skillNames.some((name) => skillNamesMatch(roleSkill, name)));
		return role.members.flatMap((member) => skills.map((skillName) => ({ member, role, skillName })));
	});
}

/**
 * A skill a crew member rolls for the vehicle, resolved as a check of their actor.
 */
export type CrewMemberSkill<A, S> = CrewSkill & {
	actor: A;
	skill: S;
	rank: number;
	characteristicValue: number;
};

/**
 * The crew skills resolved as checks of their members' actors, by UUID. A skill whose member isn't among the actors,
 * or who can roll it neither as an owned skill nor as an Unranked Skill Check, is left out.
 */
export function crewMemberSkills<S extends CheckSkill, A extends CheckActor<S>>(
	crewSkills: CrewSkill[],
	actors: Map<string, A>,
	rules: CheckRules<S>,
): CrewMemberSkill<A, S>[] {
	return crewSkills.flatMap((crewSkill) => {
		const actor = actors.get(crewSkill.member);
		const check = actor && resolveCheck(actor, { skillName: crewSkill.skillName }, rules);
		return actor && check?.skill
			? [{ ...crewSkill, actor, skill: check.skill, rank: check.rank, characteristicValue: check.characteristicValue }]
			: [];
	});
}

/**
 * The Crew's skills by member: the members of the Roles that list skills, in the Crew's order, each with the skills they
 * roll among the rolled skills, sorted by name in the given locale.
 */
export function crewSkillsByMember<C extends CrewSkill>(crew: Crew, rolledSkills: C[], locale: string) {
	return crew.roles
		.filter((role) => role.skills.length > 0)
		.flatMap((role) =>
			role.members.map((member) => ({
				member,
				role,
				skills: rolledSkills
					.filter((rolled) => rolled.member === member)
					.sort((left, right) => left.skillName.localeCompare(right.skillName, locale)),
			})),
		);
}

/**
 * A skill as the vehicle's Skills tab shows it: defined by the Skills Compendium, or owned by a member.
 */
type ShownSkill = {
	name: string;
	img?: string | null;
};

/**
 * The Crew's skills by skill, sorted by name in the given locale: each skill its Roles list, once whatever its case,
 * with its image and the rolled skills of the members who roll it, in their order. A skill is named as the Skills
 * Compendium names it, otherwise as first listed. One missing from the Skills Compendium is listed once a member rolls
 * it, with the image of the first one's skill.
 */
export function crewSkillsBySkill<C extends CrewSkill & { skill: ShownSkill }>(
	crew: Crew,
	rolledSkills: C[],
	compendiumSkills: ShownSkill[],
	locale: string,
) {
	return distinctSkills(crew.roles.flatMap((role) => role.skills))
		.sort((left, right) => left.localeCompare(right, locale))
		.flatMap((skillName) => {
			const members = rolledSkills.filter((rolled) => skillNamesMatch(rolled.skillName, skillName));
			const defined = compendiumSkills.find((skill) => skillNamesMatch(skill.name, skillName));
			const skillImage = defined?.img ?? members[0]?.skill.img;
			return skillImage ? [{ skillName: defined?.name ?? skillName, skillImage, members }] : [];
		});
}

/**
 * Skill names without those that match an earlier one: a Role may list a skill in two cases, as Roles did before their
 * skills matched whatever their case.
 */
function distinctSkills(skillNames: string[]) {
	return skillNames.filter((name, index) => skillNames.findIndex((other) => skillNamesMatch(other, name)) === index);
}

function changeRole(crew: Crew, roleId: string, change: (role: Role) => Role | undefined): Crew | undefined {
	const role = crew.roles.find((role) => role.id === roleId);
	const changed = role && change(role);
	return changed && { passengers: crew.passengers, roles: crew.roles.map((other) => (other === role ? changed : other)) };
}

function withoutActor(crew: Crew, uuid: string): Crew {
	return {
		passengers: crew.passengers.filter((passenger) => passenger.uuid !== uuid),
		roles: crew.roles.map((role) =>
			role.members.includes(uuid) ? { ...role, members: role.members.filter((member) => member !== uuid) } : role,
		),
	};
}
