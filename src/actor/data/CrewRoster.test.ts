import { describe, expect, it } from 'vitest';

import {
	addRole,
	addRoleSkill,
	Crew,
	crewForSkills,
	crewMemberSkills,
	crewSkillsByMember,
	crewSkillsBySkill,
	hasActor,
	placeActor,
	removeActor,
	removeRole,
	removeRoleSkill,
	renameRole,
	Role,
} from '@/actor/data/CrewRoster';
import { Characteristic } from '@/data/Characteristics';
import type { CheckActor, CheckSkill } from '@/dice/Check';

function passengers(...uuids: string[]) {
	return uuids.map((uuid, index) => ({ uuid, sort: (index + 1) * 100000 }));
}

function role(id: string, ...members: string[]): Role {
	return { id, name: id, skills: [], members };
}

describe('placeActor', () => {
	it('places an actor joining the Crew as the last passenger', () => {
		const crew: Crew = { passengers: passengers('A', 'B'), roles: [] };

		expect(placeActor(crew, 'C', { kind: 'passengers', position: 'last' })).toEqual({
			passengers: passengers('A', 'B', 'C'),
			roles: [],
		});
	});

	it.each([
		{ name: 'first', place: { position: 'first' }, order: ['D', 'A', 'B', 'C'] },
		{ name: 'before A', place: { position: 'before', passenger: 'A' }, order: ['D', 'A', 'B', 'C'] },
		{ name: 'before B', place: { position: 'before', passenger: 'B' }, order: ['A', 'D', 'B', 'C'] },
		{ name: 'before C', place: { position: 'before', passenger: 'C' }, order: ['A', 'B', 'D', 'C'] },
		{ name: 'after A', place: { position: 'after', passenger: 'A' }, order: ['A', 'D', 'B', 'C'] },
		{ name: 'after B', place: { position: 'after', passenger: 'B' }, order: ['A', 'B', 'D', 'C'] },
		{ name: 'after C', place: { position: 'after', passenger: 'C' }, order: ['A', 'B', 'C', 'D'] },
	] as const)('places an actor $name', ({ place, order }) => {
		const crew: Crew = { passengers: passengers('A', 'B', 'C'), roles: [] };

		expect(placeActor(crew, 'D', { kind: 'passengers', ...place })?.passengers).toEqual(passengers(...order));
	});

	it('moves a passenger where it is dropped', () => {
		const crew: Crew = { passengers: passengers('A', 'B', 'C'), roles: [] };

		expect(placeActor(crew, 'C', { kind: 'passengers', position: 'after', passenger: 'A' })?.passengers).toEqual(
			passengers('A', 'C', 'B'),
		);
	});

	it('moves a Role member to the passengers', () => {
		const crew: Crew = { passengers: passengers('A'), roles: [role('pilot', 'P')] };

		expect(placeActor(crew, 'P', { kind: 'passengers', position: 'first' })).toEqual({
			passengers: passengers('P', 'A'),
			roles: [role('pilot')],
		});
	});

	it.each(['before', 'after'] as const)('does nothing when a passenger is placed %s itself', (position) => {
		const crew: Crew = { passengers: passengers('A', 'B', 'C'), roles: [] };

		expect(placeActor(crew, 'B', { kind: 'passengers', position, passenger: 'B' })).toBeUndefined();
	});

	it.each([
		{ name: 'B after the passenger before it', uuid: 'B', place: { kind: 'passengers', position: 'after', passenger: 'A' } },
		{ name: 'B before the passenger after it', uuid: 'B', place: { kind: 'passengers', position: 'before', passenger: 'C' } },
		{ name: 'G2 before the member after it', uuid: 'G2', place: { kind: 'role', roleId: 'gunner', before: 'G3' } },
		{ name: 'G3 last in its Role, already last', uuid: 'G3', place: { kind: 'role', roleId: 'gunner' } },
	] as const)('does nothing when placing $name', ({ uuid, place }) => {
		const crew: Crew = { passengers: passengers('A', 'B', 'C'), roles: [role('gunner', 'G1', 'G2', 'G3')] };

		expect(placeActor(crew, uuid, place)).toBeUndefined();
	});

	it('places an actor joining the Crew last in a Role', () => {
		const crew: Crew = { passengers: [], roles: [role('pilot', 'P'), role('gunner', 'G')] };

		expect(placeActor(crew, 'D', { kind: 'role', roleId: 'gunner' })).toEqual({
			passengers: [],
			roles: [role('pilot', 'P'), role('gunner', 'G', 'D')],
		});
	});

	it.each([
		{ before: 'G1', members: ['D', 'G1', 'G2'] },
		{ before: 'G2', members: ['G1', 'D', 'G2'] },
	])('places an actor in a Role before $before', ({ before, members }) => {
		const crew: Crew = { passengers: [], roles: [role('gunner', 'G1', 'G2')] };

		expect(placeActor(crew, 'D', { kind: 'role', roleId: 'gunner', before })?.roles).toEqual([role('gunner', ...members)]);
	});

	it('moves a passenger to a Role', () => {
		const crew: Crew = { passengers: passengers('A', 'B'), roles: [role('pilot')] };

		expect(placeActor(crew, 'A', { kind: 'role', roleId: 'pilot' })).toEqual({
			passengers: [{ uuid: 'B', sort: 200000 }],
			roles: [role('pilot', 'A')],
		});
	});

	it('moves a member to another Role', () => {
		const crew: Crew = { passengers: [], roles: [role('pilot', 'P'), role('gunner', 'G')] };

		expect(placeActor(crew, 'P', { kind: 'role', roleId: 'gunner', before: 'G' })?.roles).toEqual([
			role('pilot'),
			role('gunner', 'P', 'G'),
		]);
	});

	it('moves a member within its Role', () => {
		const crew: Crew = { passengers: [], roles: [role('gunner', 'G1', 'G2', 'G3')] };

		expect(placeActor(crew, 'G3', { kind: 'role', roleId: 'gunner', before: 'G1' })?.roles).toEqual([role('gunner', 'G3', 'G1', 'G2')]);
	});

	it('moves a member dropped on its own Role last in it', () => {
		const crew: Crew = { passengers: [], roles: [role('gunner', 'G1', 'G2', 'G3')] };

		expect(placeActor(crew, 'G1', { kind: 'role', roleId: 'gunner' })?.roles).toEqual([role('gunner', 'G2', 'G3', 'G1')]);
	});

	it('does nothing when a member is placed before itself', () => {
		const crew: Crew = { passengers: [], roles: [role('gunner', 'G1', 'G2')] };

		expect(placeActor(crew, 'G2', { kind: 'role', roleId: 'gunner', before: 'G2' })).toBeUndefined();
	});

	it("does nothing when the Role isn't the vehicle's", () => {
		const crew: Crew = { passengers: passengers('A'), roles: [role('pilot')] };

		expect(placeActor(crew, 'A', { kind: 'role', roleId: 'gunner' })).toBeUndefined();
	});

	it('places passengers by their sort, whatever their order in the list', () => {
		const crew: Crew = {
			passengers: [
				{ uuid: 'B', sort: 200000 },
				{ uuid: 'A', sort: 100000 },
			],
			roles: [],
		};

		expect(placeActor(crew, 'C', { kind: 'passengers', position: 'last' })?.passengers).toEqual(passengers('A', 'B', 'C'));
	});
});

