/**
 * @file The demo world of the README's screenshots, set in Realms of Terrinoth: a Human Warrior with his Archetype,
 * Career, talents, gear and Experience Journal, the goblin raiders he fights and the witcher who leads them. Names and
 * text are invented; characteristics, talents, weapons and qualities follow the Realms of Terrinoth rules.
 */

/** A portrait of `portraits/`, by its file name, which the scenario uploads before it builds the world. */
type Portrait = 'knight.jpg' | 'human.jpg' | 'goblins.jpg' | 'goblin.jpg' | 'wain.jpg';

const passive = { type: 'passive', detail: '' };
const active = (detail: string) => ({ type: 'active', detail });

const quality = (name: string, rating: number, description: string) => ({ name, rating, isRated: rating > 0, description });
const ACCURATE = quality('Accurate', 1, '<p>Add @dice[B] per rating to combat checks with this weapon.</p>');
const DEFENSIVE = quality('Defensive', 1, "<p>Raises the wielder's melee defense by its rating.</p>");
const DEFLECTION = quality('Deflection', 1, "<p>Raises the wielder's ranged defense by its rating.</p>");
const INACCURATE = (rating: number) => quality('Inaccurate', rating, '<p>Add @dice[S] per rating to combat checks with this weapon.</p>');
const LIMITED_AMMO = quality('Limited Ammo', 1, '<p>May attack this many times before it must be retrieved or reloaded.</p>');
const VICIOUS = quality('Vicious', 1, '<p>Adds ten times its rating to the Critical Injury roll.</p>');
const UNWIELDY = (rating: number) =>
	quality('Unwieldy', rating, '<p>Add @dice[D] to checks with this weapon if Agility is lower than its rating.</p>');
const KNOCKDOWN = {
	...quality('Knockdown', 0, '<p>Spend @sym[aa] to knock one target hit by the attack prone.</p>'),
	activation: 'active',
	advantageCost: 2,
};

/** A thrown profile: Brawn +2, Short range, Accurate 1 and Limited Ammo 1, with its own Critical (RoT p. 92). */
const thrown = (critical: number) => ({
	name: 'Thrown',
	skills: ['Ranged'],
	damageCharacteristic: 'brawn',
	baseDamage: 2,
	critical,
	range: 'short',
	qualities: [ACCURATE, LIMITED_AMMO],
	attackSkill: '',
});

