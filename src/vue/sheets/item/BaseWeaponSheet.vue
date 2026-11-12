<script lang="ts" setup>
import { computed } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import BasicItemSheet from '@/vue/sheets/item/BasicItemSheet.vue';
import EquipmentRows from '@/vue/components/item/EquipmentRows.vue';
import WeaponProfileFields from '@/vue/components/item/WeaponProfileFields.vue';
import DataRow from '@/vue/components/DataRow.vue';
import AttachmentRows from '@/vue/components/item/AttachmentRows.vue';
import EffectiveStats from '@/vue/components/item/EffectiveStats.vue';
import type { WeaponProfileData } from '@/item/WeaponProfiles';
import type { ContainedAttachment } from '@/item/data/Attachments';
import type { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { hardPoints } from '@/item/HardPoints';

// The fields show the stored values, which the weapon's effects may change (its attachments').
const { document: item, system, source } = useSheetDocument<GenesysItem<'weapon' | 'vehicleWeapon'>>();

const MAIN_PROFILE_STATS = ['baseDamage', 'critical', 'encumbrance'] as const;

// A vehicle weapon has no Hard Points, nor attachments: a vehicle's own are a vehicle rule.
const weapon = computed(() =>
	item.value.type === 'weapon' ? { system: system.value as WeaponDataModel, source: source.value as WeaponDataModel } : undefined,
);

// The main profile's lists, which the sheet's form doesn't submit, are the weapon's own fields.
async function updateMainProfile(changes: Partial<WeaponProfileData>) {
	await item.value.update({ system: changes });
}

async function updateAttachments(attachments: ContainedAttachment[]) {
	await item.value.update({ system: { attachments } });
}
</script>

<template>
	<BasicItemSheet show-effects-tab>
		<template v-slot:data>
			<!-- A tab's own sections fill it (nav.scss): wrapped, each Weapon Profile's block is as tall as its rows, the next
			 one right under it, whatever the window's height. -->
			<div class="weapon-profiles">
				<section class="data-grid">
					<slot name="extra-data" />

					<WeaponProfileFields :profile="source" named @change="updateMainProfile">
						<EquipmentRows :system="source" :hard-points="!!weapon" />

						<EffectiveStats :stored="source" :prepared="system" :fields="MAIN_PROFILE_STATS" />
					</WeaponProfileFields>

					<DataRow v-if="weapon" label="Genesys.Labels.Attachments" group>
						<div class="attachments">
							<AttachmentRows
								:attachments="weapon.system.attachments"
								:hard-points="hardPoints(weapon.source)"
								@change="updateAttachments"
							/>
						</div>
					</DataRow>
				</section>

				<slot name="profiles" />
			</div>
		</template>
	</BasicItemSheet>
</template>
