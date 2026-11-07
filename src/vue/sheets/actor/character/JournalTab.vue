<script lang="ts" setup>
import { useId } from 'vue';
import { ENTRY_LABELS, Entry as JournalEntry, EntryType as JournalEntryType } from '@/actor/data/character/ExperienceJournal';
import { advance, awardXP } from '@/actor/data/character/Advancement';
import { undoJournalEntry } from '@/operations/JournalUndo';
import { CHARACTERISTIC_LABELS } from '@/data/Characteristics';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysActor } from '@/actor/GenesysActor';
import ActionButton from '@/vue/components/ActionButton.vue';
import Localized from '@/vue/components/Localized.vue';
import RowActions from '@/vue/components/RowActions.vue';
import Editor from '@/vue/components/Editor.vue';
import { AwardXPPrompt } from '@/app/AwardXPPrompt';
import XPContainer from '@/vue/components/character/XPContainer.vue';
import Motivations from '@/vue/components/Motivations.vue';

const { document: actor, system } = useSheetDocument<GenesysActor<'character'>>();

// The character's details, in the order the description shows them.
const DETAILS = [
	{ field: 'gender', label: 'Genesys.Labels.Pronouns' },
	{ field: 'age', label: 'Genesys.Labels.Age' },
	{ field: 'height', label: 'Genesys.Labels.Height' },
	{ field: 'build', label: 'Genesys.Labels.Build' },
	{ field: 'hair', label: 'Genesys.Labels.Hair' },
	{ field: 'eyes', label: 'Genesys.Labels.Eyes' },
] as const;

const detailsId = useId();

// The illustration is named for what it is: it shows whatever image the user picked.
const illustrationName = game.i18n.localize('Genesys.Labels.CharacterIllustration');

async function addXPJournalEntry() {
	const award = await AwardXPPrompt.promptForXPAward();
	if (!award) {
		return;
	}

	await advance(actor.value, (character) => awardXP(character, award.amount, award.reason));
}

async function removeJournalEntry(index: number) {
	await undoJournalEntry(actor.value, index);
}

function journalEntryFormatArgs(entry: JournalEntry): Record<string, string | number> | undefined {
	if (entry.type !== JournalEntryType.Characteristic) {
		// The fields of an entry's data are strings and numbers.
		return entry.data as Record<string, string | number> | undefined;
	}

	return {
		...entry.data,
		characteristic: game.i18n.localize(CHARACTERISTIC_LABELS[entry.data.characteristic]),
	};
}
</script>

<template>
	<section class="tab-journal">
		<section class="motivations">
			<h3><Localized label="Genesys.Labels.Motivations" /></h3>

			<Motivations :motivations="system.motivations" />
		</section>

		<section class="description">
			<div class="block">
				<h3><Localized label="Genesys.Labels.CharacterIllustration" /></h3>
				<img :src="system.illustration" data-edit="system.illustration" :alt="illustrationName" />
			</div>

			<div class="block">
				<h3><Localized label="Genesys.Labels.CharacterDescription" /></h3>

				<div class="desc-box">
					<template v-for="{ field, label } in DETAILS" :key="field">
						<label :for="`${detailsId}-${field}`"><Localized :label="label" /></label>
						<input :id="`${detailsId}-${field}`" type="text" :name="`system.details.${field}`" :value="system.details[field]" />

						<div class="underline" />
					</template>

					<div class="notable-features">
						<label :for="`${detailsId}-notableFeatures`"><Localized label="Genesys.Labels.NotableFeatures" /></label>
						<textarea
							:id="`${detailsId}-notableFeatures`"
							name="system.details.notableFeatures"
							:value="system.details.notableFeatures"
						/>
					</div>
				</div>
			</div>
		</section>

		<section class="player-notes">
			<h3><Localized label="Genesys.Labels.Notes" /></h3>

			<Editor name="system.notes" />
		</section>

		<section class="xp-journal">
			<h3><Localized label="Genesys.Labels.XPJournal" /></h3>

			<div class="columns">
				<div><Localized label="Genesys.RewardsPrompt.Reason" /></div>
				<div />
				<div><Localized label="Genesys.RewardsPrompt.Amount" /></div>
				<div>
					<ActionButton icon="fas fa-plus" label="Genesys.XPJournal.AddEntry" edits @click="addXPJournalEntry" />
				</div>
			</div>

			<div class="entries">
				<!-- An entry's menu undoes it, in a dialog that says what the undo does; the Starting XP can't be undone, and
				has no menu. -->
				<RowActions
					v-for="(entry, index) in system.experienceJournal.entries"
					:key="index"
					class="entry"
					:deletable="entry.type !== JournalEntryType.Starting"
					:removal="{ label: 'Genesys.XPJournal.UndoEntry', run: () => removeJournalEntry(index) }"
				>
					<div>
						<Localized :label="ENTRY_LABELS[entry.type]" :format-args="journalEntryFormatArgs(entry)" enriched />
					</div>
					<div class="value">{{ entry.amount }}</div>
				</RowActions>
			</div>
		</section>

		<section class="experience">
			<XPContainer label="Genesys.Labels.TotalXP" :value="system.totalXP" />
			<XPContainer label="Genesys.Labels.AvailableXP" :value="system.availableXP" />
		</section>
	</section>
