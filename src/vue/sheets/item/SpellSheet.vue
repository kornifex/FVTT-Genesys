<script lang="ts" setup>
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import ActionButton from '@/vue/components/ActionButton.vue';
import AdditionalEffectRows from '@/vue/components/item/AdditionalEffectRows.vue';
import { type ContainedAdditionalEffect, SPELL_ACTION_LABELS, type SpellAction, withAction } from '@/item/data/Spells';
import { DIFFICULTY_LABELS, FORMIDABLE } from '@/dice/Difficulty';
import { withoutIndex } from '@/arrays';

const { document: item, system } = useSheetDocument<GenesysItem<'spell'>>();

// Simple to Formidable: a spell's difficulty is never Impossible, its effects stop at Formidable (CRB p. 214).
const DIFFICULTIES = DIFFICULTY_LABELS.slice(0, FORMIDABLE + 1);

// Picking an action fills its difficulty, attack flag and skills, which the fields below still edit.
async function changeAction(event: Event) {
	await item.value.update({ system: withAction((event.target as HTMLSelectElement).value as SpellAction) });
}

async function removeSkill(index: number) {
	await item.value.update({ system: { skills: withoutIndex(system.value.skills, index) } });
}

async function updateAdditionalEffects(additionalEffects: ContainedAdditionalEffect[]) {
	await item.value.update({ system: { additionalEffects } });
}
</script>

<template>
	<BasicItemSheet>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.SpellAction" v-slot="{ id }">
					<!-- Unnamed: the form doesn't submit it, `changeAction` writes it with what it fills. -->
					<select :id="id" class="spell-action" :value="system.action" @change="changeAction">
						<option v-for="(label, action) in SPELL_ACTION_LABELS" :key="action" :value="action">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.Difficulty" v-slot="{ id }">
					<select :id="id" class="spell-difficulty" name="system.difficulty" :value="system.difficulty" data-dtype="Number">
						<option v-for="(label, level) in DIFFICULTIES" :key="level" :value="level">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.IsAttack" v-slot="{ id }">
					<input :id="id" class="spell-is-attack" type="checkbox" name="system.isAttack" :checked="system.isAttack" />
				</DataRow>

				<DataRow
					v-if="system.isAttack"
					label="Genesys.Labels.BaseDamage"
					name="system.baseDamage"
					:value="system.baseDamage"
					type="number"
				/>

				<DataRow label="Genesys.Labels.Skills" group>
					<div class="spell-skills">
						<div v-for="(skill, index) in system.skills" :key="skill" class="data">
							<div>{{ skill }}</div>
							<ActionButton icon="fas fa-trash" label="Genesys.Labels.RemoveSkill" edits @click="removeSkill(index)" />
						</div>
					</div>
				</DataRow>

				<DataRow label="Genesys.Labels.AdditionalEffects" group>
					<div class="additional-effects">
						<AdditionalEffectRows :additional-effects="system.additionalEffects" @change="updateAdditionalEffects" />
					</div>
				</DataRow>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>

<style lang="scss" scoped>
@use '@scss/vars/colors.scss';

.spell-skills .data {
	display: grid;
	grid-template-columns: /* Name */ 1fr /* Delete Button */ auto;
	align-items: center;
	border-bottom: 1px dashed colors.$blue;
	padding: 2px;

	&:last-child {
		border-bottom: none;
	}
}
</style>
