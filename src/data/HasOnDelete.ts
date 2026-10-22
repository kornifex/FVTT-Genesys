/**
 * @file Utility type to mark Document DataModel instances that have custom onDelete callbacks.
 */

export type HasOnDelete<DocumentType extends foundry.abstract.Document> = {
	onDelete?(document: DocumentType, options: DocumentModificationContext<DocumentType>, userId: string): void;
};
