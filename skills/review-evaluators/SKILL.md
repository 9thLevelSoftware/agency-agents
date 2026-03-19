---
name: legion:review-evaluators
description: Multi-pass specialized evaluators for deep code quality, UI/UX, integration, and business logic review
triggers: [evaluator, multi-pass, deep-review, code-quality, ui-ux, integration, business-logic]
token_cost: high
summary: "Four evaluator types with domain-specific pass lists. Each runs as a single agent invocation with multiple evaluation criteria."
---

# Review Evaluators

Provides multi-pass specialized evaluators for deep review beyond what the standard review-panel covers. Each evaluator type runs as a single agent invocation with a structured rubric containing multiple passes. Works alongside review-panel (agent selection and finding synthesis) and review-loop (fix cycles).

Only active when `settings.review.evaluator_depth = "multi-pass"`. When inactive, review-panel handles all review duties with its standard per-criterion rubrics.

---

## Section 1: Evaluator Selection

Auto-selects one or more evaluator types based on the phase type and files modified. When multiple types apply, all selected evaluators run (sequentially to control cost).

### 1.1 Activation Gate

Check `settings.review.evaluator_depth` before proceeding:

```
If settings.review.evaluator_depth != "multi-pass":
  Skip this skill entirely.
  Use review-panel standard rubrics instead.
  Log: "Evaluator depth: standard — multi-pass evaluators not active"

If settings.review.evaluator_depth == "multi-pass":
  Proceed to Section 1.2 (Phase Type Mapping)
```

### 1.2 Phase Type Mapping

```
Input: phase_type (from CONTEXT.md frontmatter), files_modified list

Step 1: Determine base evaluator set from phase_type
  code | api          → [Code Quality Evaluator, Integration Evaluator]
  design | frontend   → [UI/UX Evaluator]
  business            → [Business Logic Evaluator]
  full-stack          → [Code Quality Evaluator, Integration Evaluator, UI/UX Evaluator]
  (default)           → [Code Quality Evaluator]

Step 2: Augment from files_modified signals
  For each file in files_modified:
    If file matches *.ts | *.js | *.py | *.go | *.rs → add Code Quality Evaluator (if absent)
    If file matches *.css | *.scss | *.vue | *.jsx | *.tsx → add UI/UX Evaluator (if absent)
    If file matches *api* | *route* | *controller* | *endpoint* → add Integration Evaluator (if absent)
    If file matches *service* | *domain* | *use-case* | *business* → add Business Logic Evaluator (if absent)

Step 3: Deduplicate evaluator list (preserve order: CQ → UIUX → INT → BL)

Step 4: Report selection
  Log: "Evaluators selected: {evaluator_list}"
  Log: "Trigger: phase_type={phase_type}, {N} file signals"
```

### 1.3 Multi-Type Phase Handling

When more than one evaluator is selected:

```
- Run evaluators in order: Code Quality → UI/UX → Integration → Business Logic
- Each evaluator produces its own structured result (one result per evaluator)
- Deduplication runs across all evaluator results (Section 7)
- Each evaluator's findings are tagged with its evaluator type for traceability
- Cost warning: N evaluators ≈ N × single-pass review cost (still one invocation each)
```

### 1.4 Evaluator Summary Table

| Evaluator | Phase Types | Dispatch Target | Pass Count |
|-----------|-------------|-----------------|-----------|
| Code Quality | code, api, full-stack | Codex (code_review) | 6 |
| UI/UX | design, frontend, full-stack | Gemini (ui_design) | 7 |
| Integration | code, api, full-stack | Internal | 6 |
| Business Logic | business | Internal | 6 |

---

## Section 2: Code Quality Evaluator

Deep code quality analysis across 6 evaluation passes, run as a single agent invocation. Default dispatch target: Codex (capability: `code_review`).

### 2.1 Rubric Prompt Template

Inject the full rubric below as the agent's evaluation instructions. All 6 passes run within this single invocation — the agent works through each pass in sequence, producing a structured finding set per pass.

