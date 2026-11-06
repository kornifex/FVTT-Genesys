<script lang="ts" setup>
import { computed } from 'vue';
import type { CharacteristicsContainer } from '@/data/Characteristics';
import { damageLabel, RANGE_LABELS, type RangeBand } from '@/item/Weapons';
import Localized from '@/vue/components/Localized.vue';

/**
 * The damage, Critical rating and range of a Weapon Profile, or of a vehicle weapon's single profile, as every sheet
 * shows them: in the cells of a row of the Combat tabs' grid (`grid`), or after their labels in a row's details
 * (`inline`). The damage reads `Br+1 (3)` when a characteristic adds to it, its total otherwise. The elements are the
 * component's roots, so that they take their place among the row's own cells or details.
 */
const props = withDefaults(
	defineProps<{
		layout: 'grid' | 'inline';
		/**
		 * The profile shown. Left out by the grid's header row, which shows the labels instead.
		 */
		profile?: Parameters<typeof damageLabel>[0] & { critical: number; range: RangeBand };
		/**
		 * The characteristics of the actor holding the weapon: an actor without any, like a vehicle, adds none.
		 */
		characteristics?: CharacteristicsContainer;
		/**
		 * Whether the grid's cells show the columns' labels, for the header row of the grid.
		 */
		labels?: boolean;
	}>(),
	{ labels: false },
);

const damage = computed(() => (props.profile ? damageLabel(props.profile, props.characteristics, game.i18n) : ''));
</script>

<template>
	<template v-if="layout === 'grid' && labels">
		<div class="damage"><Localized label="Genesys.Labels.Damage" /></div>
		<div class="critical"><Localized label="Genesys.Labels.Critical" /></div>
		<div class="range"><Localized label="Genesys.Labels.Range" /></div>
	</template>

	<template v-else-if="layout === 'grid' && profile">
		<div class="damage">{{ damage }}</div>
		<div class="critical">{{ profile.critical }}</div>
		<div class="range"><Localized :label="RANGE_LABELS[profile.range]" /></div>
	</template>

	<template v-else-if="profile">
		<!-- prettier-ignore -->
		<span class="damage"><Localized label="Genesys.Labels.Damage" /> {{ damage }}</span>
		<!-- prettier-ignore -->
		<span class="critical"><Localized label="Genesys.Labels.Critical" /> {{ profile.critical }}</span>
		<!-- prettier-ignore -->
		<span class="range"><Localized label="Genesys.Labels.Range" /> <Localized :label="RANGE_LABELS[profile.range]" /></span>
	</template>
</template>