describe('removeActor', () => {
	it('removes a passenger', () => {
		const crew: Crew = { passengers: passengers('A', 'B'), roles: [role('pilot', 'P')] };

		expect(removeActor(crew, 'A')).toEqual({ passengers: [{ uuid: 'B', sort: 200000 }], roles: [role('pilot', 'P')] });
	});

	it('removes a Role member', () => {
		const crew: Crew = { passengers: passengers('A'), roles: [role('pilot', 'P'), role('gunner', 'G')] };

		expect(removeActor(crew, 'G')).toEqual({ passengers: passengers('A'), roles: [role('pilot', 'P'), role('gunner')] });
	});

	it("does nothing when the actor isn't in the Crew", () => {
		const crew: Crew = { passengers: passengers('A'), roles: [role('pilot', 'P')] };

		expect(removeActor(crew, 'D')).toBeUndefined();
	});
});

describe('hasActor', () => {
	const crew: Crew = { passengers: passengers('A'), roles: [role('pilot', 'P')] };

	it.each([
		{ uuid: 'A', inCrew: true },
		{ uuid: 'P', inCrew: true },
		{ uuid: 'D', inCrew: false },
	])('tells whether $uuid is in the Crew', ({ uuid, inCrew }) => {
		expect(hasActor(crew, uuid)).toBe(inCrew);
	});
});

