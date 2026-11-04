/** @file The accessibility check of a page's element: axe-core's WCAG 2.2 AA rules, its violations summed up by rule. */
import type * as Axe from 'axe-core';
import type { Page } from 'playwright-core';
import { createRequire } from 'node:module';

declare global {
	interface Window {
		axe?: typeof Axe;
	}
}

/**
 * What the check finds in an element: for each rule it violates, named `<rule> (<impact>)`, how many elements of each
 * kind violate it; and for each rule axe-core couldn't decide, named `<rule> (needs review)`, the elements it couldn't
 * decide on (the contrast of a text over an image or a gradient, as the sheets' backgrounds are). An element's kind is
 * its tag and classes, after its parent's, as `div.name > a`: the ids a page gives its windows and rows change between
 * runs, which would make every finding differ in a comparison.
 */
export type AccessibilityFindings = Record<string, Record<string, number>>;

/**
 * The tags of the rules checking WCAG 2.2 at levels A and AA, the conformance #534 aims at.
 */
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Why axe-core couldn't decide a contrast when what lies around the window decides it: the elements under a window,
 * which its background lets through, or the viewport. They differ from one run to the next (a prompt's skill names
 * overlapped one element or another), so the findings leave out the elements undecided for these reasons alone.
 */
const UNDECIDED_BY_SURROUNDINGS = ['elmPartiallyObscuring', 'elmPartiallyObscured', 'bgOverlap', 'outsideViewport'];

const AXE_SOURCE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/**
 * Runs axe-core on the element a selector finds, with the WCAG 2.2 AA rules, or only the rules given. It loads axe-core
 * in the page on its first run there, and again after a reload.
 */
export async function checkAccessibility(page: Page, selector: string, rules?: string[]): Promise<AccessibilityFindings> {
	if (!(await page.evaluate(() => 'axe' in window))) await page.addScriptTag({ path: AXE_SOURCE });

	return page.evaluate(
		async ({ selector, rules, tags, surroundings }) => {
			const element = document.querySelector(selector);
			if (!element) throw new Error(`No ${selector} to check`);
			const { violations, incomplete } = await window.axe!.run(element, {
				runOnly: rules ? { type: 'rule', values: rules } : { type: 'tag', values: tags },
				resultTypes: ['violations', 'incomplete'],
			});

			const kind = (node: Element | null) => (node ? [node.localName, ...node.classList].join('.') : '?');
			const findings: AccessibilityFindings = {};
			type Node = (typeof violations)[number]['nodes'][number];
			const add = (key: string, nodes: Node[]) => {
				if (!nodes.length) return;
				const kinds: Record<string, number> = {};
				for (const node of nodes) {
					// A target holding several selectors reaches into a shadow root or a frame, which the sheets don't have.
					const target = node.target.length === 1 ? document.querySelector(String(node.target[0])) : null;
					const described = target ? `${kind(target.parentElement)} > ${kind(target)}` : node.target.join(' ');
					kinds[described] = (kinds[described] ?? 0) + 1;
				}
				findings[key] = kinds;
			};
			const undecidedBySurroundings = (node: Node) =>
				[...node.any, ...node.all, ...node.none].some((check) => {
					const messageKey = (check.data as { messageKey?: unknown } | null)?.messageKey;
					return typeof messageKey === 'string' && surroundings.includes(messageKey);
				});
			for (const violation of violations) add(`${violation.id} (${violation.impact ?? 'unknown'})`, violation.nodes);
			for (const result of incomplete) {
				add(
					`${result.id} (needs review)`,
					result.nodes.filter((node) => !undecidedBySurroundings(node)),
				);
			}
			return findings;
		},
		{ selector, rules, tags: WCAG_AA, surroundings: UNDECIDED_BY_SURROUNDINGS },
	);
}
