/** @file The part of `@foundryvtt/foundryvtt-cli` the build calls: the package ships no types. */

declare module '@foundryvtt/foundryvtt-cli' {
	type PackageOptions = {
		nedb?: boolean;
		yaml?: boolean;
		log?: boolean;
	};

	/**
	 * Compile the source files of `src` into a pack at `dest`. A source file without a `_key` is skipped.
	 */
	export function compilePack(src: string, dest: string, options?: PackageOptions & { recursive?: boolean }): Promise<void>;

	/**
	 * Extract the documents of the pack at `src` into one source file each under `dest`.
	 */
	export function extractPack(src: string, dest: string, options?: PackageOptions & { clean?: boolean }): Promise<void>;
}
