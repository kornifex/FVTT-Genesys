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
import { enrich } from '@/enrich';
import { damageFormula, firingArcLabels, RANGE_LABELS } from '@/item/Weapons';

/**
 * The label of each activation type of an ability or a talent.
 */
const ACTIVATION_LABELS: Record<AbilityDataModel['activation']['type'], string> = {
	passive: 'Genesys.Labels.Passive',
	active: 'Genesys.Labels.Active',
};

type Source<Type extends string, System> = { type: Type; img: string | null; name: string; system: System };

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
		system: ItemSource['system'];
		description: string;
		weapon?: { skill: string; range: string; damage: string; firingArc?: string };
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

	const { description, activation } = item.system;

	return {
		template: 'systems/genesys/templates/chat/ability.hbs',
		data: {
			img: item.img,
			name: item.name,
			description,
			activation: { label: ACTIVATION_LABELS[activation.type], detail: activation.detail },
			...(item.type === 'talent' && {
				effectiveTier: item.system.effectiveTier,
				ranked: item.system.ranked === 'yes',
				rank: item.system.rank,
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
	const content = await foundry.applications.handlebars.renderTemplate(template, {
		...data,
		description: await enrich(data.description),
		...('qualities' in data && data.qualities && { qualities: await enrichedQualities(data.qualities) }),
	});

	await ChatMessage.create({
		// The actor whose sheet sends the card is stored.
		speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
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
		qualities.map(async (quality) => ({
			...quality,
			description: await enrich(quality.description),
		})),
	);
}

function itemCard(item: ItemSource, i18n: Localizer): ItemCard {
	const card: ItemCard = {
		template: 'systems/genesys/templates/chat/item.hbs',
		data: { img: item.img, name: item.name, type: item.type, system: item.system, description: item.system.description },
	};

	if (item.type === 'weapon') {
		const { skills } = item.system;
		const { baseDamage, characteristic } = damageFormula(item.system);
		card.data.weapon = {
			skill: skills[0] ?? '-',
			range: i18n.localize(RANGE_LABELS[item.system.range]),
			damage: baseDamage.toString() + (characteristic ? ' + ' + i18n.localize(characteristic) : ''),
		};
	} else if (item.type === 'vehicleWeapon') {
		const { skills, firingArc } = item.system;
		card.data.weapon = {
			skill: skills[0] ?? '-',
			range: i18n.localize(RANGE_LABELS[item.system.range]),
			damage: damageFormula(item.system).baseDamage.toString(),
			firingArc: firingArcLabels(firingArc)
				.map((label) => i18n.localize(label))
				.join(', '),
		};
	}

	if ('qualities' in item.system) {
		// Copies, so the card never writes into the item's qualities.
		card.data.qualities = item.system.qualities.map((quality) => ({ ...quality }));
	}

	return card;
}