describe('Roles', () => {
	it('adds an empty Role last', () => {
		const crew: Crew = { passengers: passengers('A'), roles: [role('pilot', 'P')] };

		expect(addRole(crew, 'gunner')).toEqual({
			passengers: passengers('A'),
			roles: [role('pilot', 'P'), { id: 'gunner', name: '', skills: [], members: [] }],
		});
	});

	it('removes a Role and its members', () => {
		const crew: Crew = { passengers: passengers('A'), roles: [role('pilot', 'P'), role('gunner', 'G')] };

		expect(removeRole(crew, 'pilot')).toEqual({ passengers: passengers('A'), roles: [role('gunner', 'G')] });
	});

	it('renames a Role', () => {
		const crew: Crew = { passengers: [], roles: [role('pilot', 'P')] };

		expect(renameRole(crew, 'pilot', 'Co-pilot')?.roles).toEqual([{ id: 'pilot', name: 'Co-pilot', skills: [], members: ['P'] }]);
	});

	it.each([
		{ name: 'removing', change: (crew: Crew) => removeRole(crew, 'gunner') },
		{ name: 'renaming', change: (crew: Crew) => renameRole(crew, 'gunner', 'Gunner') },
		{ name: 'adding a skill to', change: (crew: Crew) => addRoleSkill(crew, 'gunner', 'Gunnery') },
		{ name: 'removing a skill from', change: (crew: Crew) => removeRoleSkill(crew, 'gunner', 'Gunnery') },
	])("does nothing when $name a Role that isn't the vehicle's", ({ change }) => {
		expect(change({ passengers: [], roles: [role('pilot')] })).toBeUndefined();
	});

	it('adds a skill to a Role', () => {
		const crew: Crew = { passengers: [], roles: [{ ...role('pilot'), skills: ['Piloting'] }] };

		expect(addRoleSkill(crew, 'pilot', 'Perception')?.roles).toEqual([{ ...role('pilot'), skills: ['Piloting', 'Perception'] }]);
	});

	it('does nothing when the Role has the skill, whatever its case', () => {
		const crew: Crew = { passengers: [], roles: [{ ...role('pilot'), skills: ['Piloting'] }] };

		expect(addRoleSkill(crew, 'pilot', 'piloting')).toBeUndefined();
	});

	it('removes a skill from a Role, whatever its case', () => {
		const crew: Crew = { passengers: [], roles: [{ ...role('pilot'), skills: ['Piloting', 'Perception'] }] };

		expect(removeRoleSkill(crew, 'pilot', 'piloting')?.roles).toEqual([{ ...role('pilot'), skills: ['Perception'] }]);
	});

	it('removes every skill of a Role matching it, whatever their case', () => {
		const crew: Crew = { passengers: [], roles: [{ ...role('gunner'), skills: ['Gunnery', 'Perception', 'gunnery'] }] };

		expect(removeRoleSkill(crew, 'gunner', 'GUNNERY')?.roles).toEqual([{ ...role('gunner'), skills: ['Perception'] }]);
	});

	it("does nothing when the Role doesn't have the skill", () => {
		const crew: Crew = { passengers: [], roles: [{ ...role('pilot'), skills: ['Piloting'] }] };

		expect(removeRoleSkill(crew, 'pilot', 'Gunnery')).toBeUndefined();
	});
});

describe('Crew operations', () => {
	it.each([
		{
			name: 'placing a passenger',
			change: (crew: Crew) => placeActor(crew, 'C', { kind: 'passengers', position: 'after', passenger: 'A' }),
		},
		{ name: 'placing a member', change: (crew: Crew) => placeActor(crew, 'A', { kind: 'role', roleId: 'pilot', before: 'P' }) },
		{ name: 'removing an actor', change: (crew: Crew) => removeActor(crew, 'P') },
		{ name: 'adding a Role', change: (crew: Crew) => addRole(crew, 'gunner') },
		{ name: 'removing a Role', change: (crew: Crew) => removeRole(crew, 'pilot') },
		{ name: 'renaming a Role', change: (crew: Crew) => renameRole(crew, 'pilot', 'Pilot') },
		{ name: 'adding a Role skill', change: (crew: Crew) => addRoleSkill(crew, 'pilot', 'Perception') },
		{ name: 'removing a Role skill', change: (crew: Crew) => removeRoleSkill(crew, 'pilot', 'Piloting') },
	])("leave the Crew they're given untouched when $name", ({ change }) => {
		const crew: Crew = {
			passengers: [
				{ uuid: 'B', sort: 200000 },
				{ uuid: 'A', sort: 100000 },
				{ uuid: 'C', sort: 300000 },
			],
			roles: [{ id: 'pilot', name: 'pilot', skills: ['Piloting'], members: ['P'] }],
		};
		const before = structuredClone(crew);

		expect(change(crew)).toBeDefined();
		expect(crew).toEqual(before);
	});
});