</template>

<style lang="scss" scoped>
@use '@scss/mixins/headings.scss';
@use '@scss/mixins/reset.scss';
@use '@scss/vars/colors.scss';

.tab-journal {
	display: grid;
	grid-template-columns: 1fr min(33%, 250px);
	grid-template-rows: /* Motivations */ auto /* Notes */ auto /* XP Journal */ 1fr /* Experience Fields */ auto;
	gap: 0.5em;
	padding: 0.5em;

	section {
		background: colors.alpha(colors.$light-blue, 0.2);
		border-radius: 1em;
		padding: 0.75em;

		&.experience {
			background: none;
			grid-column: 1 / span all;
			display: grid;
			grid-template-columns: auto 1fr auto;
			width: 100%;
		}
	}

	.block {
		display: grid;
		grid-template-rows: auto 1fr;
	}

	img {
		border: none;
		object-fit: cover;
		width: 100%;
		height: 100%;
		min-height: 100px;

		&[src=''] {
			background: colors.alpha(colors.$gold, 0.5);
		}
	}

	.motivations {
		container: motivations / inline-size;
		grid-column: 1 / span 1;
		grid-row: 1 / span 1;
		height: 100%;
	}

	.description {
		grid-column: 2 / span 1;
		grid-row: 1 / span 1;
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 0.5em;

		.desc-box {
			display: grid;
			grid-template-columns: auto 1fr;
			grid-template-rows: repeat(6, auto 1px) 1fr;
			border: 1px solid colors.$ink;
			background: colors.$field;
			align-items: center;
			column-gap: 0.5em;

			label {
				margin-left: 0.25em;
				font-family: 'Roboto Condensed', sans-serif;
				text-transform: uppercase;
				font-weight: 600;
				font-size: 0.8em;
			}

			@include reset.input;
			input {
				padding-left: 0.25em;
				font-family: 'Roboto', sans-serif;
			}

			.underline {
				grid-column: 1 / span all;
				width: 80%;
				height: 100%;
				background: colors.$ink;
			}

			.notable-features {
				display: flex;
				grid-column: 1 / span all;
				width: 100%;
				min-height: 100%;
				height: 100%;
				flex-direction: column;

				textarea {
					height: 100%;
					width: 100%;
					resize: vertical;
					border: none;
					background: none;
					font-family: 'Roboto', sans-serif;
				}
			}
		}
	}

	.player-notes {
		grid-column: 1 / span 2;
		grid-row: 2 / span 1;
		display: flex;
		flex-direction: column;
		min-height: 100px;

		.editor {
			background: colors.$field;
			border: 1px solid colors.$ink;
		}
	}

	.xp-journal {
		grid-column: 1 / span 2;
		grid-row: 3 / span 1;
	}
}

.xp-journal {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;

	.entries {
		display: flex;
		flex-direction: column-reverse;
		flex-wrap: nowrap;
		overflow-y: scroll;
		min-height: 1em;
		max-height: 250px;
		border: 1px solid colors.$ink;
		background: colors.$field;
	}

	.columns,
	.entry {
		display: grid;
		grid-template-columns: /* Name */ auto /* Spacer */ 1fr /* Amount */ auto /* Delete */ 1.5rem;
		justify-items: center;
	}

	.columns {
		@include headings.font;
		font-size: 0.8em;

		& > div:first-of-type {
			padding-left: 0.5em;
		}
	}

	.entry {
		padding: 0.25em;

		// The entry's ⋮ is its menu's own, which :deep() reaches.
		:deep(.menu-trigger) {
			grid-column: 4 / span 1;
		}

		.value {
			grid-column: 3 / span 1;
		}

		&:nth-of-type(2n) {
			background: colors.alpha(colors.$light-blue, 0.2);
		}
	}
}
</style>
