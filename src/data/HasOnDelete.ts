/**
 * @file Utility type to mark Document DataModel instances that have custom onDelete callbacks.
 */

/**
 * A DataModel that cleans up after its document is deleted. The document hands on the options of its own `_onDelete`,
 * which no DataModel reads.
 */
export type HasOnDelete<DocumentType> = {
	onDelete?(document: DocumentType, options: unknown, userId: string): void;
};
