<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import DataRow from '@/vue/components/DataRow.vue';
import QualityRows from '@/vue/components/item/QualityRows.vue';
import AttachmentRows from '@/vue/components/item/AttachmentRows.vue';
import EffectiveStats from '@/vue/components/item/EffectiveStats.vue';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import type { ContainedAttachment } from '@/item/data/Attachments';
import { hardPoints } from '@/item/HardPoints';

// The fields show the stored values, which the armor's effects may change (its attachments').
const { document: item, system, source } = useSheetDocument<GenesysItem<'armor'>>();

const ARMOR_STATS = ['defense', 'soak', 'encumbrance'] as const;

const itemHardPoints = computed(() => hardPoints(source.value));

async function updateQualities(qualities: ContainedItemQuality[]) {
	await item.value.update({ system: { qualities } });
}

async function updateAttachments(attachments: ContainedAttachment[]) {
	await item.value.update({ system: { attachments } });
}
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<section class="data-grid">
				<DataRow label="Genesys.Labels.Defense" name="system.defense" :value="source.defense" type="number" />

				<DataRow label="Genesys.Labels.Soak" name="system.soak" :value="source.soak" type="number" />

				<EquipmentRows :system="source" hard-points />

				<EffectiveStats :stored="source" :prepared="system" :fields="ARMOR_STATS" />

				<DataRow label="Genesys.Labels.Qualities" group>
					<div>
						<QualityRows :qualities="system.qualities" path="system.qualities" @change="updateQualities" />
					</div>
				</DataRow>

				<DataRow label="Genesys.Labels.Attachments" group>
					<div class="attachments">
						<AttachmentRows :attachments="system.attachments" :hard-points="itemHardPoints" @change="updateAttachments" />
					</div>
				</DataRow>
			</section>
		</template>
	</BasicItemSheet>
</template>