/** The world items the character is built from: dropped on his sheet in the order a player would. */
export const WORLD_ITEMS = {
	archetype: {
		name: 'Human',
		type: 'archetype',
		portrait: 'human.jpg' as Portrait,
		system: {
			description:
				'<p>Humans are the most numerous folk of the realm: farmers, soldiers, merchants and wanderers whose short lives push them to make their mark quickly.</p><p>Their ambition lets them take up almost any calling, and many a Human hero first learned their trade far from the path that made them famous.</p>',
			source: 'Realms of Terrinoth, p. 61',
			characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 10,
			strainThreshold: 10,
			startingXP: 110,
			nonCareerSkillChoices: 2,
			grantedItems: [
				{
					name: 'Ready for Adventure',
					type: 'ability',
					img: 'icons/sundries/survival/rope-coiled-brown.webp',
					system: {
						activation: active('Incidental (Out of Turn)'),
						description: "<p>Once per session, move one Story Point from the Game Master's pool to the players' pool.</p>",
					},
				},
			],
		},
	},
	career: {
		name: 'Warrior',
		type: 'career',
		img: 'icons/weapons/polearms/spear-flared-steel.webp',
		system: {
			description:
				'<p>Warriors stand in the shield wall when the horns sound: sellswords, barony levies and wandering champions who make their living at the end of a blade.</p>',
			source: 'Realms of Terrinoth, p. 73',
			careerSkills: ['Brawl', 'Coercion', 'Leadership', 'Melee (Heavy)', 'Melee (Light)', 'Resilience', 'Riding', 'Vigilance'].map(
				(name) => ({ name, type: 'skill' }),
			),
		},
	},
	talents: [
		{
			name: 'Parry',
			img: 'icons/skills/melee/shield-block-gray-yellow.webp',
			system: {
				tier: 1,
				ranked: 'yes',
				activation: active('Incidental (Out of Turn)'),
				source: 'Genesys Core Rulebook, p. 74',
				description:
					'<p>When hit by a melee attack, after damage is calculated but before soak, suffer 3 strain to reduce the damage by two plus ranks in Parry. Once per hit, while wielding a Melee weapon.</p>',
			},
		},
		{
			name: 'Quick Draw',
			img: 'icons/skills/melee/hand-grip-sword-orange.webp',
			system: {
				tier: 1,
				ranked: 'no',
				activation: active('Incidental'),
				source: 'Genesys Core Rulebook, p. 74',
				description:
					"<p>Once per round on your turn, draw or holster an easily accessible weapon or item as an incidental. Also reduces a weapon's Prepare rating by one, to a minimum of one.</p>",
			},
		},
		{
			name: 'Durable',
			img: 'icons/skills/melee/shield-damaged-broken-brown.webp',
			system: {
				tier: 1,
				ranked: 'yes',
				activation: passive,
				source: 'Genesys Core Rulebook, p. 73',
				description: '<p>Reduce any Critical Injury result you suffer by 10 per rank of Durable, to a minimum of 01.</p>',
			},
		},
		{
			name: 'Challenge!',
			img: 'icons/skills/melee/maneuver-greatsword-yellow.webp',
			system: {
				tier: 1,
				ranked: 'yes',
				activation: active('Maneuver'),
				source: 'Realms of Terrinoth, p. 84',
				description:
					'<p>Once per encounter, challenge up to one adversary per rank within short range. Until the encounter ends, they add @dice[B] to combat checks targeting you and @dice[SS] to combat checks targeting anyone else.</p>',
			},
		},
		{
			name: 'Reckless Charge',
			img: 'icons/skills/melee/spear-tips-triple-orange.webp',
			system: {
				tier: 2,
				ranked: 'no',
				activation: active('Incidental'),
				source: 'Realms of Terrinoth, p. 89',
				description:
					'<p>After using a maneuver to engage an adversary, suffer 2 strain to add @sym[ss] and @sym[hh] to the results of the next Brawl or Melee check you make this turn.</p>',
			},
			// The roller ticks it in the Dice Prompt on the turn they charge.
			effects: [
				{
					name: 'Reckless Charge',
					img: 'icons/skills/melee/spear-tips-triple-orange.webp',
					transfer: true,
					system: { changes: [{ key: 'genesys.pool.skill.self.Melee (Light)', type: 'custom', value: 'sshh' }] },
				},
			],
		},
		{
			name: 'Body Guard',
			img: 'icons/skills/melee/shield-block-bash-blue.webp',
			system: {
				tier: 3,
				ranked: 'yes',
				activation: active('Maneuver'),
				source: 'Realms of Terrinoth, p. 90',
				description:
					'<p>Once per round, suffer strain up to your ranks in Body Guard to protect an engaged ally: until the end of your next turn, upgrade the difficulty of combat checks targeting them that many times.</p>',
			},
		},
	],
};

/**
 * How the character spends his XP, entry by entry, as a player clicks it on the sheet. Creation first, from the
 * Archetype's 110 Starting XP; then three XP awards, and what he bought with them, keeping 10 XP.
 */
export type Purchase = { raise: string } | { skill: string } | { talent: string } | { upgrade: string } | { award: number; reason: string };

