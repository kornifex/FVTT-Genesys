<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import { QUALITY_RATING_SOURCES, type QualityRatingSource, type SpellQuality } from '@/item/data/Spells';
import { withoutIndex } from '@/arrays';
import { confirmDelete } from '@/operations/ItemActions';

const { document: item, system } = useSheetDocument<GenesysItem<'additionalEffect'>>();

const RATING_SOURCE_LABELS = {
	unrated: 'Genesys.Labels.Unrated',
	fixed: 'Genesys.Labels.FixedRating',
	skillRanks: 'Genesys.Labels.SkillRanksRating',
} as const satisfies Record<QualityRatingSource, string>;

async function changeQuality(index: number, changes: Partial<SpellQuality>) {
	const qualities = system.value.qualities.map((quality, i) => (i === index ? { ...quality, ...changes } : quality));
	await item.value.update({ system: { qualities } });
}

function valueOf(event: Event) {
	return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

async function changeRating(index: number, event: Event) {
	// A rating that isn't a whole number from 1 changes nothing.
	const rating = parseInt(valueOf(event), 10);
	if (rating >= 1) {
		await changeQuality(index, { rating });
	}
}

// The name of a field that shows no label of its own: "Blast Rating", "Blast: Skill".
function ratingLabel(quality: string) {
	return game.i18n.format('Genesys.Labels.QualityRating', { quality });
}

function ratingSourceLabel(quality: string) {
	return game.i18n.format('Genesys.Labels.QualityRatingSource', { quality });
}

function ratingSkillLabel(quality: string) {
	return game.i18n.format('Genesys.Labels.QualityRatingSkill', { quality });
}

// Removing a quality asks first, naming it.
async function removeQuality(index: number) {
	const { name } = system.value.qualities[index];
	// The list may change while the dialog is open: remove the quality it named, or nothing.
	if ((await confirmDelete(name)) && system.value.qualities[index]?.name === name) {
		await item.value.update({ system: { qualities: withoutIndex(system.value.qualities, index) } });
	}
}
</script>

<template>
	<BasicItemSheet>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.AddedDifficulty" name="system.difficulty" :value="system.difficulty" type="number" />

				<DataRow label="Genesys.Labels.StartsChecked" v-slot="{ id }">
					<input :id="id" type="checkbox" name="system.startsChecked" :checked="system.startsChecked" />
				</DataRow>

				<DataRow label="Genesys.Labels.Repeatable" v-slot="{ id }">
					<input :id="id" type="checkbox" name="system.repeatable" :checked="system.repeatable" />
				</DataRow>

				<!-- The tab's one section: an h3, as every section of a tab (§#584). -->
				<h3 class="attack-heading"><Localized label="Genesys.Labels.ForAnAttack" /></h3>

				<!-- Dropped quality items fill the list; their ratings come from where each row says. -->
				<DataRow label="Genesys.Labels.Qualities" group>
					<div class="spell-qualities">
						<div v-for="(quality, index) in system.qualities" :key="quality.name" class="spell-quality">
							<div class="name">{{ quality.name }}</div>
							<select
								class="rating-source"
								:value="quality.ratingSource"
								:aria-label="ratingSourceLabel(quality.name)"
								@change="changeQuality(index, { ratingSource: valueOf($event) as QualityRatingSource })"
							>
								<option v-for="source in QUALITY_RATING_SOURCES" :key="source" :value="source">
									<Localized :label="RATING_SOURCE_LABELS[source]" />
								</option>
							</select>
							<input
								v-if="quality.ratingSource === 'fixed'"
								class="rating"
								type="number"
								min="1"
								:value="quality.rating"
								:aria-label="ratingLabel(quality.name)"
								@change="changeRating(index, $event)"
							/>
							<input
								v-else-if="quality.ratingSource === 'skillRanks'"
								class="rating-skill"
								type="text"
								:value="quality.ratingSkill"
								:aria-label="ratingSkillLabel(quality.name)"
								@change="changeQuality(index, { ratingSkill: valueOf($event).trim() })"
							/>
							<div v-else></div>
							<ActionButton icon="fas fa-trash" label="Genesys.Labels.RemoveQuality" edits @click="removeQuality(index)" />
						</div>
					</div>
				</DataRow>

				<DataRow label="Genesys.Labels.Critical" v-slot="{ id }">
					<!-- Empty for an effect that gives no Critical rating. -->
					<input :id="id" type="number" min="1" name="system.critical" :value="system.critical ?? ''" />
				</DataRow>

				<DataRow label="Genesys.Labels.DoublesDamageCharacteristic" v-slot="{ id }">
					<input
						:id="id"
						type="checkbox"
						name="system.doublesDamageCharacteristic"
						:checked="system.doublesDamageCharacteristic"
					/>
				</DataRow>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/vars/colors.scss';

.attack-heading {
	@include headings.section;
	margin: 0.5em 0 0;
	border-bottom: 1px solid colors.$ink;
}

.spell-quality {
	display: grid;
	grid-template-columns: /* Name */ 1fr /* Rating Source */ auto /* Rating */ 6em /* Delete Button */ auto;
	align-items: center;
	gap: 0 0.5rem;
	border-bottom: 1px dashed colors.$blue;
	padding: 2px;

	&:last-child {
		border-bottom: none;
	}
}
</style>
