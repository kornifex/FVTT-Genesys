<script lang="ts" setup>
import { ref, useId } from 'vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import Editor from '@/vue/components/Editor.vue';
import Localized from '@/vue/components/Localized.vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import type { GenesysItem } from '@/item/GenesysItem';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { withQualityChanged, withQualityRating } from '@/item/data/Qualities';
import { ACTIVATION_TYPES } from '@/data/schemaFields';
import { withoutIndex } from '@/arrays';
import { confirmDelete } from '@/operations/ItemActions';
import { addQualityEffect } from '@/operations/QualityEffects';

/**
 * The qualities of a weapon's profile or of an armor, each with its rating and its removal, which open to edit the
 * quality in full: its activation, the Advantage an active one costs, its description, and an effect to add to it, which
 * the item's Effects tab lists. Each change is emitted as the new list.
 */
const props = defineProps<{
	qualities: readonly ContainedItemQuality[];
	/**
	 * The path of the list in the item's data, which the descriptions' editors read: `system.qualities` for a weapon's
	 * main profile or an armor.
	 */
	path: string;
}>();

const emit = defineEmits<{
	(e: 'change', qualities: ContainedItemQuality[]): void;
}>();

const { document: item } = useSheetDocument<GenesysItem<'weapon' | 'vehicleWeapon' | 'armor'>>();
const id = useId();

const ACTIVATION_LABELS = { passive: 'Genesys.Labels.Passive', active: 'Genesys.Labels.Active' } as const satisfies Record<
	(typeof ACTIVATION_TYPES)[number],
	string
>;

// The qualities shown in full, by their name, which is unique in the list whatever its case.
const opened = ref(new Set<string>());
const keyOf = (quality: ContainedItemQuality) => quality.name.toLowerCase();

function toggle(quality: ContainedItemQuality) {
	const key = keyOf(quality);
	if (!opened.value.delete(key)) {
		opened.value.add(key);
	}
}

function change(qualities: ContainedItemQuality[] | undefined) {
	if (qualities) {
		emit('change', qualities);
	}
}

function changeQuality(index: number, changes: Partial<ContainedItemQuality>) {
	change(withQualityChanged(props.qualities, index, changes));
}

// The name of a quality's rating field, which shows no label of its own: "Pierce Rating".
function qualityRatingLabel(quality: string) {
	return game.i18n.format('Genesys.Labels.QualityRating', { quality });
}

function qualityDetailsLabel(quality: string) {
	return game.i18n.format('Genesys.Labels.QualityDetails', { quality });
}

function valueOf(event: Event) {
	return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function updateRating(index: number, event: Event) {
	// A rating that isn't a number changes nothing.
	change(withQualityRating(props.qualities, index, parseInt(valueOf(event), 10)));
}

function updateAdvantageCost(index: number, event: Event) {
	const cost = parseInt(valueOf(event), 10);
	if (!Number.isNaN(cost) && cost >= 0) {
		changeQuality(index, { advantageCost: cost });
	}
}

// Removing a quality asks first, naming it.
async function removeQuality(index: number) {
	const { name } = props.qualities[index];
	// The list may change while the dialog is open: remove the quality it named, or nothing.
	if ((await confirmDelete(name)) && props.qualities[index]?.name === name) {
		change(withoutIndex(props.qualities, index));
	}
}

// A quality stored before its copies had ids gets one with its first effect, which the effect is tagged with.
async function addEffect(index: number) {
	let quality = props.qualities[index];
	if (!quality.id) {
		quality = { ...quality, id: foundry.utils.randomID() };
		changeQuality(index, { id: quality.id });
	}
	await addQualityEffect(item.value, quality);
}
</script>

<template>
	<div v-for="(quality, index) in qualities" :key="keyOf(quality)" class="quality">
		<div class="data-rated">
			<div>{{ quality.name }}</div>
			<div>
				<span v-if="quality.isRated"
					><input
						type="text"
						:value="quality.rating"
						:aria-label="qualityRatingLabel(quality.name)"
						@blur="updateRating(index, $event)"
				/></span>
			</div>
			<ActionButton icon="fas fa-trash" label="Genesys.Labels.RemoveQuality" edits @click="removeQuality(index)" />
			<ActionButton
				:icon="opened.has(keyOf(quality)) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
				:localized-label="qualityDetailsLabel(quality.name)"
				:expanded="opened.has(keyOf(quality))"
				@click="toggle(quality)"
			/>
		</div>

		<div v-if="opened.has(keyOf(quality))" class="details">
			<div class="field">
				<label :for="`${id}-${index}-activation`"><Localized label="Genesys.Labels.Activation" /></label>
				<select
					:id="`${id}-${index}-activation`"
					:value="quality.activation"
					@change="changeQuality(index, { activation: valueOf($event) as ContainedItemQuality['activation'] })"
				>
					<option v-for="activation in ACTIVATION_TYPES" :key="activation" :value="activation">
						<Localized :label="ACTIVATION_LABELS[activation]" />
					</option>
				</select>
			</div>

			<div v-if="quality.activation === 'active'" class="field">
				<label :for="`${id}-${index}-cost`"><Localized label="Genesys.Labels.AdvantageCost" /></label>
				<input
					:id="`${id}-${index}-cost`"
					type="number"
					min="0"
					:value="quality.advantageCost"
					@change="updateAdvantageCost(index, $event)"
				/>
			</div>

			<Editor :name="`${path}.${index}.description`" :save="(description: string) => changeQuality(index, { description })" />

			<ActionButton class="add-effect" icon="fas fa-plus" edits @click="addEffect(index)">
				<Localized label="Genesys.Labels.AddQualityEffect" />
			</ActionButton>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.quality {
	border-bottom: 1px dashed colors.$blue;

	&:last-child {
		border-bottom: none;
	}
}

.data-rated {
	display: grid;
	grid-template-columns: /* Name */ 2fr /* Rating */ 1fr /* Delete Button */ auto /* Details Button */ auto;
	align-items: center;
	gap: 0 0.5rem;
	padding: 2px;
}

.details {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	padding: 0.25rem 0 0.5rem 0.5rem;

	.field {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
	}

	.editor {
		min-height: 6rem;
	}

	.add-effect {
		align-self: flex-start;
	}
}
</style>
