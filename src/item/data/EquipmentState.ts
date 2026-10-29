/**
 * Where a piece of equipment is (GLOSSARY: Equipment State).
 */
export const EquipmentState = {
	Carried: 'carried',
	Dropped: 'dropped',
	Equipped: 'equipped',
} as const;

export type EquipmentState = (typeof EquipmentState)[keyof typeof EquipmentState];
