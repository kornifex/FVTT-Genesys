/**
 * @file Utility type to mark Document DataModel instances that have custom preCreate callbacks.
 */

/**
 * A DataModel that prepares its document before Foundry creates it. The document hands on the data and options of its
 * own `_preCreate`, which no DataModel reads.
 */
export type HasPreCreate<DocumentType> = {
	preCreate?(document: DocumentType, data: unknown, options: unknown, user: User.Stored): Promise<void>;
};