export const CHARACTER = {
	name: 'Aldric Hale',
	portrait: 'knight.jpg' as Portrait,
	archetype: WORLD_ITEMS.archetype.name,
	career: WORLD_ITEMS.career.name,
	nonCareerSkills: ['Athletics', 'Perception'],
	freeRanks: ['Melee (Light)', 'Resilience', 'Vigilance', 'Riding'],
	purchases: [
		{ raise: 'brawn' },
		{ raise: 'agility' },
		{ skill: 'Melee (Light)' },
		{ talent: 'Parry' },
		{ talent: 'Quick Draw' },
		{ talent: 'Durable' },
		{ talent: 'Challenge!' },
		{ talent: 'Reckless Charge' },
		{ skill: 'Resilience' },
		{ award: 15, reason: 'Cleared the goblin warren under Mossgate mill' },
		{ award: 20, reason: 'Escorted the salt caravan through the Thornwood' },
		{ award: 25, reason: 'Held Hollin Ford against the Gutterfang raiders' },
		{ upgrade: 'Parry' },
		{ talent: 'Body Guard' },
		{ skill: 'Melee (Light)' },
		{ skill: 'Vigilance' },
	] satisfies Purchase[],
	system: {
		wounds: { value: 4 },
		strain: { value: 3 },
		currency: 85,
		motivations: {
			strength: {
				name: 'Loyal',
				description: '<p>Aldric never leaves a companion behind, even when the odds tell him he should.</p>',
			},
			flaw: {
				name: 'Stubborn',
				description: '<p>Once he has chosen a course, no argument short of a broken leg will turn him from it.</p>',
			},
			desire: {
				name: 'Belonging',
				description: '<p>He wants a hall to call home and a banner worth standing under.</p>',
			},
			fear: {
				name: 'Failure',
				description: '<p>He was the only one to walk back from Dunmere ridge, and he still wonders why.</p>',
			},
		},
		details: {
			gender: 'He/him',
			age: '31',
			height: 'Tall',
			build: 'Broad-shouldered',
			hair: 'Dark brown, cropped',
			eyes: 'Grey',
			notableFeatures: "A notched left ear; carries his father's spear",
		},
		notes: "<p>The third son of a miller from the river country, Aldric took the baron's coin at sixteen and spent ten years in the levy, until a winter campaign on Dunmere ridge left his company buried in the snow.</p><p>He now sells his spear to caravans and villages that cannot afford a garrison, and has lately taken an interest in the goblins raiding the mills along the Hollin.</p>",
	},
	equipment: [
		{
			name: 'Light Spear',
			type: 'weapon',
			img: 'icons/weapons/polearms/spear-flared-steel.webp',
			system: {
				description: '<p>A four-foot ash shaft with an iron head, light enough to fight one-handed or to throw.</p>',
				source: 'Realms of Terrinoth, p. 94',
				state: 'equipped',
				skills: ['Melee (Light)'],
				damageCharacteristic: 'brawn',
				baseDamage: 2,
				critical: 4,
				range: 'engaged',
				qualities: [ACCURATE, DEFENSIVE],
				encumbrance: 2,
				hardPoints: 1,
				price: 90,
				rarity: 1,
				extraProfiles: [thrown(4)],
			},
		},
		{
			name: 'Dagger',
			type: 'weapon',
			img: 'icons/weapons/daggers/dagger-simple-black.webp',
			system: {
				description: '<p>A plain, well-balanced blade, as good thrown as in the hand.</p>',
				source: 'Realms of Terrinoth, p. 94',
				state: 'equipped',
				skills: ['Melee (Light)'],
				damageCharacteristic: 'brawn',
				baseDamage: 2,
				critical: 3,
				range: 'engaged',
				qualities: [ACCURATE],
				encumbrance: 1,
				hardPoints: 1,
				price: 60,
				rarity: 1,
				extraProfiles: [thrown(3)],
			},
		},
		{
			name: 'Shield',
			type: 'weapon',
			img: 'icons/equipment/shield/heater-wooden-steel-boss.webp',
			system: {
				description: '<p>A round shield of oak planks with an iron boss, painted with a faded mill wheel.</p>',
				source: 'Realms of Terrinoth, p. 94',
				state: 'equipped',
				skills: ['Melee (Light)'],
				damageCharacteristic: 'brawn',
				baseDamage: 0,
				critical: 6,
				range: 'engaged',
				qualities: [DEFENSIVE, DEFLECTION, INACCURATE(1), KNOCKDOWN],
				encumbrance: 1,
				hardPoints: 1,
				price: 80,
				rarity: 1,
			},
			// A shield's Defensive and Deflection apply whenever it is wielded (RoT p. 93).
			effects: [
				{
					name: 'Shield',
					img: 'icons/equipment/shield/heater-wooden-steel-boss.webp',
					transfer: true,
					system: {
						changes: [
							{ key: 'system.defense.melee', type: 'add', value: '1' },
							{ key: 'system.defense.ranged', type: 'add', value: '1' },
						],
					},
				},
			],
		},
		{
			name: 'Chainmail',
			type: 'armor',
			img: 'icons/equipment/chest/breastplate-layered-steel.webp',
			system: {
				description: '<p>A knee-length hauberk of riveted rings over a padded jack.</p>',
				source: 'Realms of Terrinoth, p. 96',
				state: 'equipped',
				defense: 0,
				soak: 2,
				encumbrance: 3,
				hardPoints: 2,
				price: 550,
				rarity: 4,
			},
		},
		{
			name: 'Fine Cloak',
			type: 'gear',
			img: 'icons/equipment/back/cloak-collared-blue.webp',
			system: {
				description: '<p>A blue wool cloak with a fox-fur collar, the one luxury Aldric allows himself.</p>',
				source: 'Realms of Terrinoth, p. 100',
				wearable: true,
				wornEncumbrance: 0,
				encumbrance: 1,
				price: 90,
				rarity: 4,
			},
		},
		gear('Backpack', 'icons/containers/bags/pack-leather-brown.webp', { encumbrance: -4, price: 50, rarity: 3 }),
		gear('Bedroll', 'icons/sundries/survival/bedroll-brown.webp', { encumbrance: 1, price: 15, rarity: 1 }),
		gear('Rope', 'icons/sundries/survival/rope-coiled-brown.webp', { encumbrance: 1, price: 5, rarity: 1 }),
		gear('Torches (3)', 'icons/sundries/lights/torch-brown.webp', { encumbrance: 1, price: 1, rarity: 0 }),
		gear('Waterskin', 'icons/sundries/survival/waterskin-leather-brown.webp', { encumbrance: 1, price: 5, rarity: 1 }),
		{
			name: 'Trail Rations (1 day)',
			type: 'consumable',
			img: 'icons/consumables/food/berries-ration-round-red.webp',
			system: { encumbrance: 0, price: 2, rarity: 0, quantity: 4 },
		},
		{
			name: 'Herbs of Healing',
			type: 'consumable',
			img: 'icons/consumables/plants/herb-tied-bundle-green.webp',
			system: {
				description: '<p>Add @sym[sa] to a Medicine check to heal wounds. Used up once applied.</p>',
				source: 'Realms of Terrinoth, p. 100',
				encumbrance: 0,
				price: 50,
				rarity: 6,
				quantity: 2,
			},
		},
	],
};