```
## Code Quality Evaluation — Multi-Pass Rubric

You are conducting a structured multi-pass code quality review. Work through all 6 passes
in sequence. For each pass, evaluate ONLY the criteria listed for that pass. Do not blend
criteria between passes.

For each finding, use this format:
  - **Pass**: {N} — {pass_name}
  - **File**: {file_path}:{line_number}
  - **Severity**: BLOCKER | WARNING | INFO
  - **Confidence**: HIGH (80-100%) | MEDIUM (50-79%) | LOW (<50%)
  - **Issue**: {one-sentence description}
  - **Fix**: {concrete suggested fix}

Only report HIGH and MEDIUM confidence findings. Discard LOW confidence findings.

---

### Pass 1: Build Integrity

Check that the codebase compiles and all imports resolve without error.

What to check:
1. All imported modules, files, and packages exist at the referenced path
2. No circular imports that would cause build failure
3. Export/import symmetry — everything imported is actually exported by the source
4. No syntax errors or malformed constructs visible in the diff
5. Build configuration (tsconfig, webpack, vite, etc.) is consistent with source changes

Severity guidance:
- BLOCKER: Missing import target, circular import in critical path, syntax error
- WARNING: Import path uses relative traversal that may break on refactor, build config inconsistency
- INFO: Unused import (lint will catch but noting for completeness)

Example findings:
- BLOCKER: `src/auth/token.ts:12` imports `../utils/crypto` which does not exist
- WARNING: `vite.config.ts:8` alias `@components` not updated to reflect new directory structure
- INFO: `src/index.ts:3` imports `lodash` but no usage detected in the file

---

### Pass 2: Type Safety

Evaluate type correctness, type coverage, and unsafe casts.

What to check:
1. No `any` types without explicit justification comment
2. All function parameters and return types are declared (strict mode compliance)
3. Type assertions (`as SomeType`) are safe and not masking a genuine type mismatch
4. Generic types are constrained appropriately, not open-ended where specific types exist
5. Null/undefined handling is explicit — no implicit null deref risk

Severity guidance:
- BLOCKER: Unsafe cast hiding a type error, unchecked null access in critical path
- WARNING: Untyped parameter in exported function, open-ended generic where specific type exists
- INFO: Minor type narrowing opportunity that doesn't affect correctness

Example findings:
- BLOCKER: `src/api/handler.ts:44` casts response as `UserRecord` without shape validation
- WARNING: `src/utils/parser.ts:18` parameter `data` is typed as `any` with no justification
- INFO: `src/models/order.ts:67` generic `Array<T>` could be narrowed to `Array<OrderItem>`

---

### Pass 3: Code Patterns and State Management

Verify that new code follows established project conventions and handles state correctly.

What to check:
1. New code follows the patterns and abstractions already used in the codebase
2. State mutation is controlled — no accidental shared mutable state between modules
3. Side effects are isolated and not hidden inside pure-looking functions
4. No duplicated logic that should be extracted into a shared utility
5. Abstraction level is consistent — not mixing low-level and high-level concerns in the same function

Severity guidance:
- BLOCKER: Shared mutable state that can produce race conditions or data corruption
- WARNING: Pattern deviation that will confuse future maintainers, hidden side effects
- INFO: Duplication that's a candidate for extraction but not harmful yet

Example findings:
- BLOCKER: `src/store/userSlice.ts:88` directly mutates `state.users` array outside a reducer
- WARNING: `src/components/Dashboard.tsx:120` fetches data inside a render function instead of using the established hook pattern
- INFO: `src/utils/format.ts:34` duplicates date formatting logic already in `src/utils/date.ts:12`

---

### Pass 4: Error Handling

Assess the completeness and correctness of error handling across the changed code.

What to check:
1. All async operations have `.catch()` or `try/catch` — no unhandled promise rejections
2. Error messages are descriptive and actionable, not generic "something went wrong"
3. Errors are not silently swallowed — at minimum logged, preferably surfaced to caller
4. External API/service calls handle failure modes: timeouts, 4xx, 5xx, network errors
5. Error boundaries or fallback states exist where user-facing failures can occur

Severity guidance:
- BLOCKER: Unhandled promise rejection, silent error swallow in critical path
- WARNING: Generic error message that won't help debugging, missing timeout handling
- INFO: Error logged but not surfaced to caller where caller could reasonably handle it

Example findings:
- BLOCKER: `src/services/payment.ts:55` `await stripe.charge()` has no try/catch — rejection will crash the process
- WARNING: `src/api/users.ts:89` catch block logs `"Error"` with no context about which user or operation failed
- INFO: `src/utils/cache.ts:32` swallows cache miss errors — caller could retry but isn't given the opportunity

---

### Pass 5: Dead Code and Cleanup

Identify code that is no longer needed or was left in from development.

What to check:
1. No commented-out code blocks left from development (use version control for history)
2. No `console.log`, `debugger`, or `TODO` statements in production paths
3. No unreachable code after returns, throws, or break statements
4. Exported functions, types, or variables that are no longer referenced anywhere
5. Feature flags or temporary workarounds that should have been removed

Severity guidance:
- BLOCKER: `debugger` statement in production code path
- WARNING: Commented-out code block (3+ lines), orphaned export with no references
- INFO: `console.log` in non-critical path, TODO comment without issue tracker reference

Example findings:
- BLOCKER: `src/auth/middleware.ts:203` contains `debugger;` statement
- WARNING: `src/legacy/v1-compat.ts:12-45` is fully commented out — remove or document why preserved
- INFO: `src/types/index.ts:88` exports `LegacyUserShape` which has zero references in the codebase

---

### Pass 6: Test Coverage

Evaluate whether the changes are adequately covered by tests.

What to check:
1. All new public functions have at least one corresponding test
2. Error paths are tested, not just happy paths
3. Existing tests still pass — no test breakage from the change
4. Edge cases (empty input, null, boundary values) have test coverage
5. Integration points (API calls, DB queries) have tests or are explicitly mocked

Severity guidance:
- BLOCKER: New critical business logic with zero test coverage
- WARNING: Happy path tested but error/edge cases missing, existing test deleted without replacement
- INFO: Minor utility function untested, test description unclear

Example findings:
- BLOCKER: `src/services/billing.ts` adds `calculateProration()` with no test file
- WARNING: `src/api/orders.ts:handleCreate` tests the 200 case but not the 400 validation case
- INFO: `src/utils/string.ts:truncate` test description says "works" — not specific about behavior

---

### Output Format

After all 6 passes, produce a structured summary:

## Code Quality Evaluation — Results

**Evaluator**: Code Quality (6-pass)
**Files Reviewed**: {count}
**Total Findings**: {N} ({blockers} BLOCKER, {warnings} WARNING, {infos} INFO)

### Pass Results

| Pass | Name | Findings | Verdict |
|------|------|----------|---------|
| 1 | Build Integrity | {N} | PASS / NEEDS WORK / FAIL |
| 2 | Type Safety | {N} | PASS / NEEDS WORK / FAIL |
| 3 | Code Patterns & State Management | {N} | PASS / NEEDS WORK / FAIL |
| 4 | Error Handling | {N} | PASS / NEEDS WORK / FAIL |
| 5 | Dead Code & Cleanup | {N} | PASS / NEEDS WORK / FAIL |
| 6 | Test Coverage | {N} | PASS / NEEDS WORK / FAIL |

### All Findings

{Finding blocks, grouped by pass, in the format above}

### Aggregate Verdict

PASS | NEEDS WORK | FAIL
Rationale: {one sentence}
```

---

## Section 3: UI/UX Evaluator

Deep UI/UX quality analysis across 7 evaluation passes, run as a single agent invocation. Default dispatch target: Gemini (capability: `ui_design`).

### 3.1 Rubric Prompt Template

```
## UI/UX Evaluation — Multi-Pass Rubric

You are conducting a structured multi-pass UI/UX review. Work through all 7 passes
in sequence. For each pass, evaluate ONLY the criteria listed for that pass.

For each finding, use this format:
  - **Pass**: {N} — {pass_name}
  - **File**: {file_path}:{line_number_or_component_name}
  - **Severity**: BLOCKER | WARNING | INFO
  - **Confidence**: HIGH (80-100%) | MEDIUM (50-79%) | LOW (<50%)
  - **Issue**: {one-sentence description}
  - **Fix**: {concrete suggested fix}

Only report HIGH and MEDIUM confidence findings.

---

### Pass 1: Design System Adherence

Verify that all UI elements use the established design system tokens and components.

What to check:
1. Colors use design tokens (CSS variables, theme values) — no hardcoded hex or RGB values
2. Typography uses scale from design system — no ad-hoc font sizes or weights
3. Spacing uses system scale (4px grid, t-shirt sizes, etc.) — no magic pixel values
4. UI components are sourced from the component library — no one-off reimplementations
5. Icon set is consistent — no mixing of different icon libraries in the same view

Severity guidance:
- BLOCKER: Design token system exists but component bypasses it entirely with hardcoded values
- WARNING: Single hardcoded value that deviates from system, ad-hoc component replicating existing one
- INFO: Minor spacing inconsistency (1-2px), icon from secondary library used once

Example findings:
- BLOCKER: `src/components/Alert.tsx:34` uses `color: #FF3B30` — should use `var(--color-danger)`
- WARNING: `src/pages/Dashboard.tsx:88` imports and reimplements `<Card>` instead of using `<Card>` from design system
- INFO: `src/components/Header.tsx:12` uses `margin: 15px` where system scale would use `16px` (1rem)

