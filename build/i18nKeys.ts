/** @file Finds the localization keys a source file refers to, and compares them with the keys of the language files. */

const NAMESPACE = /^(?:Genesys|TYPES)\./;

/**
 * A Handlebars `concat` subexpression, a template literal whose interpolations stand for a part of the key, or a key that fills a quoted string.
 * A quoted key ending with a dot is the start of a concatenation.
 */
const KEY_REFERENCE = /\(concat((?:\s+(?:'[^']*'|"[^"]*"|\([^()]*\)|[^\s()'"]+))+)\s*\)|`((?:Genesys|TYPES)\.(?:[\w.]|\$\{[^}]*\})*)`|(['"])((?:Genesys|TYPES)\.[\w.]*)\3/g;

/** A `concat` argument is a quoted string or a value computed at runtime. */
const CONCAT_ARGUMENT = /'([^']*)'|"([^"]*)"|\([^()]*\)|[^\s()'"]+/g;

/**
 * The localization keys `source` refers to, in order of appearance. A part of a key computed at runtime becomes a `*` wildcard.
 */
export function keyReferences(source: string): string[] {
	return [...source.matchAll(KEY_REFERENCE)]
		.map(([, concatArguments, template, , quoted]) => {
			if (concatArguments !== undefined) {
				return [...concatArguments.matchAll(CONCAT_ARGUMENT)].map(([, single, double]) => single ?? double ?? '*').join('');
			}
			return template?.replace(/\$\{[^}]*\}/g, '*') ?? quoted.replace(/\.$/, '.*');
		})
		.filter((key) => NAMESPACE.test(key));
}

type KeyReport = {
	/** The references that match no English key, with the files using them. */
	missing: { key: string; files: readonly string[] }[];
	/** The English keys no reference matches. */
	unused: string[];
	/** The English keys the French file lacks. */
	untranslated: string[];
};

/**
 * Compare the key references, mapped to the files using them, with the keys of the English and French language trees.
 */
export function checkKeys(references: ReadonlyMap<string, readonly string[]>, en: unknown, fr: unknown): KeyReport {
	const enKeys = languageKeys(en);
	const frKeys = new Set(languageKeys(fr));
	const patterns = new Map([...references.keys()].map((reference) => [reference, keyPattern(reference)]));
	const matched = (enKey: string) => [...patterns.values()].some((pattern) => pattern.test(enKey));

	return {
		missing: [...references].filter(([key]) => !enKeys.some((enKey) => patterns.get(key)!.test(enKey))).map(([key, files]) => ({ key, files })),
		// Foundry localizes the document types from TYPES.<Document>.<type> itself.
		unused: enKeys.filter((enKey) => !enKey.startsWith('TYPES.') && !matched(enKey)),
		untranslated: enKeys.filter((enKey) => !frKeys.has(enKey)),
	};
}

/** The dotted paths of the strings of a language tree. */
function languageKeys(tree: unknown, path?: string): string[] {
	if (tree === null || typeof tree !== 'object') {
		return path === undefined ? [] : [path];
	}
	return Object.entries(tree).flatMap(([name, subtree]) => languageKeys(subtree, path === undefined ? name : `${path}.${name}`));
}

/** A wildcard stands for a part of one segment of the key, since the code builds names, not paths. */
function keyPattern(reference: string): RegExp {
	const parts = reference.split('*').map((part) => part.replace(/[.\\]/g, '\\$&'));
	return new RegExp(`^${parts.join('[^.]+')}$`);
}
