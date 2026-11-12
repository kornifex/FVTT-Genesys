# Maintainable application code: state of the art and points of disagreement

Research note, 2026-11-12. Input for [`docs/agents/code-style.md`](../agents/code-style.md), the coding standard that contributors and coding agents read before they write code. Written for a general TypeScript standard first (it also touches Rust, Python and Bash); the Genesys code style adapts it to Foundry.

**Question.** What do the authoritative sources recommend for maintainable application code, and where do they disagree? For each principle the note also asks whether a tool can enforce it, and whether writing it down would change what a coding agent does by default.

**Method.** Primary sources first. I read the texts directly where they are online: the Ousterhout–Martin discussion, Google's TypeScript, Shell and code review guides, the essays, Fowler's bliki, the Pragmatic Programmer's free DRY extract, Ousterhout's free 2nd-edition extract, the Effective TypeScript table of contents, OpenAI's and Anthropic's agent guidance, and Beck's newsletter. For books that are not online, I give the chapter or section title, and a page number only when I could check it in a primary text: the page numbers for *Clean Code* 1st ed. come from Ousterhout's quotes in the debate. *Clean Code* 2nd ed. (Oct. 2025) and *Tidy First?* are cited from their published tables of contents; I have not read their full text. The "agent effect" judgements are my own assessment, labelled as such. They are not findings from a source.

Legend used in each section:

- **Recommendation**: what I would retain, in one or two sentences.
- **Sources**: who says it, where.
- **Agreement**: consensus, or the disagreement stated from both sides.
- **Tool**: what a linter, type checker or formatter can enforce. Whatever a tool enforces should stay out of the prose standard.
- **Agent effect**: does writing the rule down change a current model's default output?

---

## 0. Common ground: what "maintainable" means

All the sources measure quality by the cost of the *next change*. They do not measure it by elegance.

