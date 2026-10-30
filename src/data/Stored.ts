/**
 * @file A document Foundry stores, which has an id.
 */

/**
 * A document that a world, a compendium or another document stores: unlike a document only built in memory, it has an
 * id and a uuid, which Foundry's types leave nullable on the document classes.
 */
export type Stored<DocumentType> = DocumentType & { readonly id: string; readonly _id: string; readonly uuid: string };