function gear(name: string, img: string, system: { encumbrance: number; price: number; rarity: number }) {
	return { name, type: 'gear', img, system: { ...system, source: 'Realms of Terrinoth, p. 101' } };
}

/** The skills of the Skills Compendium an adversary owns: a rival's at a rank, a Minion group's without one. */
export type AdversarySkill = { name: string; rank?: number };

const ADVERSARY_TALENT = {
	name: 'Adversary',
	type: 'talent',
	img: 'icons/magic/perception/shadow-stealth-eyes-purple.webp',
	system: {
		tier: 1,
		ranked: 'yes',
		rank: 1,
		scalesWithRank: 'yes',
		activation: passive,
		description: '<p>Upgrade the difficulty of combat checks targeting this character once per rank of Adversary.</p>',
	},
	effects: [
		{
			name: 'Adversary',
			img: 'icons/magic/perception/shadow-stealth-eyes-purple.webp',
			transfer: true,
			system: { changes: [{ key: 'genesys.pool.check.target.', type: 'custom', value: '*' }] },
		},
	],
};

const DARK_VISION = {
	name: 'Dark Vision',
	type: 'ability',
	img: 'icons/creatures/eyes/humanoid-single-yellow.webp',
	system: {
		activation: passive,
		description: '<p>When making skill checks, remove up to @dice[SS] imposed due to darkness.</p>',
	},
};

const POINTY_TEETH = {
	name: 'Pointy Teeth',
	type: 'weapon',
	img: 'icons/weapons/fist/claw-worn-brown.webp',
	system: {
		skills: ['Brawl'],
		attackSkill: 'Brawl',
		damageCharacteristic: 'brawn',
		baseDamage: 1,
		critical: 3,
		range: 'engaged',
		qualities: [VICIOUS],
		encumbrance: 0,
		state: 'equipped',
	},
};