- Ousterhout defines complexity as "anything that makes it hard to understand and modify a system", driven by "how much information must a developer have in their head" and "how accessible and obvious is the information" ([aposd-vs-clean-code, Introductions](https://github.com/johnousterhout/aposd-vs-clean-code#introductions); *APOSD* ch. 2 "The Nature of Complexity"). Martin answers: "I agree with your approach", and adds that the reader, not the author, is the programmer to help (same section).
- Hunt & Thomas reduce good design to **ETC, "Easier to Change"** (*Pragmatic Programmer* 20th ed., topic "The Essence of Good Design").
- Beck: the cost of software is roughly the cost of changing it, and that cost is dominated by coupling ("Constantine's Equivalence", *Tidy First?* Part III).
- Hickey separates *simple* (not interleaved, which is objective) from *easy* (familiar, which is relative). "Simplicity is a prerequisite for reliability" ([Simple Made Easy, 2011](https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/SimpleMadeEasy.md)).

The disagreements below are about *which practices* reduce that cost. The goal itself is not in dispute.

---

## 1. Naming

**Recommendation.** Use precise names taken from the domain vocabulary, the same name for the same concept everywhere, and names you can grep for. If a good name is hard to find, treat it as a sign that the design is unclear.

**Sources.**
- *Clean Code* ch. 2 "Meaningful Names" (2nd ed. ch. 4): intention-revealing names, long names acceptable.
- *APOSD* ch. 14 "Choosing Names": names should be precise and consistent; a name that is hard to choose is a design red flag.
- Google TS guide, [Descriptive names](https://google.github.io/styleguide/tsguide.html#descriptive-names): no ambiguous abbreviations, no deleted inner letters, no Hungarian notation; single letters only for scopes of 10 lines or fewer.
- *Effective TypeScript* 2nd ed., Item 41 "Name Types Using the Language of Your Problem Domain" ([TOC](https://effectivetypescript.com/)).
- *Pragmatic Programmer*, topic "Naming Things".
- Krenzel (Logic, Inc.), [AI Is Forcing Us To Write Good Code](https://bits.logic.inc/p/ai-is-forcing-us-to-write-good-code) (Dec. 2025): semantic type names (`UserId`, `SignedWebhookPayload`) are "an amplifier" for agents because the model can identify them and search for them.

**Agreement.** Broad consensus. The one disagreement is about *length*. Martin moves information into very long method names; Ousterhout finds "super-long names awkward" and prefers shorter names plus a comment ([Comments Summary](https://github.com/johnousterhout/aposd-vs-clean-code#comments-summary)).

**Tool.** Casing, and partly abbreviations: `@typescript-eslint/naming-convention`, Rust and Python linters (clippy, ruff `N` rules). Meaning cannot be enforced by a tool.

**Agent effect.** "Use meaningful names" is a **no-op**. Two narrower rules do change behaviour: "use the terms of the repo's glossary/domain, not synonyms" (only when a glossary exists), and "brand or alias domain identifiers (`UserId`, not `string`)".

---

## 2. Function size and module depth

**Recommendation.** Judge a unit by its *interface*, not by its line count. Prefer deep modules, where a small interface hides a lot of behaviour. Avoid pass-through layers and helpers so entangled that the reader has to flip between them. Extract a function when it names a "what" that you would otherwise have to work out from the "how".

**Sources and positions.**
- **Martin, small.** "The first rule of functions is that they should be small. The second rule of functions is that *they should be smaller than that*" (*Clean Code* 1st ed. p. 34). Blocks inside `if`/`while` "should be one line long" (p. 35). Decompose until a method does "One Thing" ([Method Length](https://github.com/johnousterhout/aposd-vs-clean-code#method-length)). The 2nd edition keeps this line (ch. 7 "Clean Functions: keeping functions small", ch. 10 "One Thing") ([2nd ed. TOC](https://www.informit.com/store/clean-code-a-handbook-of-agile-software-craftsmanship-9780135398579)).
- **Fowler, small, for a different reason.** Extract when "you have to spend effort into looking at a fragment of code to figure out *what* it's doing": separate intention from implementation. "Any function more than half-a-dozen lines of code starts to smell to me" ([FunctionLength, 2016](https://martinfowler.com/bliki/FunctionLength.html)). The *Refactoring* 2nd ed. ch. 3 smells include both "Long Function" and its opposites, "Lazy Element" and "Middle Man".
- **Ousterhout, deep.** "The best methods are those that provide a lot of functionality but have a very simple interface … I call these methods 'deep'." Over-decomposition produces *shallow* interfaces and *entanglement* ("conjoined" methods) ([Method Length](https://github.com/johnousterhout/aposd-vs-clean-code#method-length); *APOSD* ch. 4 "Modules Should Be Deep", ch. 7 "Different Layer, Different Abstraction" on pass-through methods, ch. 9 "Better Together Or Better Apart?").
- **Beck, both directions.** *Tidy First?* lists "Extract Helper" as a tidying, and also **"One Pile"** (ch. 13): when code has been split into tiny pieces that hinder understanding, inline it into one pile and re-tidy from there ([newsletter post](https://newsletter.kentbeck.com/p/tidying-one-pile)).
- **Google, middle ground.** "If it exceeds about 40 lines, think about whether it can be broken up without harming the structure of the program." Signs of trouble: several levels of nesting, blocks that each need a comment, the function does not fit on screen. "There is nothing wrong with a private helper method or class that is used only once" ([Function Length](https://google.github.io/styleguide/tsguide.html#function-length)).

**Agreement.** **Contested.** Ousterhout and Martin both state the disagreement in the same words: "We both value decomposition, and we both avoid entanglement; but we disagree on the relative weighting of those two values" ([Method Length Summary](https://github.com/johnousterhout/aposd-vs-clean-code#method-length-summary)). Martin concedes that over-decomposition exists and that *Clean Code* 1st ed. gives little guidance on spotting it. Ousterhout's rebuttal is that "One Thing" has no guardrails: anything can be named, and a lock-then-act method does two things that belong together.

**A reconciliation the sources support.** Depth applies at module boundaries; small private helpers inside a deep module do not make it shallow. Google's "single-use private helper is fine" and Fowler's intention/implementation split operate *inside* the module. Ousterhout's objection targets helpers that are *entangled*, and interfaces that are as complex as their bodies. The `mattpocock-skills:codebase-design` skill already installed here states it this way: "Depth is a property of the interface, not the implementation. A deep module can be internally composed of small … parts."

**Tool.** Only proxies: `max-lines-per-function`, `max-depth`, `complexity` (ESLint), clippy `too_many_lines`/`cognitive_complexity`, ruff `C901`/`PLR0915`. They catch the extreme cases but cannot measure depth or entanglement.

**Agent effect.** **Yes, for the depth half.** My assessment: without guidance, agents add layers. They write wrapper functions that rename a call, services that forward to repositories, and one-use abstractions "for testability". A rule such as "no pass-through functions or layers; every new function or module must hide something; prefer one deeper function to several conjoined helpers" changes their output. A numeric line limit belongs in the linter, not in prose.

---

## 3. Comments and documentation

**Recommendation.** Document every exported interface with what a caller cannot see in the signature: contract, invariants, units, error modes. Inside implementations, comment only the *why*: non-obvious decisions, workarounds, and references to incidents or specs. Never narrate what the code does or what you just changed. Do not repeat types in prose.

**Sources and positions.**
- **Martin, comments mostly as a failure.** *Clean Code* ch. 4 "Comments"; the 2nd ed. chapter opens with "Comments as compensation for failure" ([TOC](https://www.informit.com/store/clean-code-a-handbook-of-agile-software-craftsmanship-9780135398579)). He accepts comments on public APIs, sees "little need to comment interfaces that are internal to the team", and does not trust comments until he has read the code ([Comments Summary](https://github.com/johnousterhout/aposd-vs-clean-code#comments-summary)).
- **Ousterhout, comments as part of the design.** "Without interface comments the specifications for interfaces are incomplete" ([Closing Remarks](https://github.com/johnousterhout/aposd-vs-clean-code#closing-remarks)). Comments should describe what is not obvious from the code (*APOSD* ch. 12–13). Write the interface comment *first*, as a design tool (ch. 15 "Write The Comments First"). He would "write 5-10x more lines of comments" than Martin.
- **Fowler.** The "Comments" smell (*Refactoring* 2nd ed. ch. 3): a comment often deodorizes bad code, so try to refactor until the comment is superfluous. He keeps comments for *why* and for uncertainty.
- **Google.** Code review: comments should "explain why some code exists, and should not be explaining *what* some code is doing" ([What to look for: Comments](https://google.github.io/eng-practices/review/reviewer/looking-for.html#comments)). TS guide: "Document all top-level exports of modules" with JSDoc, and "Make comments that actually add information": `@param`/`@return` only when they add something ([tsguide: Comments and documentation](https://google.github.io/styleguide/tsguide.html#comments-and-documentation)).
- **Vanderkam.** Item 31 "Don't Repeat Type Information in Documentation" ([sample](https://effectivetypescript.com/2023/05/31/jsdoc-repeat/)) and Item 68 "Use TSDoc for API Comments".

**Agreement.** **Contested, and the most entrenched disagreement in the set.** "Overall, we struggled to find areas of agreement on this topic" (Ousterhout, Comments Summary). The *shared* ground is narrow but usable: both agree that implementation code needs comments only where it is non-obvious, and both agree public APIs need documentation. The open question is internal interfaces (module-internal exported functions, cross-file helpers inside an app). Google and Ousterhout say document them; Martin says mostly don't.

**Tool.** Partially. `eslint-plugin-jsdoc` (`require-jsdoc` on exports, `no-types` for TS), Rust `missing_docs`, ruff `D` rules can require that a doc comment *exists*. No tool can judge whether it adds information or narrates.

**Agent effect.** **Yes, in both directions** (my assessment). Agents tend to add "what" comments, section banners and change-log comments ("// Updated to use X", "// New: …"), and to write JSDoc that restates the parameter types. They seldom write a real interface contract unless asked. Both "no narrating or change-log comments" and "every exported function gets a contract comment when the signature doesn't say it all" change the output. The user must still choose where on the Martin–Ousterhout spectrum to set the default for internal interfaces.

---

## 4. Error handling

**Recommendation.** Fail fast on bugs and broken invariants. Catch an error only where you can handle it, or add context to it and rethrow. Never swallow an error or substitute a silent fallback. Model *expected* domain failures explicitly, in the return type or as an error union. Leave unexpected and infrastructure failures as exceptions caught at the top level. Where possible, redesign the API so the error case cannot happen.

**Sources.**
- *Pragmatic Programmer*, topics "Dead Programs Tell No Lies" (crash early) and "Assertive Programming", "Design by Contract" ([TOC](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)).
- *Clean Code* 1st ed. ch. 7 "Error Handling" (Feathers): use exceptions rather than return codes, don't return null, don't pass null. 2nd ed. ch. 8 "Preferring exceptions to error codes".
- *APOSD* ch. 10 "Define Errors Out Of Existence": reduce the number of places where exceptions must be handled, by redefining semantics (e.g. an `unset` that is a no-op when the key is missing), masking errors at a low level, or aggregating handling at a high level.
- Wlaschin, [Against Railway-Oriented Programming](https://fsharpforfunandprofit.com/posts/against-railway-oriented-programming/) (2019), from the author of the `Result` pattern. Use `Result` only for **domain errors** ("expected as part of the business process"). Use exceptions for **panics** ("handled by abandoning the workflow … caught and logged at the highest appropriate level"). Treat **infrastructure errors** case by case. "Don't use Result to reinvent exceptions."
- Rust Book, [ch. 9.3 "To panic! or Not to panic!"](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html): `Result` for recoverable errors, `panic!` for bugs and broken contracts. This is the same split, built into the language.
- Google TS guide: [Exception handling: only throw errors](https://google.github.io/styleguide/tsguide.html#exception-handling), [Keep try blocks focused](https://google.github.io/styleguide/tsguide.html#keep-try-blocks-focused), [Empty catch blocks](https://google.github.io/styleguide/tsguide.html#empty-catch-blocks) need a comment explaining why.

**Agreement.** Consensus on fail-fast, no swallowing, focused `try`, and catching at the top. **Contested in TypeScript:** exceptions everywhere (Martin, the Google guide's silence on `Result`) versus `Result`/discriminated-union returns (neverthrow, Effect). Wlaschin's three-way split is the best-argued middle position, and Rust encodes it. Ousterhout's "define errors out of existence" is complementary and not contested, though less often cited.

**Tool.** Partially: `no-empty` / `no-useless-catch`, `@typescript-eslint/only-throw-error`, `no-floating-promises`, `no-misused-promises`, `useUnknownInCatchVariables` (part of `strict`), clippy `unwrap_used`/`expect_used`, ruff `BLE` (blind except), `S110` (try-except-pass). A tool cannot detect a fallback value that hides an error.

**Agent effect.** **Yes, strongly** (my assessment). Agents tend to wrap calls in `try/catch` that log and continue, return `null`/`[]`/defaults on failure, and add `?.` chains "to be safe". "Don't catch what you can't handle; no silent fallbacks; let unexpected errors reach the top-level handler" changes behaviour. The `Result`-vs-exceptions choice also changes behaviour once made, but only the user can make it.

---

## 5. Types and validation at the boundaries

**Recommendation.** Parse every untrusted input (HTTP bodies, env, files, DB rows from loose schemas, third-party responses) into a precise type *once*, at the boundary, and pass the parsed type inward. Make illegal states unrepresentable: discriminated unions, branded IDs, no optional-field soup. Never use `any`; use `unknown` and narrow it. Hide unavoidable assertions inside small, well-typed functions, with a comment saying why they are safe.

**Sources.**
- King, [Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) (2019): "the difference between validation and parsing lies almost entirely in how information is preserved". "Use a data structure that makes illegal states unrepresentable." "Push the burden of proof upward as far as possible, but no further … Ideally, this should happen at the boundary of your system, before *any* of the data is acted upon." The essay warns against *shotgun parsing*, where checks are "spread across processing code".
- *Effective TypeScript* 2nd ed. ([TOC](https://effectivetypescript.com/)): Item 29 "Prefer Types That Always Represent Valid States", 33 "Push Null Values to the Perimeter of Your Types", 34 "Prefer Unions of Interfaces to Interfaces with Unions", 35 "Prefer More Precise Alternatives to String Types", 37 "Limit the Use of Optional Properties", 43–46 on narrowing `any` and preferring `unknown`, 45 "Hide Unsafe Type Assertions in Well-Typed Functions", 59 "Use `never` Types to Perform Exhaustiveness Checking", 64 "Consider Brands for Nominal Typing", 74 "Know How to Reconstruct Types at Runtime" (Zod and alternatives; [sample](https://effectivetypescript.com/2024/10/31/runtime-types/)).
- Google TS guide: [`any` Type](https://google.github.io/styleguide/tsguide.html#any) ("Consider *not* to use `any`"; prefer `unknown`), [Type and non-nullability assertions](https://google.github.io/styleguide/tsguide.html#type-and-non-nullability-assertions) ("only silence the TypeScript compiler … you *should not* use [them] without an obvious or explicit reason", and a comment if you do), [@ts-ignore](https://google.github.io/styleguide/tsguide.html#ts-ignore) (forbidden).
- *Pragmatic Programmer*, "Design by Contract".
- OpenAI, [Harness engineering](https://openai.com/index/harness-engineering/) (Feb. 2026): "we require Codex to parse data shapes at the boundary, but are not prescriptive on how that happens". One of their "golden principles" is "we don't probe data 'YOLO-style' — we validate boundaries or rely on typed SDKs so the agent can't accidentally build on guessed shapes."
- Krenzel (Logic): end-to-end types, OpenAPI-generated clients, DB constraints. Types "shrink the search space of possible actions the model can take".

**Agreement.** **Consensus**, and the most consistent recommendation across the old sources and the agent-era ones. Hickey's talk lists "switching and matching" among things that complect. That is a quibble with closed `switch` dispatch, not with typed boundaries.

**Tool.** Largely: `tsc --strict` (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), typescript-eslint `no-explicit-any`, `no-unsafe-*`, `no-non-null-assertion`, `consistent-type-assertions`, `switch-exhaustiveness-check`, `ban-ts-comment`. **Not enforceable:** *where* parsing happens. A linter cannot tell a boundary parser from a re-validation scattered three layers deep.

**Agent effect.** **Yes, strongly.** Agents reach for `as`, `!` and repeated defensive checks inside the core when a type is inconvenient, and they model state as objects with optional fields. "Parse at the boundary with a schema, pass the parsed type inward, no re-validation inside" and "model alternatives as discriminated unions" both change the default. OpenAI singling this out as a golden principle confirms that it does not happen on its own.

---

## 6. Side effects and purity

**Recommendation.** Keep decisions in pure functions that take values and return values. Push I/O (DB, network, clock, randomness, filesystem, env) to a thin outer shell that calls the core. Pass dependencies in rather than constructing them inside. Avoid shared mutable state.

**Sources.**
- Bernhardt, [Functional Core, Imperative Shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell) (2012). In his example, the functional core holds the logic and the shell "manipulates stdin, stdout, the database, and the network, all based on values produced by the functional core". The core "often naturally allows isolated testing with no test doubles", and the shell ends up "with few conditionals".
- Hickey, *Simple Made Easy*: "State … complects value and time"; "Objects complect state, identity, and value".
- *Clean Code* 1st ed. ch. 3 "Have No Side Effects", "Command Query Separation" (2nd ed. ch. 8 "Side effects", "Separating commands from queries").
- *Pragmatic Programmer*: "Transforming Programming", "Shared State Is Incorrect State" ([extract](https://media.pragprog.com/titles/tpp20/shared-state.pdf)), "Decoupling".
- Wlaschin (above): "if you follow best practices and separate your I/O from your pure business logic, then you should rarely need to work with exceptions in your core code".
- *Effective TypeScript* Item 14 "Use `readonly` to Avoid Errors Associated with Mutation".

**Agreement.** **Consensus** in direction. The disagreement is only about how far to go: the OO tradition (Martin's SOLID, Clean Architecture) achieves the same separation through interfaces and dependency inversion, while the FP tradition (Bernhardt, Hickey) achieves it through values. Both put I/O at the edge.

**Tool.** Weakly: `readonly`/`ReadonlyArray`, `prefer-const`, `eslint-plugin-functional` (too strict for most codebases). Architecture tests (dependency-cruiser, eslint-plugin-boundaries, `import-linter` in Python) can forbid the core from importing I/O modules. This is the mechanism OpenAI describes ("custom linters and structural tests").

**Agent effect.** **Yes** (my assessment). Agents put `fetch`/`prisma.*`/`Date.now()` calls in the middle of business logic and then mock them in tests. "Business rules in pure functions; I/O in the shell; inject the clock" changes both the code and the tests that follow.

---

## 7. Duplication versus abstraction

**Recommendation.** Remove duplicated *knowledge* (one business rule, one schema, one constant) immediately. Tolerate duplicated *code* until the third occurrence shows what actually varies. When a shared abstraction grows flags and conditionals per caller, inline it back into the callers and start again. Before writing a helper, search the repo for one that already exists.

**Sources.**
- Hunt & Thomas, "DRY—The Evils of Duplication" ([free extract](https://media.pragprog.com/titles/tpp20/dry.pdf)). The 20th ed. corrects the 1st: "DRY is about the duplication of knowledge, of intent", and "Not All Code Duplication is Knowledge Duplication … That's a coincidence, not a duplication."
- Metz, [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) (2016): "duplication is far cheaper than the wrong abstraction". "If you find yourself passing parameters and adding conditional paths through shared code, the abstraction is incorrect." Remedy: "Re-introduce duplication by inlining the abstracted code back into every caller."
- Dodds, [AHA Programming](https://kentcdodds.com/blog/aha-programming): "Avoid Hasty Abstractions", "Optimize for change first". Abstract once "the commonalities will scream at you".
- Fowler, *Refactoring* 2nd ed. ch. 2: the Rule of Three (attributed to Don Roberts), i.e. refactor on the third occurrence.
- Beck's rules of simple design rank "no duplication" *after* "reveals intention" ([BeckDesignRules](https://martinfowler.com/bliki/BeckDesignRules.html)).
- Martin, *Clean Code* 1st ed. ch. 3 "Don't Repeat Yourself" (2nd ed. ch. 8 "Avoiding duplication (DRY)", ch. 18 "Minimizing duplication").
- Agent era. GitClear, a code-analytics vendor (so read with that caveat), [AI Copilot Code Quality 2025](https://www.gitclear.com/ai_assistant_code_quality_2025_research) and the [2026 follow-up](https://gitclear.com/the_ai_code_quality_maintainability_gap): in 2024, copy/pasted lines outnumbered moved (refactored) lines for the first time, and duplicated 5+-line blocks rose about 8×. OpenAI's golden principle: "we prefer shared utility packages over hand-rolled helpers to keep invariants centralized" ([Harness engineering](https://openai.com/index/harness-engineering/)).

**Agreement.** **Contested in emphasis, convergent in substance.** No source defends duplicated *knowledge*, and none defends a premature abstraction that grows flags. The tension is about which error is more common. The craft sources warn against hasty abstraction (Metz, Dodds, Fowler's rule of three). The agent-era data warns that agents *duplicate* rather than reuse. The two are compatible: reuse what exists, and do not invent a new shared abstraction on the second occurrence.

**Tool.** Partially: `jscpd`, SonarQube duplication, clippy has nothing equivalent. A tool cannot distinguish knowledge duplication from coincidental duplication.

**Agent effect.** **Yes** (my assessment, consistent with GitClear's and OpenAI's observations). Agents re-implement helpers that already exist, because they do not search before writing. They also extract a generic helper with options the moment they see two similar blocks. "Search for an existing implementation before writing one" and "don't extract on the second occurrence; inline an abstraction that needs a flag per caller" both change behaviour.

---

## 8. Speculative generality (YAGNI) versus general-purpose interfaces

**Recommendation.** Build only the behaviour that is asked for: no unrequested options, flags, config, extension points or backwards-compatibility shims. Do shape the *interface* of what you build so that it does not encode one caller's quirks.

**Sources.**
- Fowler, [Yagni](https://martinfowler.com/bliki/Yagni.html): presumptive features carry a cost of building, a cost of delay and a cost of carry. "Yagni requires (and enables) malleable code", so YAGNI presupposes that refactoring is cheap.
- Google review guide, [Complexity](https://google.github.io/eng-practices/review/reviewer/looking-for.html#complexity): over-engineering means making code "more generic than it needs to be"; "solve the problem they know needs to be solved now, not the problem that … might need to be solved in the future".
- Beck, [Augmented Coding: Beyond the Vibes](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes) (June 2025). One of his warning signs that the agent is off track: "Functionality I hadn't asked for (even if it was a reasonable next step)".
- **Counterpoint:** Ousterhout, *APOSD* ch. 6 §6.1 "Make classes somewhat general-purpose" (2nd ed. p. 40, [free extract](https://web.stanford.edu/~ouster/cgi-bin/aposd2ndEdExtract.pdf)): "the module's functionality should reflect your current needs, but its interface should not". His example: `insert`/`delete(range)` replaces `backspace`/`delete`/`deleteSelection`.

**Agreement.** **Mostly consensus, with one apparent clash.** Ousterhout is not arguing for speculative *features*; he argues against *special-purpose interfaces*, which he sees as the greater cause of complexity ("over-specialization may be the single greatest cause of complexity in software", p. 39). Read together: YAGNI governs features, Ousterhout governs interface shape.

**Tool.** No.

**Agent effect.** **Yes, strongly** (Beck lists it explicitly; it matches my own assessment). Agents add optional parameters, config knobs, fallbacks for "older versions", and unrequested adjacent features. This is one of the highest-value rules for an agent standard.

---

## 9. Testing strategy

**Recommendation.** Test behaviour through the module's public interface, so that tests survive refactoring. Favour tests that exercise real collaborators, and mock only at the system's edges (network, payment, email, clock). Write a failing test before fixing a bug. Keep the suite fast and deterministic. Never weaken or delete a test to make it pass.

**Sources.**
- Beck, [Test Desiderata](https://testdesiderata.com/) (2019): twelve properties to trade off, among them *Behavioral* ("sensitive to changes in the behavior"), *Structure-insensitive* ("should not change their result if the structure of the code changes"), *Deterministic*, *Fast*, *Specific*, *Predictive*.
- Dodds, [Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests): the Testing Trophy (static analysis, then unit, a large integration layer, then E2E). "When you mock something you're removing all confidence in the integration." He reports diminishing returns past roughly 70% coverage, a figure he admits "I made … up".
- Fowler, [On the Diverse And Fantastical Shapes of Testing](https://martinfowler.com/articles/2021-test-shapes.html) (2021). The pyramid-versus-trophy/honeycomb debate is mostly a disagreement over what "unit" means: *solitary* (mocked collaborators) or *sociable* (real collaborators). He quotes Searls: the percentages are "a distraction … Focus on [expressive tests that] run quickly & reliably, and only fail for useful reasons". See also [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) on the classicist and mockist schools.
- Bernhardt (§6): a functional core makes tests without test doubles natural.
- Google review guide, [Tests](https://google.github.io/eng-practices/review/reviewer/looking-for.html#tests): "Will the tests actually fail when the code is broken?"; "tests are also code that has to be maintained".
- **TDD.** Martin: the three laws plus red-green-refactor ([Test-Driven Development](https://github.com/johnousterhout/aposd-vs-clean-code#test-driven-development)). Ousterhout prefers "bundling", where you write a chunk of code and then its tests. Martin "agree[s] that bundling can produce outcomes just as good as TDD but think[s] it may lead to somewhat less test coverage" ([TDD Summary](https://github.com/johnousterhout/aposd-vs-clean-code#tdd-summary)). *Clean Code* 2nd ed. ch. 14 lists "Small bundles" as a third discipline next to TDD and TCR ([TOC](https://www.informit.com/store/clean-code-a-handbook-of-agile-software-craftsmanship-9780135398579)), which concedes the point.
- Hickey: "guardrail programming". Tests do not replace reasoning about the program ([Simple Made Easy](https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/SimpleMadeEasy.md)).
- **Agent era.** Anthropic: "Give Claude something it can run that comes back pass or fail"; the prompting example is "write a failing test that reproduces it, then fix it" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). Beck drives agents with TDD and treats "disabling or deleting tests" as cheating ([Augmented Coding](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes)). Krenzel (Logic) *requires 100% line coverage* for agent-written code, "about guaranteeing the agent has double-checked the behavior of every line of code it wrote" ([post](https://bits.logic.inc/p/ai-is-forcing-us-to-write-good-code)).

**Agreement.**
- **Consensus:** behaviour over structure (Beck, Dodds, Fowler, Google); fast and deterministic; a test that fails on a broken bug fix.
- **Contested: TDD as a discipline.** Martin and Beck are for it. Ousterhout is against it as a *design* method, though not against tests. Hickey is sceptical of tests as a substitute for reasoning. For agents the argument is different: a failing test *first* gives the agent its pass/fail signal, which is why Anthropic and Beck recommend it whatever their view of TDD for humans.
- **Contested: mocking.** The classicist side (Fowler, Dodds, Bernhardt) faces the mockist / London school. Applied to application code, the sources lean classicist.
- **Contested: coverage targets.** Dodds puts diminishing returns around 70%. Logic requires 100% as an agent guardrail. *Clean Code* 2nd ed. adds mutation testing (ch. 32). Google sets no number.

**Tool.** Coverage thresholds (vitest/jest `coverageThreshold`, `cargo llvm-cov`, `pytest-cov --fail-under`), mutation testing (Stryker, `cargo-mutants`, mutmut), `no-only-tests`/`vitest/no-focused-tests`. "Tests through the public interface" and "don't mock internals" cannot be enforced by a tool.

**Agent effect.** **Yes.** Agents default to solitary unit tests that mock every collaborator, assert on calls rather than outcomes, and, when stuck, loosen assertions or skip tests. "Test through the public interface; mock only at system edges; reproduce a bug with a failing test before fixing it; never weaken a test to make it pass" changes behaviour. The coverage number is a user decision; if one is chosen, the CI threshold enforces it and it needs no prose.

---

## 10. Small changes and refactoring

**Recommendation.** Keep each change small and self-contained. Keep structural changes (rename, move, extract, inline) in separate commits from behaviour changes, structure first. Leave unrelated code alone unless the task needs it, and mention it rather than fixing it silently.

**Sources.**
- Fowler, *Refactoring* 2nd ed. ch. 2: definition of refactoring (behaviour-preserving), "The Two Hats" (add function *or* refactor, never both at once), preparatory refactoring. Beck's line: "make the change easy (warning: this may be hard), then make the easy change".
- Beck, *Tidy First?* Part II, "Separate Tidying" ([newsletter](https://newsletter.kentbeck.com/p/management-separate-tidying)), and "First, After, Later, Never" ([newsletter](https://newsletter.kentbeck.com/p/first-after-later-never)). His agent prompt: "Never mix structural and behavioral changes in the same commit … Always make structural changes first when both are needed" ([Augmented Coding](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes)).
- Google, [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html): "one self-contained change"; "100 lines is usually a reasonable size for a CL, and 1000 lines is usually too large"; "Separate Out Refactorings".
- *Pragmatic Programmer*: "Don't Outrun Your Headlights" ([extract](https://media.pragprog.com/titles/tpp20/dont-outrun-your-headlights.pdf)), "Refactoring", "Software Entropy" (broken windows).
- *Clean Code* 1st ed. ch. 1 "The Boy Scout Rule" (leave the code cleaner than you found it). This is in mild tension with "don't mix", and Beck's separate-commit discipline resolves it.
- DORA 2025 frames AI as an amplifier ([DORA AI Capabilities Model](https://dora.dev/ai/capabilities-model/)), and secondary summaries of the report list "working in small batches" among its seven capabilities ([Splunk summary](https://www.splunk.com/en_us/blog/learn/state-of-devops.html)). I did not read the full report.

**Agreement.** **Consensus.** Every source that addresses change size says small and separated.

**Tool.** Partly: commit hooks or CI can flag diff size; nothing can classify a commit as structural or behavioural.

**Agent effect.** **Yes** (my assessment, consistent with Beck). Agents fold drive-by renames, reformatting and "while I was here" refactors into feature diffs. "Separate structural from behavioural changes; no unrequested changes outside the task's scope" changes the output.

---

## 11. Code review

**Recommendation.** Approve a change when it improves the overall health of the code, even if it is not perfect. Label non-blocking remarks as *Nit*. Base comments on facts and on the written standard rather than on taste. Leave mechanical style to tools.

**Sources.** Google, [The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html): "reviewers should favor approving a CL once it is in a state where it definitely improves the overall code health … even if the CL isn't perfect"; "Technical facts and data overrule opinions and personal preferences"; the style guide is "the absolute authority" on style, and anything outside it is preference. [What to look for](https://google.github.io/eng-practices/review/reviewer/looking-for.html): design, functionality, complexity ("can't be understood quickly by code readers"), over-engineering, tests, naming, comments (why, not what), consistency. Google TS guide, [Style guide goals](https://google.github.io/styleguide/tsguide.html#style-guide-goals): "Code reviewers should be focused on improving the quality of the code, not enforcing arbitrary rules … If it's possible to implement your rule as an automated check that is often a good sign."

**Agreement.** Consensus. The other sources do not contest Google's guide on this.

**Tool.** No, but tools remove the mechanical part of review.

**Agent effect.** **Partial.** It matters when an agent *reviews* (the `revue` and `code-review` skills): ranking findings, marking nits, citing the standard rather than taste. It does not change how an agent writes code.

---

## 12. Formatting and mechanical style

**Recommendation.** Delegate it entirely: Prettier or Biome, `rustfmt`, `ruff format`, `shfmt`. Linters with autofix: typescript-eslint or Biome, clippy, ruff, ShellCheck.

**Sources.** Google TS guide: "code is autoformatted so it's easy for software to meet whitespace rules" ([Style guide goals](https://google.github.io/styleguide/tsguide.html#style-guide-goals)). Google Shell guide: [ShellCheck](https://google.github.io/styleguide/shellguide.html#s6.1-shellcheck) is recommended for all scripts. *Clean Code* ch. 5/6 "Formatting" is long but subsumed by formatters. Krenzel: make linters "as strict as possible and configured to automatically apply fixes". Anthropic: rules without exceptions belong in hooks, not in `CLAUDE.md` ([Deterministic and non-deterministic instructions](https://code.claude.com/docs/en/best-practices#deterministic-and-non-deterministic-instructions)).

**Agreement.** Consensus.

**Tool.** Yes, entirely.

**Agent effect.** **None in prose.** Any formatting rule in the standard is wasted context. The only useful line is the command to run.

---

## 13. TypeScript-specific contested points

Points where two primary TypeScript sources disagree. They are small, but an agent will pick one silently unless told.

| Point | Google TS guide | *Effective TypeScript* 2nd ed. / platform | Note |
|---|---|---|---|
| Enums, parameter properties, namespaces | Allows `enum` (not `const enum`); **recommends** parameter properties ([tsguide](https://google.github.io/styleguide/tsguide.html#parameter-properties)) | Item 72 "Prefer ECMAScript Features to TypeScript Features": avoid enums, parameter properties, namespaces | Node's built-in type stripping cannot run these, and TS 5.8 added `--erasableSyntaxOnly` to forbid them ([Vanderkam](https://effectivetypescript.com/)). For Node back ends, this tips the balance to Vanderkam. **Tool: tsconfig flag.** |
| `interface` vs `type` for object shapes | "Prefer interfaces over type literal aliases" | Item 13 "Know the Differences…" | Lint: `@typescript-eslint/consistent-type-definitions`. |
| Explicit return types | Author's choice; reviewers may ask ([Return types](https://google.github.io/styleguide/tsguide.html#return-types)) | Item 18 "Avoid Cluttering Your Code with Inferable Types" (with caveats for return types) | Lint: `explicit-module-boundary-types` if wanted. |
| Default exports | Forbidden: "Use named exports in all code" | — | Lint: `import/no-default-export` (framework files excepted). |
| `#private` vs `private` | Forbids `#private` | Item 72 favours ECMAScript `#private` | Same erasable-syntax argument. |

All five can be decided once and enforced by tsconfig or lint. None needs prose beyond the decision.

---

## 14. Codebase legibility for agents (2023–2026)

**Recommendation.** Treat the repository as the agent's only source of truth. Keep a short entry file (AGENTS.md/CLAUDE.md) that serves as a *map*, with links to deeper docs in the repo. Encode rules that have no exceptions as linters, types, tests or hooks, and write the lint messages so they tell the agent how to fix the problem. Give directories and files descriptive paths. Prefer boring, well-known dependencies. Give the agent fast pass/fail checks.

**Sources.**
- OpenAI, [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) (Ryan Lopopolo, Feb. 2026):
  - "give Codex a map, not a 1,000-page instruction manual". A ~100-line AGENTS.md serves as "the table of contents"; a big one fails because "context is a scarce resource", "too much guidance becomes non-guidance", "it rots instantly".
  - "By enforcing invariants, not micromanaging implementations, we let agents ship fast".
  - Layered domains with dependency directions enforced "mechanically via custom linters … and structural tests". Lint error messages are written "to inject remediation instructions into agent context". Custom lints enforce structured logging, schema and type naming, and **file size limits**.
  - "Codex replicates patterns that already exist in the repository—even uneven or suboptimal ones". They counter this with recurring clean-up agents ("garbage collection").
  - "Technologies often described as 'boring' tend to be easier for agents to model".
- Anthropic, [Claude Code best practices](https://code.claude.com/docs/en/best-practices):
  - "Only write down what Claude can't find by reading the repo"; the test is "Could it find this by reading the code? Would it actually go and look? If both are yes, leave it out."
  - "Keep CLAUDE.md short": every line costs attention on every task.
  - Deterministic (hooks, CI) versus non-deterministic (prose) instructions: "If you keep adding emphasis to a CLAUDE.md line and Claude still misses it, that's a sign the line belongs in a hook."
  - "a preference between two reasonable approaches: Claude can't read that from the code, so if you care which one it picks, say so up front."
- Krenzel (Logic, Inc.), [AI Is Forcing Us To Write Good Code](https://bits.logic.inc/p/ai-is-forcing-us-to-write-good-code) (Dec. 2025):
  - "Treat your directory structure and file naming with the same thoughtfulness you'd treat any other interface"; `./billing/invoices/compute.ts` beats `./utils/helpers.ts`.
  - "Prefer many small well-scoped files", because agents truncate large files.
  - Fast, ephemeral, concurrent dev environments; strict auto-fixing linters; typed everything.
- Beck, [Augmented Coding](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes) (2025): TDD with a `plan.md`; watch for loops, unrequested functionality, and test cheating; "I'm still working on getting the genie to care as much as I do about simplicity."
- [AGENTS.md](https://agents.md/): the cross-tool convention for the entry file.
- *APOSD* ch. 17 "Consistency": the human-era version of OpenAI's observation. Consistency lets readers transfer knowledge between parts of the code.

**Agreement.** Consensus among the agent-era sources (OpenAI, Anthropic, Logic, Beck) on: map, not manual; enforce mechanically; fast checks; typed boundaries. **One tension with the craft sources:** Logic and OpenAI favour *small files* and file-size limits, for context-window reasons, which can push toward the shallow fragmentation Ousterhout warns against. The two are compatible if a module (a directory with one entry file) stays deep while its files stay small, but the standard should say so explicitly.

**Tool.** Mostly: dependency-cruiser / eslint-plugin-boundaries for layering, `max-lines` per file, custom lint rules, Claude Code hooks (Stop hook running typecheck, lint and tests).

**Agent effect.** **Yes, but most of it shapes the repo, not the code an agent writes.** The rules that change what an agent writes: "put a new file under a descriptive domain path, never `utils/` or `helpers/`"; "follow existing patterns, but if the pattern you're about to copy contradicts this standard, say so instead of spreading it"; "run the repo's check command and show its output before declaring done".

---

## 15. Other languages, briefly

- **Rust.** The language and clippy enforce much of §4–§6: `Result` vs `panic!` ([Book ch. 9.3](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html)), ownership and immutability by default, `#[must_use]`. Newtypes are the native form of branded IDs (§5). Remaining prose rules: no `unwrap()` outside tests and provably-safe spots (clippy `unwrap_used` can enforce this); parse into newtypes at the boundary (serde + validation).
- **Python.** `ruff` (lint and format) plus a type checker in strict mode (`mypy --strict` or `pyright`). Parse at the boundary with Pydantic or `dataclasses` plus validation; no bare `except` (ruff `E722`, `BLE001`).
- **Bash.** Google Shell guide: "If you are writing a script that is more than 100 lines long … you should probably be writing it in Python instead" ([When to use Shell](https://google.github.io/styleguide/shellguide.html#s1.2-when-to-use-shell)); errors to STDERR; ShellCheck. `set -euo pipefail` is common practice, but the guide flags `set -e` pitfalls. Most of this is enforceable by ShellCheck plus `shfmt`.

---

## Summary table

"Agent effect" is my assessment of whether stating the rule changes a current frontier model's default output. **Yes** means put it in the standard. **No-op** means leave it out. **Decide** means the user must pick a side, and the choice will then change behaviour.

| Principle | Consensus or contested | Enforceable by a tool? | Changes a coding agent's default? |
|---|---|---|---|
| Names: meaningful, descriptive | Consensus | Casing only | **No-op** |
| Names: domain/glossary terms, branded ID types | Consensus | Partly (types) | Small yes, where a glossary exists |
| Numeric function-length limit | **Contested** (Martin/Fowler vs Ousterhout/Beck "One Pile"; Google ~40 lines) | Yes (`max-lines-per-function`) | No-op in prose; **decide** whether to set a lint threshold |
| Deep modules; no pass-through layers or entangled helpers | Contested in weighting, reconcilable (depth at the interface) | No | **Yes** |
| Comments: why not what; no narration or change-log comments | Consensus | No | **Yes** |
| Comments: contract docs on internal interfaces | **Contested** (Ousterhout/Google vs Martin) | Existence only (`jsdoc/require-jsdoc`) | **Decide**, then yes |
| Fail fast; no swallowed errors or silent fallbacks; catch at top | Consensus | Partly (`no-empty`, `only-throw-error`, `no-floating-promises`) | **Yes, strongly** |
| `Result`/error unions vs exceptions for expected failures (TS) | **Contested** (Wlaschin's split is the best-argued middle) | No | **Decide**, then yes |
| Define errors out of existence (API shape) | Uncontested (Ousterhout only) | No | Yes, modest |
| Parse at the boundary, pass parsed types inward | Consensus | Partly (strict tsc, `no-unsafe-*`); placement no | **Yes, strongly** |
| Illegal states unrepresentable (unions, no optional soup) | Consensus | Partly (`switch-exhaustiveness-check`) | **Yes** |
| No `any`, no unexplained `as`/`!`, no `@ts-ignore` | Consensus | **Yes** (typescript-eslint) | Leave to tool |
| Functional core, imperative shell; inject clock and I/O | Consensus in direction | Partly (architecture lint) | **Yes** |
| DRY = knowledge; tolerate code duplication until 3rd occurrence | Contested in emphasis | Partly (`jscpd`) | **Yes** |
| Search for an existing helper before writing one | Consensus (agent-era) | No | **Yes** |
| Inline a wrong abstraction that needs per-caller flags | Consensus (Metz, Beck) | No | Yes |
| YAGNI: no unrequested options, flags, shims, features | Consensus (Ousterhout's general-purpose *interface* is compatible) | No | **Yes, strongly** |
| Test behaviour through the public interface; mock only at edges | Mostly consensus (mockist school dissents) | No | **Yes** |
| Failing test first for a bug fix | Contested as TDD-for-design; consensus as the agent's pass/fail signal | No | **Yes** |
| Never weaken, skip or delete a test to make it pass | Consensus | Partly (`no-focused-tests`, `no-skipped-tests`) | **Yes** |
| Coverage target | **Contested** (~70% Dodds vs 100% Logic) | **Yes** (CI threshold) | **Decide**; then tool only |
| Small, self-contained changes | Consensus | Partly (diff-size check) | Yes |
| Structural and behavioural changes in separate commits | Consensus | No | **Yes** |
| No drive-by changes outside the task | Consensus | No | **Yes** |
| Review: approve on improved code health; label nits | Consensus | No | Only for reviewing agents |
| Formatting and mechanical style | Consensus | **Yes** (formatter) | No-op; leave to tool |
| TS: erasable syntax only (no enums or parameter properties) | **Contested** (Google vs Vanderkam/Node) | **Yes** (`erasableSyntaxOnly`) | **Decide**; then tool only |
| TS: interface vs type, default exports, return types | Contested (minor) | **Yes** (lint rules) | Decide; then tool only |
| Follow existing patterns | Consensus (*APOSD* ch. 17) | No | **No-op** (agents already copy patterns, per OpenAI) |
| Don't copy a pattern that contradicts the standard; flag it | Agent-era (OpenAI) | No | **Yes** |
| Descriptive file paths; no `utils/`/`helpers/` dumping grounds | Agent-era consensus | Partly (custom lint) | Yes |
| Small files vs deep modules | **Tension** (Logic/OpenAI file limits vs Ousterhout) | Yes (`max-lines`) | **Decide** |
| Show the check command's output before claiming done | Consensus (Anthropic) | Yes (Stop hook) | Yes in prose; better as a hook |
| AGENTS.md as a short map; docs in repo | Consensus (agent-era) | Partly (doc lint) | Shapes the repo, not the code |

---

## Sources

Books (cited by chapter, section or item; page only where checked in a primary text):

- Robert C. Martin, *Clean Code*, 1st ed., Prentice Hall, 2008; 2nd ed., Addison-Wesley, Oct. 2025. 2nd ed. TOC: <https://www.informit.com/store/clean-code-a-handbook-of-agile-software-craftsmanship-9780135398579>
- John Ousterhout, *A Philosophy of Software Design*, 2nd ed., Yaknyam Press, 2021. Book page: <https://web.stanford.edu/~ouster/cgi-bin/aposd.php>. Free 2nd-ed. extract (ch. 6 and others): <https://web.stanford.edu/~ouster/cgi-bin/aposd2ndEdExtract.pdf>
- Martin Fowler, *Refactoring*, 2nd ed., Addison-Wesley, 2018. <https://refactoring.com>
- Kent Beck, *Tidy First?*, O'Reilly, 2023. Newsletter versions: <https://newsletter.kentbeck.com/p/tidying-one-pile>, <https://newsletter.kentbeck.com/p/management-separate-tidying>, <https://newsletter.kentbeck.com/p/first-after-later-never>
- David Thomas & Andrew Hunt, *The Pragmatic Programmer*, 20th anniversary ed., 2019. TOC and extracts: <https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/>; DRY extract: <https://media.pragprog.com/titles/tpp20/dry.pdf>
- Dan Vanderkam, *Effective TypeScript*, 2nd ed., O'Reilly, 2024. Item list: <https://effectivetypescript.com/>

Discussions, essays, talks:

- Ousterhout & Martin, *A Philosophy of Software Design vs Clean Code* (Sept. 2024–Feb. 2025): <https://github.com/johnousterhout/aposd-vs-clean-code>
- Alexis King, "Parse, don't validate" (2019): <https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/>
- Gary Bernhardt, "Functional Core, Imperative Shell" (2012): <https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell>
- Sandi Metz, "The Wrong Abstraction" (2016): <https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction>
- Kent C. Dodds, "Write tests. Not too many. Mostly integration.": <https://kentcdodds.com/blog/write-tests>; "AHA Programming": <https://kentcdodds.com/blog/aha-programming>
- Rich Hickey, "Simple Made Easy" (Strange Loop 2011), transcript: <https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/SimpleMadeEasy.md>
- Kent Beck, Test Desiderata: <https://testdesiderata.com/>
- Scott Wlaschin, "Against Railway-Oriented Programming" (2019): <https://fsharpforfunandprofit.com/posts/against-railway-oriented-programming/>
- Martin Fowler, bliki and articles: FunctionLength <https://martinfowler.com/bliki/FunctionLength.html>; BeckDesignRules <https://martinfowler.com/bliki/BeckDesignRules.html>; Yagni <https://martinfowler.com/bliki/Yagni.html>; On the Diverse And Fantastical Shapes of Testing <https://martinfowler.com/articles/2021-test-shapes.html>; Mocks Aren't Stubs <https://martinfowler.com/articles/mocksArentStubs.html>

Style guides and engineering practices:

- Google TypeScript Style Guide: <https://google.github.io/styleguide/tsguide.html>
- Google Shell Style Guide: <https://google.github.io/styleguide/shellguide.html>
- Google Engineering Practices, code review: <https://google.github.io/eng-practices/review/reviewer/standard.html>, <https://google.github.io/eng-practices/review/reviewer/looking-for.html>, <https://google.github.io/eng-practices/review/developer/small-cls.html>
- The Rust Programming Language, ch. 9.3: <https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html>

Agent era (2025–2026):

- OpenAI (Ryan Lopopolo), "Harness engineering: leveraging Codex in an agent-first world", Feb. 2026: <https://openai.com/index/harness-engineering/>
- Anthropic, Claude Code best practices: <https://code.claude.com/docs/en/best-practices>
- Kent Beck, "Augmented Coding: Beyond the Vibes", June 2025: <https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes>
- Steve Krenzel (Logic, Inc.), "AI Is Forcing Us To Write Good Code", Dec. 2025: <https://bits.logic.inc/p/ai-is-forcing-us-to-write-good-code>
- AGENTS.md convention: <https://agents.md/>
- GitClear (vendor research), "AI Copilot Code Quality 2025": <https://www.gitclear.com/ai_assistant_code_quality_2025_research>; "The Maintainability Gap" (2026): <https://gitclear.com/the_ai_code_quality_maintainability_gap>
- DORA, AI Capabilities Model (2025): <https://dora.dev/ai/capabilities-model/>. The "small batches" capability is cited from a secondary summary: <https://www.splunk.com/en_us/blog/learn/state-of-devops.html>

Local, not a primary source: the `mattpocock-skills:codebase-design` skill (deep-module vocabulary already used in these sessions), `~/.claude/plugins/cache/mattpocock/mattpocock-skills/1.3.1/skills/engineering/codebase-design/SKILL.md`.