---

### Pass 2: Visual Consistency

Check that visual appearance is cohesive across all changed components.

What to check:
1. Button variants, sizes, and states are consistent with existing buttons in the app
2. Form input styles (borders, focus rings, error states) match the established pattern
3. Shadow and elevation levels match the hierarchy defined in the design system
4. Border radius values are consistent with system conventions
5. Animation timing and easing functions match the motion system

Severity guidance:
- BLOCKER: Component style directly contradicts the visual style of adjacent/peer components in a jarring way
- WARNING: Inconsistent border radius or shadow level, animation timing that differs from system
- INFO: Minor color shade variation, slightly different focus ring style

Example findings:
- BLOCKER: `src/components/ConfirmModal.tsx` uses sharp corners (`border-radius: 0`) while all other modals use `border-radius: 8px`
- WARNING: `src/components/SaveButton.tsx:22` uses `box-shadow: 0 4px 12px` where system convention is `0 2px 8px`
- INFO: `src/forms/ContactForm.tsx:55` focus outline is `2px solid blue` — system uses `2px solid var(--color-focus)`

---

### Pass 3: Layout and Structure

Evaluate page layout, component hierarchy, and visual organization.

What to check:
1. Layout uses grid or flex correctly — no float-based hacks or position absolute for flow layout
2. Content hierarchy is clear — most important elements have highest visual weight
3. Whitespace distribution creates visual breathing room without wasteful empty space
4. Component nesting depth is reasonable — deeply nested DOM trees create complexity
5. Z-index values are managed systematically — no arbitrary z-index escalation wars

Severity guidance:
- BLOCKER: Layout breaks at standard viewport sizes due to incorrect flex/grid configuration
- WARNING: Z-index conflict that causes components to overlap incorrectly, excessive nesting (6+ levels)
- INFO: Minor whitespace inconsistency, layout that works but would be simpler with a different approach

Example findings:
- BLOCKER: `src/layouts/AppShell.tsx:67` sidebar uses `float: left` causing main content to collapse on resize
- WARNING: `src/pages/Settings.tsx` has 8 levels of nested divs for a simple form — increases maintenance burden
- INFO: `src/components/Card.tsx:44` has `padding: 24px` on top and `16px` on bottom — asymmetry feels unintentional

---

### Pass 4: Responsive Behavior

Assess how components behave across viewport sizes and device types.

What to check:
1. All components tested at mobile (320px), tablet (768px), and desktop (1280px+) breakpoints
2. Touch targets are at least 44x44px on mobile (WCAG 2.5.5)
3. Text remains readable at all sizes — no overflow, clipping, or font size below 12px
4. Images and media scale correctly — no fixed-width images that overflow on small screens
5. Navigation patterns adapt appropriately to mobile (hamburger, bottom nav, etc.)

Severity guidance:
- BLOCKER: Component overflows viewport or content is clipped and unreadable on mobile
- WARNING: Touch target too small (<44px), text truncated without ellipsis on narrow screens
- INFO: Minor padding reduction at mobile could improve content density

Example findings:
- BLOCKER: `src/components/DataTable.tsx` has fixed `width: 1200px` with no horizontal scroll — overflows on all mobile sizes
- WARNING: `src/components/NavBar.tsx` action buttons are `32x32px` — below 44px touch target minimum
- INFO: `src/pages/Home.tsx` hero section text could increase to `1.1rem` on mobile for improved readability

---

### Pass 5: Component States and Conditional Rendering

Verify that all interactive states and conditional branches are handled correctly.

What to check:
1. Loading states: skeleton screens or spinners present for async data
2. Empty states: meaningful empty state message when no data exists (not a blank space)
3. Error states: user-visible error message when data fetch fails
4. Disabled states: visually distinct and non-interactive when conditions are not met
5. Conditional rendering: all branches are handled, no `undefined` rendered as text

Severity guidance:
- BLOCKER: No error state — user sees blank or crash when data fetch fails
- WARNING: Empty state missing (blank space rendered), disabled state visually identical to enabled
- INFO: Loading spinner but no skeleton — functional but jarring layout shift

Example findings:
- BLOCKER: `src/components/UserList.tsx` renders the list or nothing — no error state when API fails
- WARNING: `src/components/TaskBoard.tsx:88` renders empty board with no message when user has no tasks
- INFO: `src/components/SubmitButton.tsx` has `disabled` prop but no visual distinction from enabled state

---

### Pass 6: Accessibility (WCAG 2.1 AA)

Evaluate compliance with WCAG 2.1 Level AA accessibility guidelines.

What to check:
1. Color contrast: text/background contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text and UI components)
2. Keyboard navigation: all interactive elements reachable and operable via keyboard
3. Screen reader support: images have `alt`, icons have `aria-label`, forms have associated `<label>`
4. Focus management: focus is visible and moves logically after modal open/close or route change
5. ARIA usage: no incorrect ARIA roles, no ARIA that conflicts with native semantics

Severity guidance:
- BLOCKER: Contrast ratio fails for body text, interactive element unreachable by keyboard, form field with no label
- WARNING: Focus not returned after modal close, ARIA role conflicts with native element, icon missing aria-label
- INFO: Contrast passes AA but fails AAA, minor ARIA improvement opportunity

Example findings:
- BLOCKER: `src/components/Badge.tsx` uses light gray text (`#999`) on white background — contrast ratio 2.85:1, fails AA
- BLOCKER: `src/components/DatePicker.tsx` calendar grid cells are not keyboard-focusable
- WARNING: `src/components/SearchModal.tsx` closes but returns focus to document body instead of the trigger button

---

### Pass 7: Usability

Assess the overall usability of the changed interfaces using Nielsen's heuristics.