/** The goblin raiders: a Minion group of Realms of Terrinoth's goblins (p. 152). */
export const MINION = {
	name: 'Gutterfang Raiders',
	type: 'minion',
	portrait: 'goblins.jpg' as Portrait,
	skills: ['Brawl', 'Cool', 'Deception', 'Melee (Light)', 'Ranged', 'Stealth'].map((name) => ({ name })) as AdversarySkill[],
	system: {
		description:
			'<p>Gutterfang raiders creep out of the old drainage tunnels under Mossgate at dusk, a jostling pack of sharp teeth and stolen knives. Alone, each one is a coward; together, they swarm anything that looks easier to rob than to fight.</p>',
		source: 'Realms of Terrinoth, p. 152',
		characteristics: { brawn: 2, agility: 3, intellect: 1, cunning: 2, willpower: 1, presence: 1 },
		soak: 3,
		defense: { melee: 1, ranged: 0 },
		groupSize: 4,
		wounds: { value: 0, threshold: 4 },
	},
	items: [
		DARK_VISION,
		{
			name: 'Opportunistic',
			type: 'ability',
			img: 'icons/skills/melee/stabbing-knife.webp',
			system: {
				activation: passive,
				description: '<p>Inflicts 1 additional damage with successful melee attacks on prone or immobilized targets.</p>',
			},
		},
		{
			name: 'Jagged Blade',
			type: 'weapon',
			img: 'icons/weapons/swords/machete.webp',
			system: {
				skills: ['Melee (Light)'],
				attackSkill: 'Melee (Light)',
				damageCharacteristic: 'brawn',
				baseDamage: 3,
				critical: 3,
				range: 'engaged',
				encumbrance: 1,
				state: 'equipped',
			},
		},
		{
			name: 'Crude Bow',
			type: 'weapon',
			img: 'icons/weapons/bows/shortbow-leather.webp',
			system: {
				skills: ['Ranged'],
				attackSkill: 'Ranged',
				damageCharacteristic: '-',
				baseDamage: 6,
				critical: 4,
				range: 'medium',
				qualities: [UNWIELDY(2)],
				encumbrance: 2,
				state: 'equipped',
			},
		},
		{
			name: 'Wooden Buckler',
			type: 'weapon',
			img: 'icons/equipment/shield/buckler-wooden-boss.webp',
			system: {
				skills: ['Melee (Light)'],
				attackSkill: 'Melee (Light)',
				damageCharacteristic: 'brawn',
				baseDamage: 0,
				critical: 6,
				range: 'engaged',
				qualities: [DEFENSIVE, INACCURATE(2)],
				encumbrance: 1,
				state: 'equipped',
			},
		},
		POINTY_TEETH,
		{
			name: 'Grimy Patchwork Armor',
			type: 'armor',
			img: 'icons/equipment/chest/breastplate-layered-leather-stitched.webp',
			system: { soak: 1, defense: 0, encumbrance: 2, state: 'equipped' },
		},
	],
};

