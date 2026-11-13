<script lang="ts" setup>
import { computed, useId } from 'vue';
import { CHARACTERISTICS } from '@/data/Characteristics';
import { displayedSkillRules, SKILL_CATEGORIES, SKILL_CATEGORY_LABELS } from '@/data/Skills';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import Localized from '@/vue/components/Localized.vue';
import DataRow from '@/vue/components/DataRow.vue';
import Tooltip from '@/vue/components/Tooltip.vue';

const { document, system } = useSheetDocument<GenesysItem<'skill'>>();
// The system reads a character's skill from the Skills Compendium's skill of the same name, never from the character's copy,
// so the copy's fields show what is read and can't be edited.
const fromCompendium = computed(() => document.value.actor !== null);
const rules = computed(() =>
	fromCompendium.value
		? displayedSkillRules(CONFIG.genesys.skills, document.value.name, CONFIG.genesys.settings.defaultDifficulty)
		: { difficulty: system.value.difficulty, initiative: system.value.initiative },
);
const initiativeId = useId();
const healsWoundsId = useId();
const recoversStrainId = useId();
const difficultyId = useId();
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Characteristic" v-slot="{ id }">
					<select :id="id" name="system.characteristic" :value="system.characteristic">
						<option v-for="{ characteristic, label } in CHARACTERISTICS" :key="characteristic" :value="characteristic">
							<Localized :label="label" />
						</option>
					</select>
				</DataRow>

				<DataRow label="Genesys.Labels.Category" v-slot="{ id }">
					<select :id="id" name="system.category" :value="system.category">
						<option v-for="category in SKILL_CATEGORIES" :key="category" :value="category">
							<Localized :label="SKILL_CATEGORY_LABELS[category]" />
						</option>
					</select>
				</DataRow>

				<div class="row">
					<label :for="initiativeId">
						<Tooltip content="Genesys.Tooltips.IsInitiative" localized
							><Localized label="Genesys.Labels.IsInitiative"
						/></Tooltip>
					</label>
					<Tooltip v-if="fromCompendium" content="Genesys.Tooltips.SkillRulesFromCompendium" localized>
						<input :id="initiativeId" type="checkbox" disabled :checked="rules.initiative" />
					</Tooltip>
					<input v-else :id="initiativeId" type="checkbox" name="system.initiative" :checked="rules.initiative" />
				</div>

				<div class="row">
					<label :for="healsWoundsId">
						<Tooltip content="Genesys.Tooltips.HealsWounds" localized><Localized label="Genesys.Labels.HealsWounds" /></Tooltip>
					</label>
					<input :id="healsWoundsId" type="checkbox" name="system.healsWounds" :checked="system.healsWounds" />
				</div>

				<div class="row">
					<label :for="recoversStrainId">
						<Tooltip content="Genesys.Tooltips.RecoversStrain" localized
							><Localized label="Genesys.Labels.RecoversStrain"
						/></Tooltip>
					</label>
					<input :id="recoversStrainId" type="checkbox" name="system.recoversStrain" :checked="system.recoversStrain" />
				</div>

				<div class="row">
					<label :for="difficultyId">
						<Tooltip content="Genesys.Tooltips.SkillDifficulty" localized
							><Localized label="Genesys.Labels.SkillDifficulty"
						/></Tooltip>
					</label>
					<Tooltip v-if="fromCompendium" content="Genesys.Tooltips.SkillRulesFromCompendium" localized>
						<input :id="difficultyId" type="text" disabled :value="rules.difficulty" />
					</Tooltip>
					<input v-else :id="difficultyId" type="text" name="system.difficulty" :value="rules.difficulty" />
				</div>

				<DataRow label="Genesys.Labels.Source" name="system.source" :value="system.source" />
			</section>
		</template>
	</BasicItemSheet>
</template>
