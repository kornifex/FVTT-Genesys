/** @file #47: actors dropped on a vehicle's Crew land where they are dropped, and Roles take names and skills. */
import type { ScenarioContext } from '../scenario.ts';

type CrewHelpers = {
	setUp(): Promise<void>;
	crew(vehicle: string): { passengers: string[]; roles: { name: string; skills: string[]; members: string[] }[] };
	/** Drags the tile of a Crew member of a vehicle, as the sheet does, and drops it on a target of a vehicle's Crew tab. */
	drag(from: { vehicle: string; tile: Target }, to: { vehicle: string; target: Target }): Promise<void>;
	/** Drops a world document from the sidebar on a target of a vehicle's sheet. */
	dropFromSidebar(document: { type: 'Actor' | 'Item'; name: string }, to: { vehicle: string; target: Target }): Promise<void>;
	click(vehicle: string, target: Target): void;
	rename(vehicle: string, role: number, name: string): void;
};

declare global {
	interface Window {
		crewE2E: CrewHelpers;
	}
}

/**
 * An element of a vehicle's sheet, found step by step: each step is a selector within the previous element, followed by
 * `|n` for its n-th match (from 1) or `|=name` for the match whose actor tile shows that name.
 */
type Target = string[];

const passengerSlot = (n: number): Target => [`.tab-crew .passengers > .sortTarget|${n}`];
const passengerTile = (name: string): Target => [`.tab-crew .passengers .actor-tile-mini|=${name}`];
const role = (n: number): Target => [`.tab-crew .roles .role-section|${n}`];
const roleMember = (role: number, n: number): Target => [`.tab-crew .roles .role-section|${role}`, `.role-member|${n}`];
const roleMemberTile = (role: number, n: number): Target => [...roleMember(role, n), ':scope > div|1'];

/**
 * Installs `window.crewE2E`. Playwright sends this function's source to the page, so it uses nothing from this module.
 */
