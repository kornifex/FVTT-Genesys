/**
 * @file Types `.vue` imports for the tools that do not read single-file components, such as typescript-eslint. vue-tsc resolves the component itself, so this declaration never hides a component's real props.
 */

declare module '*.vue' {
	import type { DefineComponent } from 'vue';

	const component: DefineComponent;
	export default component;
}