describe('crewForSkills', () => {
	function skilledRole(id: string, skills: string[], ...members: string[]): Role {
		return { id, name: id, skills, members };
	}

	it('finds the members of the Roles that list a skill, whatever its case: the pilots and the copilot for Piloting (CRB p. 220, 229)', () => {
		const pilot = skilledRole('pilot', ['Piloting'], 'P1', 'P2');
		const copilot = skilledRole('copilot', ['piloting'], 'C');
		const crew: Crew = { passengers: [], roles: [pilot, copilot] };

		expect(crewForSkills(crew, ['PILOTING'])).toEqual([
			{ member: 'P1', role: pilot, skillName: 'Piloting' },
			{ member: 'P2', role: pilot, skillName: 'Piloting' },
			{ member: 'C', role: copilot, skillName: 'piloting' },
		]);
	});

	it("leaves out the passengers and the members of a Role that doesn't list the skills, like a vehicle weapon's Gunnery (CRB p. 69)", () => {
		const gunner = skilledRole('gunner', ['Gunnery', 'Ranged'], 'G');
		const crew: Crew = {
			passengers: passengers('A'),
			roles: [skilledRole('pilot', ['Piloting'], 'P'), gunner, skilledRole('cook', [], 'K')],
		};

		expect(crewForSkills(crew, ['Ranged', 'gunnery'])).toEqual([
			{ member: 'G', role: gunner, skillName: 'Gunnery' },
			{ member: 'G', role: gunner, skillName: 'Ranged' },
		]);
	});

	it('finds a member once for a skill their Role lists in two cases, as worlds made before the Role skills matched may', () => {
		const gunner = skilledRole('gunner', ['Gunnery', 'gunnery'], 'G');

		expect(crewForSkills({ passengers: [], roles: [gunner] }, ['GUNNERY'])).toEqual([
			{ member: 'G', role: gunner, skillName: 'Gunnery' },
		]);
	});

	it('finds nobody in a Crew without Roles', () => {
		expect(crewForSkills({ passengers: passengers('A'), roles: [] }, ['Piloting'])).toEqual([]);
	});
});

describe('crewSkillsBySkill', () => {
	it('lists every Role skill once whatever its case, by name, with the members who roll it in Crew order', () => {
		const pilot: Role = { id: 'pilot', name: 'Pilot', skills: ['Piloting', 'Gunnery'], members: ['P'] };
		const gunner: Role = { id: 'gunner', name: 'Gunner', skills: ['gunnery', 'athletics'], members: ['G1', 'G2'] };
		const navigator: Role = { id: 'navigator', name: 'Navigator', skills: ['Astrogation'], members: [] };
		const crew: Crew = { passengers: [], roles: [pilot, gunner, navigator] };
		const compendium = ['Astrogation', 'athletics', 'Gunnery', 'Piloting'].map((name) => ({ name, img: `${name}.svg` }));
		// G1 rolls none of the Gunner's skills.
		const rolled = [
			{ member: 'P', role: pilot, skillName: 'Piloting', skill: compendium[3] },
			{ member: 'P', role: pilot, skillName: 'Gunnery', skill: compendium[2] },
			{ member: 'G2', role: gunner, skillName: 'gunnery', skill: compendium[2] },
		];

		expect(crewSkillsBySkill(crew, rolled, compendium, 'en')).toEqual([
			{ skillName: 'Astrogation', skillImage: 'Astrogation.svg', members: [] },
			{ skillName: 'athletics', skillImage: 'athletics.svg', members: [] },
			{ skillName: 'Gunnery', skillImage: 'Gunnery.svg', members: [rolled[1], rolled[2]] },
			{ skillName: 'Piloting', skillImage: 'Piloting.svg', members: [rolled[0]] },
		]);
	});

	it('names a skill as the Skills Compendium names it, whatever the case its Roles list it in', () => {
		const pilot: Role = { id: 'pilot', name: 'Pilot', skills: ['PILOTING', 'gunnery'], members: [] };
		const gunner: Role = { id: 'gunner', name: 'Gunner', skills: ['Gunnery'], members: [] };
		const compendium = [
			{ name: 'Gunnery', img: 'gunnery.svg' },
			{ name: 'Piloting', img: 'piloting.svg' },
		];

		expect(crewSkillsBySkill({ passengers: [], roles: [pilot, gunner] }, [], compendium, 'en')).toEqual([
			{ skillName: 'Gunnery', skillImage: 'gunnery.svg', members: [] },
			{ skillName: 'Piloting', skillImage: 'piloting.svg', members: [] },
		]);
	});

	it('lists a Role skill missing from the Skills Compendium once a member rolls it, with the image of their skill', () => {
		const navigator: Role = { id: 'navigator', name: 'Navigator', skills: ['Astrogation', 'Sensors'], members: ['N'] };
		const astrogation = { member: 'N', role: navigator, skillName: 'Astrogation', skill: { name: 'astrogation', img: 'stars.svg' } };

		expect(crewSkillsBySkill({ passengers: [], roles: [navigator] }, [astrogation], [], 'en')).toEqual([
			{ skillName: 'Astrogation', skillImage: 'stars.svg', members: [astrogation] },
		]);
	});
});