What to check:
1. Visibility of system status: user always knows what the system is doing (loading, saving, error)
2. User control: users can cancel, undo, or back out of actions — no dead ends
3. Consistency and standards: same action produces same result throughout the app
4. Error prevention: dangerous actions require confirmation, destructive actions are reversible
5. Recognition over recall: labels and affordances are visible — user doesn't need to memorize
6. Help and documentation: complex interactions have inline help or tooltips

Severity guidance:
- BLOCKER: Destructive action (delete, submit payment) with no confirmation step, no way to cancel a long operation
- WARNING: Confusing label that doesn't match the action it performs, no success feedback after form submit
- INFO: Tooltip would reduce friction for complex input, minor label wording improvement

Example findings:
- BLOCKER: `src/components/DeleteAccountButton.tsx` triggers deletion immediately on click — no confirmation dialog
- WARNING: `src/forms/PaymentForm.tsx` submit button label says "Continue" — user can't tell if payment is about to be charged
- INFO: `src/components/ApiKeyInput.tsx` masked input field has no "show/hide" toggle — usability friction for a technical field

---

### Output Format

## UI/UX Evaluation — Results

**Evaluator**: UI/UX (7-pass)
**Files Reviewed**: {count}
**Total Findings**: {N} ({blockers} BLOCKER, {warnings} WARNING, {infos} INFO)

### Pass Results

| Pass | Name | Findings | Verdict |
|------|------|----------|---------|
| 1 | Design System Adherence | {N} | PASS / NEEDS WORK / FAIL |
| 2 | Visual Consistency | {N} | PASS / NEEDS WORK / FAIL |
| 3 | Layout & Structure | {N} | PASS / NEEDS WORK / FAIL |
| 4 | Responsive Behavior | {N} | PASS / NEEDS WORK / FAIL |
| 5 | Component States & Conditional Rendering | {N} | PASS / NEEDS WORK / FAIL |
| 6 | Accessibility (WCAG 2.1 AA) | {N} | PASS / NEEDS WORK / FAIL |
| 7 | Usability | {N} | PASS / NEEDS WORK / FAIL |

### All Findings

{Finding blocks, grouped by pass}

### Aggregate Verdict

PASS | NEEDS WORK | FAIL
Rationale: {one sentence}
```

---

## Section 4: Integration Evaluator

Deep integration quality analysis across 6 evaluation passes, run as a single agent invocation. Runs internally — no external CLI dispatch required.

### 4.1 Rubric Prompt Template

```
## Integration Evaluation — Multi-Pass Rubric

You are conducting a structured multi-pass integration review. Work through all 6 passes
in sequence. For each pass, evaluate ONLY the criteria listed for that pass.

For each finding, use this format:
  - **Pass**: {N} — {pass_name}
  - **File**: {file_path}:{line_number}
  - **Severity**: BLOCKER | WARNING | INFO
  - **Confidence**: HIGH (80-100%) | MEDIUM (50-79%) | LOW (<50%)
  - **Issue**: {one-sentence description}
  - **Fix**: {concrete suggested fix}

Only report HIGH and MEDIUM confidence findings.

---

### Pass 1: API Contract Verification

Verify that API consumers and providers agree on contracts.

What to check:
1. Request payload shape matches the schema the server expects (field names, types, required fields)
2. Response shape matches what the client code parses and accesses
3. HTTP methods and URL paths are consistent between client calls and server route definitions
4. Status code handling covers all codes the server can return (not just 200 and generic error)
5. Versioning: API version used in client matches server's current supported version

Severity guidance:
- BLOCKER: Field name mismatch between client and server, wrong HTTP method, unsupported API version
- WARNING: Client ignores a status code the server can return, undeclared required field
- INFO: Response fields parsed that aren't in the API spec (may work but are undocumented)

Example findings:
- BLOCKER: `src/api/client.ts:33` sends `{ user_id: id }` but `src/routes/users.ts:18` expects `{ userId: id }`
- WARNING: `src/api/client.ts:55` only handles 200 and 500 — server can also return 422 with validation errors
- INFO: `src/hooks/useUser.ts:44` accesses `response.data.meta.cursor` — `meta` is not in the documented response schema

---

### Pass 2: Authentication Flow

Evaluate the correctness of authentication and authorization integration.

What to check:
1. Auth tokens are sent in the correct header format and are refreshed before expiry
2. Protected routes/endpoints consistently require authentication — no accidental public exposure
3. Token storage is secure: not in localStorage for sensitive tokens (prefer httpOnly cookies or memory)
4. Session expiry is handled gracefully — user is redirected to login, not shown a broken state
5. Auth state is synchronized across tabs or browser windows if the app requires it

Severity guidance:
- BLOCKER: Protected endpoint reachable without auth token, token stored in localStorage for high-security app
- WARNING: Token refresh not implemented (user must re-login when token expires), session expiry shows error instead of redirect
- INFO: Auth state not synced across tabs (acceptable for most apps but worth noting)

Example findings:
- BLOCKER: `src/routes/admin.ts` route group is missing the `requireAuth` middleware — admin endpoints are publicly accessible
- WARNING: `src/api/client.ts` has no token refresh logic — expired tokens result in 401 with no recovery
- INFO: `src/context/AuthContext.tsx` does not broadcast logout across tabs via `storage` event

---

### Pass 3: Data Persistence and Schema

Assess correctness of data storage, retrieval, and schema alignment.

What to check:
1. Database queries use field names that match the current schema (no stale column references)
2. Migrations exist for all schema changes introduced in this phase
3. Queries handle NULL values explicitly — no implicit NULL equality comparisons
4. Indexes exist for columns used in WHERE clauses in high-traffic queries
5. Data written matches the constraints defined in the schema (required fields, uniqueness, foreign keys)

Severity guidance:
- BLOCKER: Query references a column that doesn't exist or was renamed in a migration, missing migration for schema change
- WARNING: High-traffic query on unindexed column, NULL comparison using `= NULL` instead of `IS NULL`
- INFO: Query fetches all columns (`SELECT *`) where only 2-3 fields are used

Example findings:
- BLOCKER: `src/db/queries/users.ts:44` queries `users.display_name` — migration renamed this column to `users.username`
- BLOCKER: `src/db/schema.ts` adds `invites` table but no migration file exists for this change
- WARNING: `src/db/queries/orders.ts:88` queries `orders WHERE status = ?` — `status` column has no index

---

### Pass 4: Error Recovery

Evaluate how the integration layer handles failures and recovers.