/** The goblin witcher who leads the raiders: a Rival of Realms of Terrinoth (pp. 152–153). */
export const RIVAL = {
	name: 'Nettlewick',
	type: 'rival',
	portrait: 'goblin.jpg' as Portrait,
	skills: [
		{ name: 'Arcana', rank: 3 },
		{ name: 'Cool', rank: 2 },
		{ name: 'Deception', rank: 2 },
		{ name: 'Knowledge (Forbidden)', rank: 2 },
		{ name: 'Stealth', rank: 1 },
	] as AdversarySkill[],
	system: {
		description:
			'<p>A hunched goblin in a cloak of stitched rat hides, Nettlewick rules the Gutterfang raiders through fear of his curses rather than strength of arm. He hoards trinkets that hum with old magic, and slips away the moment a fight turns against him.</p>',
		source: 'Realms of Terrinoth, p. 152',
		characteristics: { brawn: 2, agility: 3, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
		soak: 3,
		defense: { melee: 1, ranged: 1 },
		wounds: { value: 3, max: 16 },
		motivations: {
			strength: { name: 'Cunning', description: '<p>Always has a second tunnel out.</p>' },
			flaw: { name: 'Greed', description: '<p>Cannot leave a shiny trinket behind, even to save his skin.</p>' },
			desire: { name: 'Power', description: '<p>Dreams of a warren of a hundred goblins bowing to him.</p>' },
			fear: { name: 'Iron', description: '<p>Flinches from cold iron and those who carry it openly.</p>' },
		},
	},
	items: [
		ADVERSARY_TALENT,
		{
			name: 'Dark Insight',
			type: 'talent',
			img: 'icons/magic/unholy/orb-glowing-purple.webp',
			system: {
				tier: 1,
				ranked: 'no',
				activation: active('Incidental'),
				description:
					'<p>When casting a spell, use ranks in Knowledge (Forbidden) in place of Knowledge (Lore) to determine its effects.</p>',
			},
		},
		DARK_VISION,
		{
			name: 'Spiteful Curse',
			type: 'ability',
			img: 'icons/magic/unholy/hand-claw-fog-green.webp',
			system: {
				activation: passive,
				description:
					'<p>Add @dice[BB] to magic actions targeting a character who has inflicted wounds on Nettlewick during this encounter.</p>',
			},
		},
		{
			name: 'Agonizing Hex',
			type: 'ability',
			img: 'icons/magic/unholy/projectile-smoke-tendril-green.webp',
			system: {
				activation: active('Action'),
				description:
					'<p>Choose a target at short or medium range and make an @check[Arcana,2]. If successful, the magic attack inflicts 6 damage, +1 damage per @sym[s], with the Disorient 2 and Knockdown qualities.</p>',
			},
		},
		{
			name: 'Bad Luck',
			type: 'ability',
			img: 'icons/magic/unholy/orb-swirling-teal.webp',
			system: {
				activation: active('Action'),
				description:
					"<p>Choose a target at short or medium range and make a @check[Arcana,3]. If successful, the target's checks lose one Ability die until the end of Nettlewick's next turn, and Nettlewick may turn one of their @dice[S] to a face showing @sym[f]. He may maintain it with the concentrate maneuver.</p>",
			},
		},
		{
			name: 'Bone Staff',
			type: 'gear',
			img: 'icons/weapons/staves/staff-animal-skull.webp',
			system: {
				description:
					'<p>Adds 4 damage to magic attacks; the first Range effect added costs no difficulty; heals 1 wound when a spell cast with it inflicts wounds.</p>',
				encumbrance: 2,
			},
		},
		POINTY_TEETH,
		{
			name: 'Robed Bone Armor',
			type: 'armor',
			img: 'icons/equipment/chest/breastplate-layered-leather-black.webp',
			system: { soak: 1, defense: 1, encumbrance: 2, state: 'equipped' },
		},
	],
};

/**
 * The salt caravan's wagon, which Aldric drives. Realms of Terrinoth gives a wagon its price, rarity and the 50
 * encumbrance it holds (p. 101) and no vehicle profile: the rest is a horse-drawn cart's, as a GM would make it up.
 * Its Roles name their members by the actor's name.
 */
export const VEHICLE = {
	name: 'Salt Wagon',
	portrait: 'wain.jpg' as Portrait,
	roles: [
		{ name: 'Driver', skills: ['Riding'], members: [CHARACTER.name], pilot: true },
		{ name: 'Lookout', skills: ['Perception', 'Vigilance'], members: [] as string[], pilot: false },
	],
	system: {
		description:
			'<p>A heavy four-wheeled wagon with iron-shod wheels, drawn by two patient draught horses. It carries a dozen sacks of salt from the coast to the mills of the Hollin, and anyone the caravan master can be talked into taking along.</p>',
		source: 'Realms of Terrinoth, p. 101',
		silhouette: 2,
		speed: 1,
		handling: -2,
		defense: 0,
		armor: 1,
		hullTrauma: { value: 2, max: 8 },
		systemStrain: { value: 1, max: 6 },
		complement: '1 driver',
		consumables: 'One week of fodder',
		price: 200,
		rarity: 2,
		passengers: { threshold: 4 },
		encumbrance: { threshold: 50 },
	},
	items: [
		{
			name: 'Sacks of Salt',
			type: 'gear',
			img: 'icons/containers/bags/pack-canvas-white-brown.webp',
			system: { description: '<p>Coarse sea salt, packed for the mills.</p>', encumbrance: 3, quantity: 12, price: 25, rarity: 1 },
		},
	],
};