describe('crewSkillsByMember', () => {
	it('lists the members of the Roles with skills in Crew order, with the skills they roll by name', () => {
		const pilot: Role = { id: 'pilot', name: 'Pilot', skills: ['Piloting', 'gunnery'], members: ['P'] };
		const gunner: Role = { id: 'gunner', name: 'Gunner', skills: ['Gunnery'], members: ['G1', 'G2'] };
		const cook: Role = { id: 'cook', name: 'Cook', skills: [], members: ['K'] };
		const crew: Crew = { passengers: passengers('A'), roles: [pilot, cook, gunner] };
		// G1 rolls none of the Gunner's skills.
		const rolled = [
			{ member: 'P', role: pilot, skillName: 'Piloting' },
			{ member: 'P', role: pilot, skillName: 'gunnery' },
			{ member: 'G2', role: gunner, skillName: 'Gunnery' },
		];

		expect(crewSkillsByMember(crew, rolled, 'en')).toEqual([
			{ member: 'P', role: pilot, skills: [rolled[1], rolled[0]] },
			{ member: 'G1', role: gunner, skills: [] },
			{ member: 'G2', role: gunner, skills: [rolled[2]] },
		]);
	});
});

describe('crewMemberSkills', () => {
	const pilot: Role = { id: 'pilot', name: 'Pilot', skills: ['Piloting', 'Cool'], members: ['A', 'B'] };
	const compendium: CheckSkill[] = [{ name: 'Piloting', system: { characteristic: Characteristic.Agility, rank: 0 } }];
	const rules = { compendiumSkills: compendium, useSuperCharacteristics: false, uncoupleSkillsFromCharacteristics: false };

	function member(skills: CheckSkill[], agility = 3): CheckActor {
		return {
			type: 'character',
			skills,
			systemData: { characteristics: { brawn: 2, agility, intellect: 2, cunning: 2, willpower: 2, presence: 2 } },
			allApplicableEffects: () => [],
		};
	}

	it('resolves each crew skill as a check of its member: an owned skill at its rank, a Skills Compendium one as an Unranked Skill Check (CRB p. 19)', () => {
		const piloting: CheckSkill = { name: 'piloting', system: { characteristic: Characteristic.Agility, rank: 2 } };
		const actors = new Map([
			['A', member([piloting])],
			['B', member([], 2)],
		]);

		expect(crewMemberSkills(crewForSkills({ passengers: [], roles: [pilot] }, ['Piloting']), actors, rules)).toEqual([
			{ member: 'A', role: pilot, skillName: 'Piloting', actor: actors.get('A'), skill: piloting, rank: 2, characteristicValue: 3 },
			{
				member: 'B',
				role: pilot,
				skillName: 'Piloting',
				actor: actors.get('B'),
				skill: compendium[0],
				rank: 0,
				characteristicValue: 2,
			},
		]);
	});

	it('leaves out a skill whose member has no actor, or that its member can roll neither as an owned skill nor as an Unranked Skill Check', () => {
		const actors = new Map([['A', member([])]]);

		expect(crewMemberSkills(crewForSkills({ passengers: [], roles: [pilot] }, ['Cool', 'Piloting']), actors, rules)).toEqual([
			{
				member: 'A',
				role: pilot,
				skillName: 'Piloting',
				actor: actors.get('A'),
				skill: compendium[0],
				rank: 0,
				characteristicValue: 3,
			},
		]);
	});
});