What to check:
1. Network failures are retried with backoff — not immediately surfaced as hard errors
2. Partial failures (batch operations where some items succeed) are handled — not all-or-nothing
3. Idempotency: retrying a failed write operation doesn't create duplicate records
4. Circuit breaker or timeout patterns exist for external service calls
5. Rollback or compensating transactions exist for multi-step operations that can partially fail

Severity guidance:
- BLOCKER: Non-idempotent write with retry logic — retries create duplicates, no rollback for partial multi-step operation
- WARNING: External service call with no timeout configured, no retry on transient network error
- INFO: Fixed retry count with no backoff — aggressive retry under load could worsen outages

Example findings:
- BLOCKER: `src/services/order.ts:create()` retries on failure but `INSERT` has no idempotency key — duplicate orders possible
- WARNING: `src/services/email.ts:send()` calls SendGrid with no timeout — hangs indefinitely on service degradation
- INFO: `src/utils/retry.ts` retries 3 times with no delay — should use exponential backoff

---

### Pass 5: Environment Configuration

Verify that environment-specific configuration is correct and safely managed.

What to check:
1. All environment variables used in code are declared in `.env.example` or equivalent
2. No secrets, API keys, or credentials are hardcoded in source files
3. Environment-specific values (URLs, feature flags) are externalized — not hardcoded per environment
4. Configuration is validated at startup — missing required env vars fail fast with clear error
5. Different environments (dev, staging, prod) use correctly isolated configuration

Severity guidance:
- BLOCKER: Hardcoded API key or secret in source, missing required env var that would cause silent failure
- WARNING: Env var used but not declared in `.env.example`, no startup validation for required config
- INFO: URL hardcoded to a specific environment (acceptable for dev-only code, flag for review)

Example findings:
- BLOCKER: `src/services/stripe.ts:3` `const STRIPE_KEY = "sk_live_abc123..."` — live secret key hardcoded
- WARNING: `src/config.ts:18` reads `process.env.REDIS_URL` — not present in `.env.example`
- INFO: `src/api/client.ts:5` `baseURL: "https://api-staging.example.com"` — staging URL in source

---

### Pass 6: End-to-End Flow

Trace complete user journeys from entry point to data persistence to verify integration correctness.

What to check:
1. Data flows from UI → API → storage without transformation errors or data loss
2. Response data returned to the UI matches what the UI expects to render
3. State updates propagate correctly after mutations (cache invalidation, refetch, optimistic update)
4. Background jobs or side effects triggered by the flow complete without silent failure
5. The full round-trip is observable — logs or events capture the complete flow for debugging

Severity guidance:
- BLOCKER: Data lost or corrupted between UI and storage, state not updated after mutation leaving stale data visible
- WARNING: Background job triggered but no observable success/failure signal, cache not invalidated after update
- INFO: Flow works but lacks observability — no structured logs for the critical path

Example findings:
- BLOCKER: `src/hooks/useCreateOrder.ts` mutation succeeds but doesn't invalidate the orders query — user sees stale order list
- WARNING: `src/services/order.ts` triggers `sendConfirmationEmail` as a fire-and-forget — failures are invisible
- INFO: No structured logging for the checkout flow — makes production debugging of payment issues difficult

---

### Output Format

## Integration Evaluation — Results

**Evaluator**: Integration (6-pass)
**Files Reviewed**: {count}
**Total Findings**: {N} ({blockers} BLOCKER, {warnings} WARNING, {infos} INFO)

### Pass Results

| Pass | Name | Findings | Verdict |
|------|------|----------|---------|
| 1 | API Contract Verification | {N} | PASS / NEEDS WORK / FAIL |
| 2 | Authentication Flow | {N} | PASS / NEEDS WORK / FAIL |
| 3 | Data Persistence & Schema | {N} | PASS / NEEDS WORK / FAIL |
| 4 | Error Recovery | {N} | PASS / NEEDS WORK / FAIL |
| 5 | Environment Configuration | {N} | PASS / NEEDS WORK / FAIL |
| 6 | End-to-End Flow | {N} | PASS / NEEDS WORK / FAIL |

### All Findings

{Finding blocks, grouped by pass}

### Aggregate Verdict

PASS | NEEDS WORK | FAIL
Rationale: {one sentence}
```

---

## Section 5: Business Logic Evaluator

Deep business logic analysis across 6 evaluation passes, run as a single agent invocation. Runs internally — no external CLI dispatch required.

### 5.1 Rubric Prompt Template

```
## Business Logic Evaluation — Multi-Pass Rubric

You are conducting a structured multi-pass business logic review. Work through all 6 passes
in sequence. For each pass, evaluate ONLY the criteria listed for that pass.

For each finding, use this format:
  - **Pass**: {N} — {pass_name}
  - **File**: {file_path}:{line_number}
  - **Severity**: BLOCKER | WARNING | INFO
  - **Confidence**: HIGH (80-100%) | MEDIUM (50-79%) | LOW (<50%)
  - **Issue**: {one-sentence description}
  - **Fix**: {concrete suggested fix}

Only report HIGH and MEDIUM confidence findings.

---

### Pass 1: Product Rules Compliance

Verify that the implementation enforces the product rules and business constraints from the requirements.

What to check:
1. All stated business rules from the phase requirements are implemented in code
2. Constraints (limits, quotas, eligibility rules) are enforced at the service layer, not just the UI
3. Business exceptions are handled explicitly — no silent fallthrough on rule violations
4. Rules are enforced consistently across all entry points (API, background jobs, admin tools)
5. Rule changes from this phase don't silently override rules established in prior phases

Severity guidance:
- BLOCKER: Business rule enforced only in UI but not in API — easily bypassed, constraint not implemented at all
- WARNING: Rule enforced in one entry point but not others, exception path falls through to default behavior
- INFO: Rule enforcement could be centralized — currently duplicated across multiple callers

Example findings:
- BLOCKER: `src/components/UpgradeButton.tsx` hides button for free users but `src/api/subscriptions.ts:create()` has no plan check — free users can upgrade via API
- WARNING: `src/services/billing.ts:applyDiscount()` enforces one-discount-per-order rule but `src/api/admin/orders.ts` allows discount stacking
- INFO: Free trial eligibility check is duplicated in `src/services/trial.ts` and `src/api/trials.ts` — should be a single shared function

---

### Pass 2: Feature Correctness

Verify that the implemented feature behaves as specified in the requirements.

