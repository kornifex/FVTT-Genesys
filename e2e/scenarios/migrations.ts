/** @file #56 and #102: the migrations a world runs on load, over its actors, its unlinked tokens and its actor compendiums, once. */
import type { ScenarioContext } from '../scenario.ts';

/**
 * A notification, with the options the harness's own recording leaves out.
 */
type Notice = { type: string; message: string; localize: boolean; permanent: boolean };

/**
 * A vehicle's Crew, each reference shown as `uuid:<actor name>` or `id:<actor name>`.
 */
type Crew = { passengers: string[]; roles: string[] };

/**
 * An actor's own effects, and the effects of its items as `<item> / <effect>`, each with what a migration may write.
 */
type ActorEffects = { own: string[]; items: string[] };

/**
 * What the migrations change in the world this scenario seeds.
 */
type WorldState = {
	version: number;
	crew: Record<'V1' | 'V2 token' | 'V2 base' | 'V3 pack', Crew>;
	locked: Record<'E2E Migrations' | 'E2E Old Actors', boolean>;
	effects: Record<'Mira' | 'Odd' | 'Raider token' | 'Raider base' | 'Packed pack' | 'Veteran pack', ActorEffects>;
	/** The values the effects' changes add to, from 0: each effect that applies once adds its change once. */
	applied: Record<'Mira' | 'Raider token' | 'Raider base', Record<string, number>>;
};

type EffectsTab = { temporary: string[]; passive: string[]; suppressed: string[] };

type MigrationHelpers = {
	/** Deletes what an earlier run created, then seeds the legacy data. */
	setUp(): Promise<void>;
	/** Creates actors holding legacy copies of their items' effects, as an older compendium held them. */
	createWithCopies(): Promise<void>;
	/** Imports an actor holding legacy copies from a world compendium. */
	importWithCopies(): Promise<void>;
	/** The effects of a world actor and the values they add to. */
	created(name: string): { effects: ActorEffects; soak: number };
	/** Puts the world back at migration version 0, as a world that never ran the migrations. */
	rollBack(): Promise<void>;
	/** Waits until the migrations a load started end, if any started. */
	settle(): Promise<void>;
	state(): Promise<WorldState>;
	/** The system's permanent notifications since the page loaded, as `<type>: <text>`. */
	permanentNotices(): string[];
	/** The notifications a run of every migration from version 0 gives, the unpaired-copies warnings in the effects migration. */
	expectedNotices(unpaired: { actor: string; item: string }[]): string[];
	unpairedNotice(actor: string, item: string): Notice | undefined;
	/** The rows of an actor sheet's Effects tab, by section, sorted, as `<effect> ← <source>`. */
	effectsTab(name: string): Promise<EffectsTab>;
	/** Deletes what the scenario created. */
	cleanUp(): Promise<void>;
};

declare global {
	interface Window {
		migrationsE2E: MigrationHelpers;
		migrationNotices: Notice[];
	}
}

/**
 * Records every notification of the page with its options in `window.migrationNotices`. Given to `addInitScript`, it
 * runs before Foundry loads and wraps `ui.notifications` as soon as Foundry creates it, several awaits before the ready
 * hook, so that it sees the notifications the migrations give there, before the harness installs its helpers.
 * Playwright sends this function's source to the page.
 */
function recordNotices() {
	if (window.migrationNotices) return;
	const notices: Notice[] = [];
	window.migrationNotices = notices;
	const wrap = () => {
		const notify = ui.notifications.notify;
		ui.notifications.notify = function (this: unknown, message: unknown, type = 'info', options: Record<string, unknown> = {}) {
			notices.push({ type, message: String(message), localize: !!options?.localize, permanent: !!options?.permanent });
			return notify.call(this, message, type, options);
		};
	};
	const created = () => typeof ui !== 'undefined' && !!ui.notifications;
	if (created()) {
		wrap();
		return;
	}
	const timer = setInterval(() => {
		if (created()) {
			clearInterval(timer);
			wrap();
		}
	}, 5);
}

/**
 * Installs `window.migrationsE2E`. Playwright sends this function's source to the page, so it uses nothing from this
 * module.
 */
