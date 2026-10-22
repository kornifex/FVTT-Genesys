/** @file The cards that post a talent, an ability or an item to chat. */
import type { GenesysActor } from '@/actor/GenesysActor';
import type { GenesysItem } from '@/item/GenesysItem';
import type { AbilityDataModel } from '@/item/data/AbilityDataModel';
import type { TalentDataModel } from '@/item/data/TalentDataModel';
import type { ArmorDataModel } from '@/item/data/ArmorDataModel';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import type { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';
import type { Characteristic } from '@/data/Characteristics';

/**
 * The label of each activation type of an ability or a talent.
 */
const ACTIVATION_LABELS: Record<AbilityDataModel['activation']['type'], string> = {
	passive: 'Genesys.Labels.Passive',
	active: 'Genesys.Labels.Active',
};

/**
 * The abbreviation of each characteristic a weapon adds to its damage.
 */
const CHARACTERISTIC_ABBREVIATIONS: Record<Characteristic, string> = {
	brawn: 'Genesys.CharacteristicAbbr.Brawn',
	agility: 'Genesys.CharacteristicAbbr.Agility',
	intellect: 'Genesys.CharacteristicAbbr.Intellect',
	cunning: 'Genesys.CharacteristicAbbr.Cunning',
	willpower: 'Genesys.CharacteristicAbbr.Willpower',
	presence: 'Genesys.CharacteristicAbbr.Presence',
};

/**
 * The label of each arc a vehicle weapon can fire in.
 */
const FIRING_ARC_LABELS: Record<keyof VehicleWeaponDataModel['firingArc'], string> = {
	fore: 'Genesys.FiringArc.Fore',
	aft: 'Genesys.FiringArc.Aft',
	port: 'Genesys.FiringArc.Port',
	starboard: 'Genesys.FiringArc.Starboard',
};

type Source<Type extends string, SystemData> = { type: Type; img: string | null; name: string; systemData: SystemData };

/**
 * What a card reads of the item it posts.
 */
export type CardSource =
	| Source<'ability', Pick<AbilityDataModel, 'description' | 'activation'>>
	| Source<'talent', Pick<TalentDataModel, 'description' | 'activation' | 'effectiveTier' | 'ranked' | 'rank'>>
	| ItemSource;

type ItemSource =
	| Source<'armor', Pick<ArmorDataModel, 'description' | 'defense' | 'soak' | 'qualities'>>
	| Source<
			'weapon',
			Pick<WeaponDataModel, 'description' | 'skills' | 'range' | 'baseDamage' | 'damageCharacteristic' | 'critical' | 'qualities'>
	  >
	| Source<
			'vehicleWeapon',
			Pick<VehicleWeaponDataModel, 'description' | 'skills' | 'range' | 'baseDamage' | 'critical' | 'firingArc' | 'qualities'>
	  >
	| Source<'consumable' | 'gear' | 'container', Pick<EquipmentDataModel, 'description'>>;

type AbilityCard = {
	template: 'systems/genesys/templates/chat/ability.hbs';
	data: {
		img: string | null;
		name: string;
		description: string;
		activation: { label: string; detail: string };
		effectiveTier?: number;
		ranked?: boolean;
		rank?: number;
	};
};

/**
 * The card of an item of the inventory.
 */
export type ItemCard = {
	template: 'systems/genesys/templates/chat/item.hbs';
	data: {
		img: string | null;
		name: string;
		type: ItemSource['type'];
		system: ItemSource['systemData'];
		description: string;
		weapon?: { skill: string; damage: string; firingArc?: string };
		qualities?: ContainedItemQuality[];
	};
};

/**
 * The localization function the card's text is written with.
 */
type Localizer = { localize(key: string): string };

/**
 * The template of an item's chat card and the data it is rendered with. Descriptions are left as they are saved, for
 * the poster to enrich.
 */
export function chatCard(item: CardSource, i18n: Localizer): AbilityCard | ItemCard {
	if (item.type !== 'ability' && item.type !== 'talent') {
		return itemCard(item, i18n);
	}

	const { description, activation } = item.systemData;

	return {
		template: 'systems/genesys/templates/chat/ability.hbs',
		data: {
			img: item.img,
			name: item.name,
			description,
			activation: { label: ACTIVATION_LABELS[activation.type], detail: activation.detail },
			...(item.type === 'talent' && {
				effectiveTier: item.systemData.effectiveTier,
				ranked: item.systemData.ranked === 'yes',
				rank: item.systemData.rank,
			}),
		},
	};
}

/**
 * Posts an item's chat card, spoken by the actor whose sheet sends it.
 */
export async function postChatCard(item: GenesysItem, actor: GenesysActor) {
	// An item's type names its data model, which holds what its card reads.
	const { template, data } = chatCard(item as unknown as CardSource, game.i18n);
	const content = await renderTemplate(template, {
		...data,
		description: await TextEditor.enrichHTML(data.description, { async: true }),
		...('qualities' in data && data.qualities && { qualities: await enrichedQualities(data.qualities) }),
	});

	await ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
		style: CONST.CHAT_MESSAGE_STYLES.IC,
	});
}

/**
 * Copies of qualities with their descriptions enriched for a chat message. The weapon and armor sheets save their
 * item's qualities as they find them, so enriching those in place would save the rendered links over the enrichers.
 */
export function enrichedQualities(qualities: ContainedItemQuality[]) {
	return Promise.all(
		qualities.map(async (quality) => ({ ...quality, description: await TextEditor.enrichHTML(quality.description, { async: true }) })),
	);
}

function itemCard(item: ItemSource, i18n: Localizer): ItemCard {
	const card: ItemCard = {
		template: 'systems/genesys/templates/chat/item.hbs',
		data: { img: item.img, name: item.name, type: item.type, system: item.systemData, description: item.systemData.description },
	};

	if (item.type === 'weapon') {
		const { skills, baseDamage, damageCharacteristic } = item.systemData;
		card.data.weapon = {
			skill: skills[0] ?? '-',
			damage:
				damageText(baseDamage) +
				(damageCharacteristic !== '-' ? ' + ' + i18n.localize(CHARACTERISTIC_ABBREVIATIONS[damageCharacteristic]) : ''),
		};
	} else if (item.type === 'vehicleWeapon') {
		const { skills, baseDamage, firingArc } = item.systemData;
		card.data.weapon = {
			skill: skills[0] ?? '-',
			damage: damageText(baseDamage),
			firingArc: firingArcLabels(firingArc, i18n).join(', '),
		};
	}

	if ('qualities' in item.systemData) {
		// Copies, so the card never writes into the item's qualities.
		card.data.qualities = item.systemData.qualities.map((quality) => ({ ...quality }));
	}

	return card;
}

/**
 * The localized labels of a vehicle weapon's firing arc: all, none, or each arc it fires in.
 */
export function firingArcLabels(firingArc: VehicleWeaponDataModel['firingArc'], i18n: Localizer) {
	const allArcs = Object.keys(FIRING_ARC_LABELS) as (keyof typeof FIRING_ARC_LABELS)[];
	const arcs = allArcs.filter((arc) => firingArc[arc]);

	if (arcs.length === allArcs.length) {
		return [i18n.localize('Genesys.FiringArc.All')];
	} else if (arcs.length === 0) {
		return [i18n.localize('Genesys.FiringArc.None')];
	} else {
		return arcs.map((arc) => i18n.localize(FIRING_ARC_LABELS[arc]));
	}
}

function damageText(baseDamage: number | null) {
	// The weapon sheets save an emptied damage field as null.
	return (baseDamage ?? 0).toString();
}