What to check:
1. Feature produces the outputs described in the phase requirements for standard inputs
2. Acceptance criteria from the plan are all addressed in the implementation
3. Feature behavior matches the described user story — no misinterpretation of requirements
4. Calculations, formulas, or algorithms match the specified business logic
5. Feature integrates correctly with existing features it depends on or that depend on it

Severity guidance:
- BLOCKER: Feature output does not match the specified result for the standard case, acceptance criterion not implemented
- WARNING: Feature works for most cases but mishandles an explicitly specified scenario, calculation off by a factor
- INFO: Feature correct but implementation approach differs from the spec's implied design

Example findings:
- BLOCKER: `src/services/pricing.ts:calculateTax()` returns tax-inclusive price but spec requires tax-exclusive — downstream totals will be wrong
- WARNING: Plan requirement FR-04 ("users can export to CSV") is listed in CONTEXT.md but no export function exists in the implementation
- INFO: `src/services/shipping.ts:estimateDelivery()` uses calendar days but spec implies business days — clarification needed

---

### Pass 3: Edge Cases

Identify business logic edge cases that the implementation does not handle.

What to check:
1. Zero and empty input: what happens when quantities are 0, lists are empty, strings are blank?
2. Boundary values: does the logic correctly handle the exact limit (e.g., the 100th item, the last day of the month)?
3. Concurrent operations: can two users simultaneously trigger the same business operation with conflicting results?
4. Time zone and locale: date calculations, deadlines, and display values are time-zone-aware
5. Currency and precision: monetary calculations use correct precision — no floating-point arithmetic on money

Severity guidance:
- BLOCKER: Concurrent operation produces incorrect or inconsistent results (race condition in business logic), floating-point arithmetic on monetary values
- WARNING: Boundary value produces incorrect result, date calculation is time-zone-naive for a multi-region app
- INFO: Empty list case returns empty result correctly but could be more explicit with a specific empty state

Example findings:
- BLOCKER: `src/services/inventory.ts:reserve()` has no lock — two concurrent purchases of the last item will both succeed
- BLOCKER: `src/services/billing.ts:calculateTotal()` uses `price * quantity` with JavaScript floats — will produce rounding errors
- WARNING: `src/utils/deadline.ts:isExpired()` compares `Date.now()` to a stored UTC timestamp without time zone conversion — wrong for users in UTC+12

---

### Pass 4: State Transitions

Verify that stateful entities follow valid transition rules.

What to check:
1. All valid state transitions are implemented and all invalid transitions are rejected
2. State transition side effects (notifications, audit logs, downstream updates) fire on every valid transition
3. No entity can reach an undefined or inconsistent state through any code path
4. State machine is consistent across all code paths that can trigger a transition
5. Terminal states (cancelled, archived, completed) prevent further modifications

Severity guidance:
- BLOCKER: Invalid state transition is possible (e.g., cancelled order can be shipped), terminal state doesn't prevent modification
- WARNING: Side effect missing for a transition (no audit log on status change), transition possible through one path but not another
- INFO: State transitions could be consolidated into a formal state machine for clarity

Example findings:
- BLOCKER: `src/services/orders.ts:ship()` does not check current status — can ship a cancelled order
- BLOCKER: `src/api/subscriptions.ts:cancel()` sets status to "cancelled" but `src/api/subscriptions.ts:update()` still allows field updates on cancelled subscriptions
- WARNING: `src/services/orders.ts:complete()` sets status to "completed" but does not trigger the `order.completed` event that downstream services listen to

---

### Pass 5: Data Flow

Trace how data moves through the business logic layer to ensure no loss, corruption, or leakage.

What to check:
1. Data transformations are lossless — no fields silently dropped during mapping or serialization
2. Sensitive data (PII, payment details) is not logged, cached, or returned in responses where it shouldn't be
3. Data is correctly scoped to the user/tenant — no cross-tenant data leakage
4. Derived values (totals, aggregates, computed fields) are recalculated on source data changes
5. Data passed between functions retains required context — no stripping of fields needed downstream

Severity guidance:
- BLOCKER: Cross-tenant data leakage, PII included in logs or responses, data corruption during transformation
- WARNING: Derived value not refreshed when source changes (stale aggregate), field dropped in mapping that is needed downstream
- INFO: Data carries more context than needed through the pipeline (performance/privacy consideration)

Example findings:
- BLOCKER: `src/api/users.ts:list()` queries without `WHERE tenant_id = ?` — returns all users across all tenants
- BLOCKER: `src/services/auth.ts:login()` logs the full request body including `password` field
- WARNING: `src/services/orders.ts:getTotal()` returns a stored `total` field instead of recalculating — will be stale if line items change

---

### Pass 6: User Journey Completeness

Verify that the implementation supports the complete user journey described in the requirements.

What to check:
1. All steps of the user journey from entry to goal completion are implemented
2. Error paths in the journey have recovery options — users are not stranded
3. The journey can be completed without requiring information or actions not described in the requirements
4. Progress within a multi-step journey is preserved (not lost on browser refresh or session restart)
5. The journey's terminal state is clearly communicated to the user