function installCrewHelpers() {
	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
	const actor = (name: string) => game.actors.getName(`E2E ${name}`);
	const nameOf = (uuid: string) => (fromUuidSync(uuid)?.name ?? uuid).replace(/^E2E /, '');
	const sheet = async (vehicle: string) => {
		const app = actor(vehicle).sheet;
		if (!app.rendered) {
			await app.render(true);
			await sleep(500);
		}
		return app.element as HTMLElement;
	};
	const find = (root: Element, target: string[]) =>
		target.reduce((parent, step) => {
			const [selector, pick] = step.split('|');
			const matches = [...parent.querySelectorAll(selector)];
			const element = pick.startsWith('=')
				? matches.find((match) => match.querySelector('.name')?.textContent?.trim() === `E2E ${pick.slice(1)}`)
				: matches[Number(pick) - 1];
			if (!element) {
				throw new Error(`No ${target.join(' ')}`);
			}
			return element;
		}, root);
	const drop = (element: Element, dataTransfer: DataTransfer) =>
		element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));

	window.crewE2E = {
		async setUp() {
			const isSetUp = (doc: { name: string }) => doc.name.startsWith('E2E ');
			await Actor.deleteDocuments(game.actors.filter(isSetUp).map((doc: { id: string }) => doc.id));
			await Item.deleteDocuments(game.items.filter(isSetUp).map((doc: { id: string }) => doc.id));
			await Actor.createDocuments([
				...['A', 'B', 'C', 'D', 'P'].map((name) => ({
					name: `E2E ${name}`,
					type: 'character',
					prototypeToken: { actorLink: true },
				})),
				{ name: 'E2E V1', type: 'vehicle' },
				{ name: 'E2E V2', type: 'vehicle' },
			]);
			await Item.createDocuments([
				{ name: 'E2E Piloting', type: 'skill' },
				{ name: 'E2E piloting', type: 'skill' },
			]);
		},
		crew(vehicle) {
			const system = actor(vehicle).system;
			return {
				passengers: [...system.passengers.list]
					.sort((left: { sort: number }, right: { sort: number }) => left.sort - right.sort)
					.map((passenger: { uuid: string }) => nameOf(passenger.uuid)),
				roles: system.roles.map((role: { name: string; skills: string[]; members: string[] }) => ({
					name: role.name,
					skills: role.skills,
					members: role.members.map(nameOf),
				})),
			};
		},
		async drag(from, to) {
			const dataTransfer = new DataTransfer();
			find(await sheet(from.vehicle), from.tile).dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
			drop(find(await sheet(to.vehicle), to.target), dataTransfer);
		},
		async dropFromSidebar(document, to) {
			const collection = document.type === 'Actor' ? game.actors : game.items;
			const dataTransfer = new DataTransfer();
			dataTransfer.setData(
				'text/plain',
				JSON.stringify({ type: document.type, uuid: collection.getName(`E2E ${document.name}`).uuid }),
			);
			drop(find(await sheet(to.vehicle), to.target), dataTransfer);
		},
		click(vehicle, target) {
			(find(actor(vehicle).sheet.element, target) as HTMLElement).click();
		},
		rename(vehicle, role, name) {
			const input = find(actor(vehicle).sheet.element, [
				`.tab-crew .roles .role-section|${role}`,
				'.role-name input|1',
			]) as HTMLInputElement;
			input.value = name;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		},
	};
}

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installCrewHelpers);
	const crew = async (name: string) => {
		for (const vehicle of ['V1', 'V2']) {
			e2e.log(`${name} ${vehicle}`, await gm.evaluate((vehicle) => window.crewE2E.crew(vehicle), vehicle));
		}
	};
	const step = async (name: string, action: () => Promise<unknown>) => {
		await e2e.step(name, action);
		await crew(name);
	};
	const fromSidebar =
		(name: string, target: Target, vehicle = 'V1') =>
		() =>
			gm.evaluate(
				(args) =>
					window.crewE2E.dropFromSidebar({ type: 'Actor', name: args.name }, { vehicle: args.vehicle, target: args.target }),
				{
					name,
					target,
					vehicle,
				},
			);
	const drag = (from: { vehicle: string; tile: Target }, to: { vehicle: string; target: Target }) => () =>
		gm.evaluate((args) => window.crewE2E.drag(args.from, args.to), { from, to });

	await gm.evaluate(() => window.crewE2E.setUp());

	// Joining: on the sheet anywhere, then on the passengers' slots.
	await step('A1 A dropped from the sidebar on the sheet', fromSidebar('A', ['.tab-crew .section-header|1']));
	await step('A2 B dropped from the sidebar after A', fromSidebar('B', passengerSlot(2)));
	await step('A3 C dropped from the sidebar first', fromSidebar('C', passengerSlot(1)));
	await step('A4 A dropped again from the sidebar is refused', fromSidebar('A', passengerSlot(1)));

	// Reordering the passengers, from C, A, B.
	await step('B1 B dragged after C', drag({ vehicle: 'V1', tile: passengerTile('B') }, { vehicle: 'V1', target: passengerSlot(2) }));
	await step('B2 C dragged after A', drag({ vehicle: 'V1', tile: passengerTile('C') }, { vehicle: 'V1', target: passengerSlot(4) }));
	await step('B3 A dragged first', drag({ vehicle: 'V1', tile: passengerTile('A') }, { vehicle: 'V1', target: passengerSlot(1) }));
	await step('B4 B dragged after itself', drag({ vehicle: 'V1', tile: passengerTile('B') }, { vehicle: 'V1', target: passengerSlot(3) }));

	// Roles.
	await step('C1 two Roles added', async () => {
		await gm.evaluate(() => window.crewE2E.click('V1', ['.tab-crew .section-header|1', 'a|1']));
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await gm.evaluate(() => window.crewE2E.click('V1', ['.tab-crew .section-header|1', 'a|1']));
	});
	await step('C2 Roles renamed', async () => {
		await gm.evaluate(() => window.crewE2E.rename('V1', 1, 'Pilot'));
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await gm.evaluate(() => window.crewE2E.rename('V1', 2, 'Gunner'));
	});
	await step('C3 skill dropped on Pilot, then the same skill in lower case', async () => {
		await gm.evaluate(() =>
			window.crewE2E.dropFromSidebar(
				{ type: 'Item', name: 'Piloting' },
				{ vehicle: 'V1', target: ['.tab-crew .roles .role-section|1'] },
			),
		);
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await gm.evaluate(() =>
			window.crewE2E.dropFromSidebar(
				{ type: 'Item', name: 'piloting' },
				{ vehicle: 'V1', target: ['.tab-crew .roles .role-section|1'] },
			),
		);
	});
	await step('C4 A dragged to Pilot', drag({ vehicle: 'V1', tile: passengerTile('A') }, { vehicle: 'V1', target: role(1) }));
	await step('C5 P dropped from the sidebar on Pilot', fromSidebar('P', role(1)));
	await step(
		'C6 P dragged before A in Pilot',
		drag({ vehicle: 'V1', tile: roleMemberTile(1, 2) }, { vehicle: 'V1', target: roleMember(1, 1) }),
	);
	await step('C7 C dragged to Gunner', drag({ vehicle: 'V1', tile: passengerTile('C') }, { vehicle: 'V1', target: role(2) }));
	await step(
		'C8 A dragged from Pilot to the passengers',
		drag({ vehicle: 'V1', tile: roleMemberTile(1, 2) }, { vehicle: 'V1', target: passengerSlot(1) }),
	);

	// Another vehicle.
	await step('D1 B dragged to V2', drag({ vehicle: 'V1', tile: passengerTile('B') }, { vehicle: 'V2', target: passengerSlot(1) }));
	await step('D2 D dropped from the sidebar on V2', fromSidebar('D', passengerSlot(1), 'V2'));
	await step(
		'D3 P dragged from Pilot to V2 after D',
		drag({ vehicle: 'V1', tile: roleMemberTile(1, 1) }, { vehicle: 'V2', target: passengerSlot(2) }),
	);

	await step('E1 Gunner deleted', async () =>
		gm.evaluate(() => window.crewE2E.click('V1', ['.tab-crew .roles .role-section|2', '.role-name a|1'])),
	);
}