function installMigrationHelpers() {
	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
	const isSetUp = (doc: { name: string }) => doc.name.startsWith('E2E ');
	const randomID = () => foundry.utils.randomID() as string;
	const actorNamed = (name: string) => game.actors.getName(`E2E ${name}`);
	const scene = () => game.scenes.getName('E2E Migrations');
	const tokenActor = (name: string) => scene().tokens.find((token: { actorId: string }) => token.actorId === actorNamed(name).id).actor;
	const packNamed = (label: string) =>
		game.packs.find(
			(pack: { metadata: { label: string; packageType: string } }) =>
				pack.metadata.packageType === 'world' && pack.metadata.label === label,
		);
	const packActor = async (label: string, name: string) =>
		(await packNamed(label).getDocuments()).find((actor: { name: string }) => actor.name === `E2E ${name}`);
	// v12 declares its classes as global bindings, not as properties of the window: the system's own packs give it.
	const CompendiumCollection = foundry.documents?.collections?.CompendiumCollection ?? game.packs.contents[0].constructor;

	type EffectData = Record<string, unknown> & { _id: string; name: string };
	type ItemData = { _id: string; name: string; type: string; system: Record<string, unknown>; effects: EffectData[] };
	const change = (key: string, value: number) => [{ key: `system.${key}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value) }];
	const effect = (name: string, key: string, value: number, more: Record<string, unknown> = {}): EffectData => ({
		_id: randomID(),
		name,
		img: 'icons/svg/shield.svg',
		changes: change(key, value),
		transfer: true,
		disabled: false,
		...more,
	});
	const item = (name: string, type: string, effects: EffectData[], system: Record<string, unknown> = {}): ItemData => ({
		_id: randomID(),
		name,
		type,
		system,
		effects,
	});
	// Legacy transferral copied an item's transferred effects onto its actor, with the item as origin.
	const copyOf = (actorId: string, of: ItemData, edits: Record<string, unknown> = {}, index = 0) => ({
		...of.effects[index],
		_id: randomID(),
		origin: `Actor.${actorId}.Item.${of._id}`,
		...edits,
	});
	// A crew as it was stored before migration 1: actor ids. Hero is in two Roles, Ally in a Role and the passengers.
	const crewWithIds = () => {
		const [hero, ally] = [actorNamed('Hero').id, actorNamed('Ally').id];
		return {
			passengers: { list: [{ uuid: ally, sort: 0 }] },
			roles: [
				{ id: randomID(), name: 'Pilot', skills: [], members: [hero] },
				{ id: randomID(), name: 'Gunner', skills: [], members: [hero, ally] },
			],
		};
	};

	const crewOf = (actor: { system: { passengers: { list: { uuid: string }[] }; roles: { name: string; members: string[] }[] } }) => {
		const shown = (reference: string) =>
			reference.includes('.') ? `uuid:${fromUuidSync(reference)?.name}` : `id:${game.actors.get(reference)?.name}`;
		return {
			passengers: actor.system.passengers.list.map((passenger) => shown(passenger.uuid)),
			roles: actor.system.roles.map((role) => `${role.name}: ${role.members.map(shown).join(', ')}`),
		};
	};
	type Effect = {
		name: string;
		img: string;
		disabled: boolean;
		changes: { key: string; value: string }[];
		duration: { rounds?: number | null };
	};
	const shownEffect = (effect: Effect) =>
		[
			effect.name,
			effect.img,
			effect.changes.map(({ key, value }) => `${key.replace(/^system\./, '')} +${value}`).join(', '),
			...(effect.duration.rounds ? [`${effect.duration.rounds} rounds`] : []),
			...(effect.disabled ? ['disabled'] : []),
		].join(' | ');
	const effectsOf = (actor: { effects: Effect[]; items: { name: string; effects: Effect[] }[] }) => ({
		own: [...actor.effects].map(shownEffect).sort(),
		items: [...actor.items].flatMap((item) => [...item.effects].map((effect) => `${item.name} / ${shownEffect(effect)}`)).sort(),
	});

	window.migrationsE2E = {
		async setUp() {
			await Actor.deleteDocuments(game.actors.filter(isSetUp).map((doc: { id: string }) => doc.id));
			await Scene.deleteDocuments(game.scenes.filter(isSetUp).map((doc: { id: string }) => doc.id));
			for (const pack of game.packs.filter(
				(pack: { metadata: { label: string; packageType: string } }) =>
					pack.metadata.packageType === 'world' && pack.metadata.label.startsWith('E2E '),
			)) {
				await pack.configure({ locked: false });
				await pack.deleteCompendium();
			}

			await Actor.createDocuments(['Hero', 'Ally'].map((name) => ({ name: `E2E ${name}`, type: 'character' })));

			// #56: a vehicle whose crew holds ids, in the world, on an unlinked token, in a locked world compendium.
			await Actor.create({ name: 'E2E V1', type: 'vehicle', system: crewWithIds() });
			const v2 = await Actor.create({ name: 'E2E V2', type: 'vehicle' });

			// #102: a character holding copies of its items' effects, as legacy transferral left them. The talent has an
			// effect that doesn't transfer, which legacy transferral didn't copy. The copy of the talent's effect was edited
			// from the character's Effects tab; those of the equipment were disabled, by hand (Mail) or by the old
			// equipment rule (Leather, Stim).
			const grit = item('E2E Grit', 'talent', [
				effect('E2E Grit', 'soak', 1),
				effect('E2E Grit Off', 'wounds.max', 100, { transfer: false }),
			]);
			const mail = item('E2E Mail', 'armor', [effect('E2E Mail', 'defense.melee', 1)], { state: 'equipped' });
			const leather = item('E2E Leather', 'armor', [effect('E2E Leather', 'defense.ranged', 1)], { state: 'carried' });
			const lantern = item('E2E Lantern', 'gear', [effect('E2E Lantern', 'strain.max', 1)], { state: 'carried' });
			const stim = item('E2E Stim', 'consumable', [effect('E2E Stim', 'wounds.max', 1)], { state: 'carried' });
			const mira = await Actor.create({ name: 'E2E Mira', type: 'character', items: [grit, mail, leather, lantern, stim] });
			await mira.createEmbeddedDocuments('ActiveEffect', [
				copyOf(mira.id, grit, {
					name: 'E2E Grit (edited)',
					img: 'icons/svg/aura.svg',
					changes: change('soak', 2),
					duration: { rounds: 3 },
				}),
				copyOf(mira.id, mail, { disabled: true }),
				copyOf(mira.id, leather, { disabled: true }),
				copyOf(mira.id, lantern),
				copyOf(mira.id, stim, { disabled: true }),
				effect('E2E Blessing', 'wounds.max', 10),
			]);

			// An item with two copies of its one effect: they don't pair up.
			const knack = item('E2E Knack', 'talent', [effect('E2E Knack', 'soak', 1)]);
			const odd = await Actor.create({ name: 'E2E Odd', type: 'character', items: [knack] });
			await odd.createEmbeddedDocuments('ActiveEffect', [
				copyOf(odd.id, knack, { name: 'E2E Knack (edited)' }),
				copyOf(odd.id, knack),
			]);

			// An adversary whose unlinked token holds an edited copy of its armor's effect; its base actor holds none.
			const hide = item('E2E Hide', 'armor', [effect('E2E Hide', 'soak', 1)], { state: 'equipped' });
			const raider = await Actor.create({ name: 'E2E Raider', type: 'rival', items: [hide] });

			// A scene that isn't viewed: the walk covers every scene.
			const migrationScene = await Scene.create({ name: 'E2E Migrations', width: 1000, height: 1000 });
			await migrationScene.createEmbeddedDocuments('Token', [
				{ name: 'E2E V2', actorId: v2.id, actorLink: false, x: 100, y: 100 },
				{ name: 'E2E Raider', actorId: raider.id, actorLink: false, x: 300, y: 100 },
			]);
			const v2Token = tokenActor('V2');
			const crew = crewWithIds();
			await v2Token.update({ 'system.passengers.list': crew.passengers.list, 'system.roles': crew.roles });
			await tokenActor('Raider').createEmbeddedDocuments('ActiveEffect', [copyOf(raider.id, hide, { changes: change('soak', 3) })]);

			// A locked world compendium holding a vehicle and a character with an edited copy.
			const pack = await (
				CompendiumCollection as { createCompendium(metadata: object): Promise<{ collection: string }> }
			).createCompendium({
				label: 'E2E Migrations',
				type: 'Actor',
			});
			await Actor.create({ name: 'E2E V3', type: 'vehicle', system: crewWithIds() }, { pack: pack.collection });
			const steady = item('E2E Steady', 'talent', [effect('E2E Steady', 'strain.max', 1)]);
			const packed = await Actor.create({ name: 'E2E Packed', type: 'character', items: [steady] }, { pack: pack.collection });
			await packed.createEmbeddedDocuments('ActiveEffect', [
				copyOf(packed.id, steady, { name: 'E2E Steady (edited)', changes: change('strain.max', 2) }),
			]);
			await packNamed('E2E Migrations').configure({ locked: true });

			// An unlocked world compendium holding a character with an edited copy, as an older compendium held it.
			const oldPack = await (
				CompendiumCollection as { createCompendium(metadata: object): Promise<{ collection: string }> }
			).createCompendium({
				label: 'E2E Old Actors',
				type: 'Actor',
			});
			const focus = item('E2E Focus', 'talent', [effect('E2E Focus', 'soak', 1)]);
			const veteran = await Actor.create({ name: 'E2E Veteran', type: 'character', items: [focus] }, { pack: oldPack.collection });
			await veteran.createEmbeddedDocuments('ActiveEffect', [
				copyOf(veteran.id, focus, { name: 'E2E Focus (edited)', changes: change('soak', 2) }),
			]);
		},

		async createWithCopies() {
			const notch = item('E2E Notch', 'talent', [effect('E2E Notch', 'soak', 1)]);
			const oldId = randomID();
			await Actor.create({
				name: 'E2E Imported',
				type: 'character',
				items: [notch],
				effects: [copyOf(oldId, notch, { name: 'E2E Notch (edited)', changes: change('soak', 2) })],
			});
			const hunch = item('E2E Hunch', 'talent', [effect('E2E Hunch', 'soak', 1)]);
			await Actor.create({
				name: 'E2E Stray',
				type: 'character',
				items: [hunch],
				effects: [copyOf(oldId, hunch, { name: 'E2E Hunch (edited)' }), copyOf(oldId, hunch)],
			});
		},

		async importWithCopies() {
			const pack = packNamed('E2E Old Actors');
			const veteran = await packActor('E2E Old Actors', 'Veteran');
			await game.actors.importFromCompendium(pack, veteran.id);
		},

		created(name) {
			const actor = actorNamed(name);
			return { effects: effectsOf(actor), soak: actor.system.soak };
		},

		async rollBack() {
			await game.settings.set('genesys', 'alphaVersion', game.system.version);
			await game.settings.set('genesys', 'migrationVersion', 0);
		},

		async settle() {
			const ended = () =>
				window.migrationNotices.some(
					(notice) => notice.message === 'Genesys.Migration.CompletedMigration' || notice.type === 'error',
				);
			const started = () =>
				window.migrationNotices.some((notice) => notice.type === 'warning' && notice.message.startsWith('MIGRATION'));
			for (let waited = 0; started() && !ended() && waited < 60_000; waited += 250) {
				await sleep(250);
			}
		},

		async state() {
			const v3 = await packActor('E2E Migrations', 'V3');
			const packed = await packActor('E2E Migrations', 'Packed');
			const veteran = await packActor('E2E Old Actors', 'Veteran');
			const mira = actorNamed('Mira');
			return {
				version: game.settings.get('genesys', 'migrationVersion'),
				crew: {
					V1: crewOf(actorNamed('V1')),
					'V2 token': crewOf(tokenActor('V2')),
					'V2 base': crewOf(actorNamed('V2')),
					'V3 pack': crewOf(v3),
				},
				locked: { 'E2E Migrations': packNamed('E2E Migrations').locked, 'E2E Old Actors': packNamed('E2E Old Actors').locked },
				effects: {
					Mira: effectsOf(mira),
					Odd: effectsOf(actorNamed('Odd')),
					'Raider token': effectsOf(tokenActor('Raider')),
					'Raider base': effectsOf(actorNamed('Raider')),
					'Packed pack': effectsOf(packed),
					'Veteran pack': effectsOf(veteran),
				},
				applied: {
					Mira: {
						soak: mira.system.soak,
						'defense.melee': mira.system.defense.melee,
						'defense.ranged': mira.system.defense.ranged,
						'strain.max': mira.system.strain.max,
						'wounds.max': mira.system.wounds.max,
					},
					'Raider token': { soak: tokenActor('Raider').system.soak },
					'Raider base': { soak: actorNamed('Raider').system.soak },
				},
			};
		},

		permanentNotices() {
			return (
				window.migrationNotices
					// Foundry's own, such as the headless browser's missing hardware acceleration, are localization keys.
					.filter((notice) => notice.permanent && !(notice.localize && !notice.message.startsWith('Genesys.')))
					.map((notice) => `${notice.type}: ${notice.localize ? game.i18n.localize(notice.message) : notice.message}`)
			);
		},

		expectedNotices(unpaired) {
			const format = (key: string, data: Record<string, unknown> = {}) => game.i18n.format(`Genesys.Migration.${key}`, data);
			const total = game.settings.get('genesys', 'migrationVersion');
			const scripts = Array.from({ length: total }, (_, index) => index + 1);
			return [
				`warning: ${format('StartingMigration', { amount: total })}`,
				...scripts.flatMap((id) => [
					`warning: ${format('StartingScriptMigration', { id })}`,
					...(id === 3 ? unpaired.map(({ actor, item }) => `warning: ${format('UnpairedEffectCopies', { actor, item })}`) : []),
					`warning: ${format('CompletedScriptMigration', { id })}`,
				]),
				`info: ${format('MultipleSuccessfulMigration')}`,
				`info: ${format('CompletedMigration')}`,
			];
		},

		unpairedNotice(actor, item) {
			const message = game.i18n.format('Genesys.Migration.UnpairedEffectCopies', { actor, item });
			return window.migrationNotices.find((notice) => notice.message === message);
		},

		async effectsTab(name) {
			const sheet = actorNamed(name).sheet;
			await sheet.render(true);
			await sleep(1000);
			const none = game.i18n.localize('None');
			const [temporary, passive, suppressed] = [
				...(sheet.element as HTMLElement).querySelectorAll('.effects-view .effects-category'),
			].map((section) =>
				[...section.querySelectorAll('.effect')]
					.map((row) => {
						const source = row.querySelector('.source')?.textContent?.trim();
						return `${row.querySelector('.name')?.textContent?.trim()} ← ${source === none ? '-' : source}`;
					})
					.sort(),
			);
			await sheet.close();
			return { temporary, passive, suppressed };
		},

		async cleanUp() {
			await Scene.deleteDocuments(game.scenes.filter(isSetUp).map((doc: { id: string }) => doc.id));
			await Actor.deleteDocuments(game.actors.filter(isSetUp).map((doc: { id: string }) => doc.id));
			for (const label of ['E2E Migrations', 'E2E Old Actors']) {
				await packNamed(label).configure({ locked: false });
				await packNamed(label).deleteCompendium();
			}
		},
	};
}

// What the migrations make of the seeded world.
const MIGRATED_CREW = { passengers: [], roles: ['Pilot: uuid:E2E Hero', 'Gunner: uuid:E2E Ally'] };
const SHIELD = 'icons/svg/shield.svg';
const MIGRATED_MIRA = {
	own: [`E2E Blessing | ${SHIELD} | wounds.max +10`],
	items: [
		'E2E Grit / E2E Grit (edited) | icons/svg/aura.svg | soak +2 | 3 rounds',
		`E2E Grit / E2E Grit Off | ${SHIELD} | wounds.max +100`,
		`E2E Lantern / E2E Lantern | ${SHIELD} | strain.max +1`,
		`E2E Leather / E2E Leather | ${SHIELD} | defense.ranged +1`,
		`E2E Mail / E2E Mail | ${SHIELD} | defense.melee +1`,
		`E2E Stim / E2E Stim | ${SHIELD} | wounds.max +1`,
	],
};

export const isolated = true;

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	const helpers = () => gm.evaluate(installMigrationHelpers);
	await gm.evaluate(recordNotices);
	await gm.page.addInitScript(recordNotices);
	await helpers();

	// Actors created with legacy copies lose them at creation, before any migration.
	await e2e.step('actors created and imported with legacy copies', async () => {
		await gm.evaluate(() => window.migrationsE2E.setUp());
		await gm.evaluate(() => window.migrationsE2E.createWithCopies());
		await gm.evaluate(() => window.migrationsE2E.importWithCopies());
	});
	e2e.expect(
		'an actor created with copies of its items effects loses them, the edit kept and each effect applied once',
		await gm.evaluate(() => window.migrationsE2E.created('Imported')),
		{ effects: { own: [], items: [`E2E Notch / E2E Notch (edited) | ${SHIELD} | soak +2`] }, soak: 2 },
	);
	e2e.expect(
		'an actor imported from a compendium with copies loses them, the edit kept and each effect applied once',
		await gm.evaluate(() => window.migrationsE2E.created('Veteran')),
		{ effects: { own: [], items: [`E2E Focus / E2E Focus (edited) | ${SHIELD} | soak +2`] }, soak: 2 },
	);
	e2e.expect(
		'an actor created with unpaired copies loses them, its item effects as they were',
		await gm.evaluate(() => window.migrationsE2E.created('Stray')),
		{ effects: { own: [], items: [`E2E Hunch / E2E Hunch | ${SHIELD} | soak +1`] }, soak: 1 },
	);
	e2e.expect(
		'an actor created with unpaired copies gives a permanent warning naming it and the item',
		await gm.evaluate(() => window.migrationsE2E.unpairedNotice('E2E Stray', 'E2E Hunch')),
		{
			type: 'warning',
			message: await gm.evaluate(() =>
				game.i18n.format('Genesys.Migration.UnpairedEffectCopies', { actor: 'E2E Stray', item: 'E2E Hunch' }),
			),
			localize: false,
			permanent: true,
		},
	);

	const reload = async (name: string) => {
		await e2e.step(name, async () => {
			await gm.reload();
			await helpers();
			await gm.evaluate(() => window.migrationsE2E.settle());
		});
		return gm.evaluate(() => window.migrationsE2E.state());
	};

	await gm.evaluate(() => window.migrationsE2E.rollBack());
	e2e.log('legacy world at migration version 0', await gm.evaluate(() => window.migrationsE2E.state()));

	// #56 and #102: the first load as GM runs every migration.
	const migrated = await reload('GM loads the world at migration version 0');
	e2e.expect(
		'the migrations run once, each with permanent notifications, the unpaired copies warned',
		await gm.evaluate(() => window.migrationsE2E.permanentNotices()),
		await gm.evaluate(() => window.migrationsE2E.expectedNotices([{ actor: 'E2E Odd', item: 'E2E Knack' }])),
	);
	e2e.expect('the migration version reaches 3', migrated.version, 3);
	e2e.expect('a world vehicle crew holds uuids, each actor once', migrated.crew.V1, MIGRATED_CREW);
	e2e.expect(
		'an unlinked token vehicle crew is migrated, its base actor left alone',
		[migrated.crew['V2 token'], migrated.crew['V2 base']],
		[MIGRATED_CREW, { passengers: [], roles: [] }],
	);
	e2e.expect(
		'a vehicle in a locked world compendium is migrated, the compendium locked again',
		[migrated.crew['V3 pack'], migrated.locked['E2E Migrations']],
		[MIGRATED_CREW, true],
	);
	e2e.expect(
		'a character loses its copies, their name, image, changes and duration written on its talent effect',
		migrated.effects.Mira,
		MIGRATED_MIRA,
	);
	e2e.expect(
		'a disabled copy of a character equipment leaves its item effect enabled',
		migrated.effects.Mira.items.filter((effect) => /^E2E (Mail|Leather|Stim) /.test(effect)),
		MIGRATED_MIRA.items.filter((effect) => /^E2E (Mail|Leather|Stim) /.test(effect)),
	);
	e2e.expect(
		'a talent effect that does not transfer is not paired with a copy',
		migrated.effects.Mira.items.filter((effect) => effect.startsWith('E2E Grit /')),
		MIGRATED_MIRA.items.filter((effect) => effect.startsWith('E2E Grit /')),
	);
	// Grit's edited effect adds 2 to soak, Mail equipped 1 to melee defense, Lantern carried 1 to strain, Blessing 10 to
	// wounds; Leather carried and Stim not used are suppressed.
	e2e.expect('each effect of a migrated character applies once', migrated.applied.Mira, {
		soak: 2,
		'defense.melee': 1,
		'defense.ranged': 0,
		'strain.max': 1,
		'wounds.max': 10,
	});
	e2e.expect(
		'the Effects tab of a migrated character lists its item effects with their item as source',
		await gm.evaluate(() => window.migrationsE2E.effectsTab('Mira')),
		{
			temporary: ['E2E Grit (edited) ← E2E Grit'],
			passive: ['E2E Blessing ← -', 'E2E Lantern ← E2E Lantern', 'E2E Mail ← E2E Mail'],
			suppressed: ['E2E Leather ← E2E Leather', 'E2E Stim ← E2E Stim'],
		},
	);
	e2e.expect(
		'an unlinked token loses its copies, their edits written on its item effect, its base actor left alone',
		[
			migrated.effects['Raider token'],
			migrated.effects['Raider base'],
			migrated.applied['Raider token'],
			migrated.applied['Raider base'],
		],
		[
			{ own: [], items: [`E2E Hide / E2E Hide | ${SHIELD} | soak +3`] },
			{ own: [], items: [`E2E Hide / E2E Hide | ${SHIELD} | soak +1`] },
			{ soak: 3 },
			{ soak: 1 },
		],
	);
	e2e.expect(
		'an actor of a locked world compendium loses its copies, their edits written on its item effect',
		migrated.effects['Packed pack'],
		{
			own: [],
			items: [`E2E Steady / E2E Steady (edited) | ${SHIELD} | strain.max +2`],
		},
	);
	e2e.expect(
		'an actor of an unlocked world compendium loses its copies, the compendium left unlocked',
		[migrated.effects['Veteran pack'], migrated.locked['E2E Old Actors']],
		[{ own: [], items: [`E2E Focus / E2E Focus (edited) | ${SHIELD} | soak +2`] }, false],
	);
	e2e.expect('unpaired copies are deleted, the item effects left as they were', migrated.effects.Odd, {
		own: [],
		items: [`E2E Knack / E2E Knack | ${SHIELD} | soak +1`],
	});
	e2e.expect(
		'the unpaired copies warning of a migration is permanent',
		await gm.evaluate(() => window.migrationsE2E.unpairedNotice('E2E Odd', 'E2E Knack')?.permanent),
		true,
	);

	// A second load runs nothing.
	const reloaded = await reload('GM loads the migrated world again');
	e2e.expect('a second load runs no migration', await gm.evaluate(() => window.migrationsE2E.permanentNotices()), []);
	e2e.expect('a second load leaves the migrated world as it was', reloaded, migrated);

	// #56: migrations that run again on migrated data change nothing.
	await gm.evaluate(() => window.migrationsE2E.rollBack());
	const rerun = await reload('GM loads the migrated world at migration version 0');
	e2e.expect(
		'the migrations run again on migrated data complete, with no unpaired copies left',
		await gm.evaluate(() => window.migrationsE2E.permanentNotices()),
		await gm.evaluate(() => window.migrationsE2E.expectedNotices([])),
	);
	e2e.expect('the migrations run again leave the migrated world as it was', rerun, migrated);

	await e2e.step('scenario documents deleted', () => gm.evaluate(() => window.migrationsE2E.cleanUp()));
}