Severity guidance:
- BLOCKER: User cannot complete the described journey — a required step is not implemented
- WARNING: Journey progress lost on refresh (no persistence), unclear terminal state (user doesn't know if they succeeded)
- INFO: Recovery from an error mid-journey starts the journey over instead of resuming from the failed step

Example findings:
- BLOCKER: Onboarding flow requires email verification but `src/api/auth/verify.ts` endpoint is not implemented — users cannot complete onboarding
- WARNING: `src/components/CheckoutWizard.tsx` step state is in-memory only — refreshing the page resets to step 1
- INFO: `src/pages/OrderConfirmation.tsx` shows a generic "Done" message — user cannot tell if payment was charged or just reserved

---

### Output Format

## Business Logic Evaluation — Results

**Evaluator**: Business Logic (6-pass)
**Files Reviewed**: {count}
**Total Findings**: {N} ({blockers} BLOCKER, {warnings} WARNING, {infos} INFO)

### Pass Results

| Pass | Name | Findings | Verdict |
|------|------|----------|---------|
| 1 | Product Rules Compliance | {N} | PASS / NEEDS WORK / FAIL |
| 2 | Feature Correctness | {N} | PASS / NEEDS WORK / FAIL |
| 3 | Edge Cases | {N} | PASS / NEEDS WORK / FAIL |
| 4 | State Transitions | {N} | PASS / NEEDS WORK / FAIL |
| 5 | Data Flow | {N} | PASS / NEEDS WORK / FAIL |
| 6 | User Journey Completeness | {N} | PASS / NEEDS WORK / FAIL |

### All Findings

{Finding blocks, grouped by pass}

### Aggregate Verdict

PASS | NEEDS WORK | FAIL
Rationale: {one sentence}
```

---

## Section 6: Execution Model

How evaluators run and how cost is managed.

### 6.1 Single Invocation Per Evaluator

Each evaluator type runs as ONE agent invocation — not one invocation per pass.

```
Incorrect model (DO NOT USE):
  Invocation 1: Code Quality Pass 1 (Build Integrity)
  Invocation 2: Code Quality Pass 2 (Type Safety)
  Invocation 3: Code Quality Pass 3 (Patterns)
  ... 6 invocations for Code Quality alone

Correct model:
  Invocation 1: Code Quality (all 6 passes in one rubric prompt)
  Invocation 2: UI/UX (all 7 passes in one rubric prompt)      [if selected]
  Invocation 3: Integration (all 6 passes in one rubric prompt) [if selected]
  Invocation 4: Business Logic (all 6 passes in one rubric prompt) [if selected]
```

### 6.2 How Passes Work Within One Invocation

The full rubric prompt (Sections 2-5) is injected as the agent's evaluation instructions. The agent works through each pass section in order, producing a structured block of findings per pass. This is identical in structure to how review-panel uses per-criterion evaluation — the difference is that all criteria are delivered in one prompt rather than assigned across multiple agents.

```
Agent receives:
  1. Its full personality (from agents/ directory)
  2. The evaluator rubric prompt (all passes for its evaluator type)
  3. The files to review (from phase plan files_modified)
  4. The phase context (CONTEXT.md and SUMMARY.md content)

Agent produces:
  1. Structured findings grouped by pass
  2. Per-pass verdict (PASS / NEEDS WORK / FAIL)
  3. Aggregate verdict with rationale
```

### 6.3 Cost Profile

| Scenario | Invocations | Relative Cost |
|----------|-------------|---------------|
| Standard review-panel (no evaluators) | 2-4 | 1× |
| Single evaluator (e.g., Code Quality only) | 1 | ~1× |
| Two evaluators (e.g., CQ + Integration) | 2 | ~2× |
| Full four evaluators | 4 | ~4× |
| review-panel + two evaluators combined | 4-6 | ~3-4× |

Multi-pass evaluators are comparable in cost to standard panel reviews — the multi-pass depth comes from the rubric structure, not additional invocations.

### 6.4 Personality Assignment

Each evaluator type maps to a specific agent personality that has the deepest alignment with its domain:

| Evaluator | Default Personality | Reason |
|-----------|--------------------|---------|
| Code Quality | engineering-senior-developer | Broadest code quality expertise across patterns, testing, and architecture |
| UI/UX | design-ux-architect | Covers design system, accessibility, and structure — all 7 pass domains |
| Integration | testing-api-tester | API contracts, auth flows, and integration testing are core to this agent |
| Business Logic | product-feedback-synthesizer | Business rules, user journeys, and feature correctness alignment |

When dispatching externally (Code Quality → Codex, UI/UX → Gemini), the personality is injected into the dispatch prompt prefix rather than relying on the external CLI's default persona.

### 6.5 Result Structure

Each evaluator produces a structured markdown result. Results are collected and passed to Section 7 (Finding Deduplication) before being merged into the final review report.

```
Evaluator Result Structure:
  ## {Evaluator Type} Evaluation — Results
  **Evaluator**: {type} ({N}-pass)
  **Files Reviewed**: {count}
  **Total Findings**: {N}

  ### Pass Results
  {pass results table}

  ### All Findings
  {finding blocks grouped by pass}

  ### Aggregate Verdict
  {PASS | NEEDS WORK | FAIL}
  Rationale: {one sentence}
```

---

## Section 7: Finding Deduplication

Cross-pass and cross-evaluator deduplication to eliminate redundant findings before synthesis.

This section extends the deduplication logic defined in `skills/review-panel/SKILL.md` Section 3, Step 2. Use the same deduplication algorithm as a base — the extensions below handle the multi-pass and multi-evaluator dimensions.

### 7.1 Cross-Pass Deduplication (Within One Evaluator)

When the same issue appears in multiple passes of the same evaluator:

```
Step 1: Build dedup key for each finding
  Key format: "{file_path}:{line_number}:{issue_category}"

  Where issue_category is normalized from finding descriptions:
  - import, type, pattern, state, error, dead-code, test (Code Quality passes)
  - design-token, visual, layout, responsive, component-state, a11y, usability (UI/UX passes)
  - api-contract, auth, schema, recovery, config, e2e (Integration passes)
  - product-rule, feature, edge-case, state-machine, data-flow, journey (Business Logic passes)

Step 2: Group findings by dedup key across all passes

Step 3: For each group with 2+ findings:
  a. Keep the HIGHEST severity (BLOCKER > WARNING > INFO)
  b. If equal severity: keep HIGHEST confidence
  c. If equal severity and confidence: merge descriptions, list all pass numbers that found it
  d. Tag: "Found in passes: {N1}, {N2}"

Step 4: Log cross-pass merges
  "Cross-pass dedup: {N} findings merged into {M} unique findings within {evaluator_type}"
```

### 7.2 Cross-Evaluator Deduplication (Across Multiple Evaluators)

When Code Quality and Integration (or any two evaluators) both flag the same issue:

```
Step 1: Collect all findings from all completed evaluators

Step 2: Build dedup key across evaluators
  Key format: "{file_path}:{line_number}:{issue_category}"
  (same key format as 7.1 — enables cross-evaluator matching)

Step 3: For each key found in 2+ evaluators:
  a. Keep the HIGHEST severity across evaluators
  b. Merge finding: label "Reported by: {evaluator_A}, {evaluator_B}"
  c. Include both suggested fixes as options, ranked by evaluator authority:
     Code Quality authority: code patterns, types, dead code
     UI/UX authority: visual, a11y, usability
     Integration authority: API contracts, auth, schema
     Business Logic authority: product rules, state machines, journeys

Step 4: Log cross-evaluator merges
  "Cross-evaluator dedup: {N} findings merged (e.g., Code Quality + Integration both found src/auth.ts:45 type error)"
```

### 7.3 Severity Escalation

Consistent with review-panel dedup (SKILL.md Section 3, Step 2):

```
Same issue, different severity from different passes or evaluators → escalate to highest
Rationale: If any evaluator considers it blocking, treat as blocking.
Log escalations for the deduplication report.
```

### 7.4 Deduplication Report

After all deduplication passes complete, produce a summary consistent with review-panel's deduplication report format (SKILL.md Section 3, Step 2.5):

```markdown
### Evaluator Deduplication Summary

| Metric | Count |
|--------|-------|
| Raw findings (all evaluators, all passes) | {N} |
| After cross-pass dedup | {M} |
| After cross-evaluator dedup | {K} |
| Total findings merged | {N - K} |
| Severity escalations | {L} |

### Merged Findings

| Location | Original Severity | Final Severity | Source |
|----------|-------------------|----------------|--------|
| src/x.ts:45 | WARNING → BLOCKER | BLOCKER | Code Quality Pass 2, Integration Pass 1 |
```

### 7.5 Dedup Key Collision Handling

```
If two findings share the same file_path and line_number but different issue_category:
  → Do NOT merge. They are separate issues at the same location.
  → Keep both findings.
  → Reason: A type error and a dead code issue at the same line are distinct problems.

If line_number is absent from a finding:
  → Key: "{file_path}::{issue_category}" (double colon signals no line number)
  → Merge with other no-line findings at the same file and category only.
  → Do NOT merge file-level findings with line-level findings.
```

---

## Section 8: Dispatch Integration

How evaluators use `cli-dispatch` (from the wave-executor and review-loop dispatch patterns) for external CLI routing.

### 8.1 Dispatch Targets

| Evaluator | Dispatch Target | Capability Required | Fallback |
|-----------|-----------------|--------------------|---------|
| Code Quality | Codex | `code_review` | Internal (engineering-senior-developer) |
| UI/UX | Gemini | `ui_design` | Internal (design-ux-architect) |
| Integration | Internal | N/A | N/A (always internal) |
| Business Logic | Internal | N/A | N/A (always internal) |

### 8.2 Dispatch Protocol

For evaluators with an external dispatch target:

```
Step 1: Check adapter availability
  Load adapter for target CLI (e.g., codex-cli.md, gemini-cli.md)
  Check adapter.capabilities list for required capability

  If capability present AND CLI configured:
    Proceed with external dispatch (Step 2)
  Else:
    Log: "Dispatch target {CLI} not available for {capability} — running internally"
    Use fallback personality (Section 6.4) and run internally

Step 2: Build dispatch prompt
  Prefix: Agent personality (full content of agents/{personality}.md)
  Body: Evaluator rubric prompt (Sections 2-5, appropriate for evaluator type)
  Suffix: Files to review (content of files_modified)
  Context: Phase CONTEXT.md and SUMMARY.md summaries

Step 3: Dispatch to target CLI
  Use wave-executor dispatch pattern for the active adapter
  model_tier: "execution" (this is a substantive review, not a planning call)

Step 4: Collect result
  Wait for completion per adapter.collect_results
  Parse structured output — expect the evaluator result format from Sections 2-5

Step 5: Validate result structure
  Confirm result contains: Pass Results table, All Findings section, Aggregate Verdict
  If structure invalid or missing sections:
    Log: "External evaluator result malformed — sections: {found} vs expected: {required}"
    Flag result as PARTIAL and include raw output for manual review
```

### 8.3 Fallback Behavior

```
Conditions that trigger fallback to internal execution:
  1. Target CLI adapter not found in adapters/ directory
  2. Adapter found but required capability not listed
  3. Dispatch attempt fails (timeout, authentication error, rate limit)
  4. Collected result fails structure validation

Fallback procedure:
  1. Log reason for fallback at INFO level
  2. Assign internal agent from Section 6.4 personality table
  3. Run evaluator rubric prompt as internal agent invocation
  4. Proceed with result as normal — fallback is transparent to the synthesis step

Important: Fallback results must use the SAME output format as external dispatch results.
  The deduplication (Section 7) and synthesis steps do not distinguish between
  externally-dispatched and internally-run evaluator results.
```

### 8.4 Result Format Consistency

Regardless of whether the evaluator ran externally or internally, the collected result must conform to the structured format defined in each evaluator section (Sections 2-5). This ensures Section 7 deduplication and the final review-loop synthesis step can process all results uniformly.

```
Required sections in every evaluator result:
  - ## {Type} Evaluation — Results header
  - **Evaluator**: {type} ({N}-pass) metadata line
  - ### Pass Results table (one row per pass)
  - ### All Findings section (finding blocks grouped by pass)
  - ### Aggregate Verdict with rationale

If an external CLI returns output in a different format:
  → Attempt to reformat to standard structure before dedup
  → If reformatting fails: include raw output in a "Raw External Output" section
  → Mark evaluator result as PARTIAL in the pass results table
  → Do not block synthesis — partial results proceed with a warning
```

### 8.5 Integration with Review Loop

Evaluator results feed into the existing review-loop cycle:

```
review-loop Section 4 (Feedback Collection):
  Collect evaluator results alongside standard panel findings
  Evaluator findings tagged with source: "evaluator:{type}:pass:{N}"
  Source tag is preserved through deduplication for traceability

review-loop Section 5 (Fix Cycle):
  Evaluator BLOCKERs and WARNINGs treated identically to panel BLOCKERs/WARNINGs
  Fix cycle applies to all findings regardless of source evaluator

review-loop aggregate verdict:
  PASS requires: all evaluator aggregate verdicts are PASS AND panel verdict is PASS
  NEEDS WORK: any evaluator or panel verdict is NEEDS WORK
  FAIL: any evaluator or panel verdict is FAIL, OR 3+ BLOCKERs across all sources
```

---

## References

| Pattern | Source | Used In |
|---------|--------|---------|
| Domain Rubric Registry (evaluation criteria structure) | skills/review-panel/SKILL.md Section 2 | Sections 2-5 (pass rubric format) |
| Deduplication Algorithm (location-based dedup, severity escalation) | skills/review-panel/SKILL.md Section 3, Step 2 | Section 7 (cross-pass and cross-evaluator dedup) |
| Deduplication Report Format | skills/review-panel/SKILL.md Section 3, Step 2.5 | Section 7.4 (dedup summary table) |
| CLI Dispatch Pattern | skills/wave-executor/SKILL.md | Section 8.2 (dispatch protocol) |
| Feedback Collection | skills/review-loop/SKILL.md Section 4 | Section 8.5 (review-loop integration) |
| Fix Cycle | skills/review-loop/SKILL.md Section 5 | Section 8.5 (review-loop integration) |
