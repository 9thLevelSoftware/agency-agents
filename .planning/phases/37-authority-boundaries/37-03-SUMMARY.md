---
phase: 37-authority-boundaries
plan: 03
subsystem: review

# Dependency graph
requires:
  - phase: 37-01
    provides: authority-enforcer skill with filterFindings() function
provides:
  - Review panel with location-based deduplication and severity escalation
  - Out-of-domain critique filtering based on domain ownership
  - Authority Filtering Report with statistics
  - Review-loop integration with authority-aware fix assignment
  - Conflict resolution procedures for authority boundary issues
affects:
  - skills/review-panel
  - skills/review-loop
  - /legion:review command workflow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Location-based deduplication by file:line with line range overlap detection"
    - "Severity escalation (BLOCKER > WARNING > SUGGESTION) for conflicting findings"
    - "Domain ownership mapping for authority filtering"
    - "Keyword-based domain detection (security, performance, API, accessibility)"
    - "Authority-aware fix assignment to domain owners"

key-files:
  created: []
  modified:
    - skills/review-panel/SKILL.md - Enhanced deduplication, added out-of-domain filtering
    - skills/review-loop/SKILL.md - Authority integration, conflict resolution

key-decisions:
  - "Priority ordering: BLOCKER first, then WARNING, then SUGGESTION; domain owner findings prioritized within severity"
  - "Three filtering rules: filter out-of-domain when owner present, allow all when no owner, always allow owner's own critiques"
  - "Conflict resolution: trust domain owner over general reviewer, flag overlapping domain expertise"

patterns-established:
  - "Location deduplication: Normalize paths, detect line range overlaps, merge findings at same location"
  - "Severity escalation: Err on side of caution — if any reviewer considers it blocking, it is"
  - "Authority filtering: Domain owner presence determines whether out-of-domain critiques are valid"

requirements-completed: [AUTH-03, AUTH-04]

# Metrics
duration: 8 min
completed: 2026-03-05
---

# Phase 37 Plan 03: Review Panel Deduplication and Authority Filtering

**Review panel with location-based deduplication by file:line, severity escalation, and out-of-domain critique filtering when domain owners are present**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-05T16:45:00Z
- **Completed:** 2026-03-05T16:53:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Enhanced review panel with location-based deduplication and severity escalation rules
- Implemented out-of-domain critique filtering with domain ownership detection
- Added Authority Filtering Report showing statistics on filtered findings
- Integrated authority awareness into review-loop fix cycle with priority ordering
- Created Section 8 for Authority Conflict Resolution with three conflict types

## Task Commits

Each task was committed atomically:

1. **Task 1: Add finding deduplication to review panel synthesis** - `9efcd61` (feat)
2. **Task 2: Add out-of-domain filtering to review panel** - `028422e` (feat)
3. **Task 3: Update review-loop with authority integration** - `a6d2970` (feat)

## Files Created/Modified
- `skills/review-panel/SKILL.md` - Enhanced Section 3 with:
  - Step 2: Location-based deduplication with line range overlap detection
  - Step 2.5: Deduplication report generation
  - Step 3: Out-of-domain critique filtering with domain ownership mapping
  - Step 4: Updated domain lens grouping with authority notes
  - Authority Filtering Report in consolidated output
- `skills/review-loop/SKILL.md` - Updated with:
  - Enhanced Step 2: Deduplicate and filter findings (2a, 2b, 2c)
  - Authority-Aware Fix Assignment in Section 5
  - Section 8: Authority Conflict Resolution

## Decisions Made
- **Severity escalation priority:** BLOCKER > WARNING > SUGGESTION — err on side of caution
- **Domain detection:** Keyword-based matching plus criterion tags from rubrics
- **Filtering rules:** Three-rule system ensuring domain owner authority while allowing general critiques when no owner present
- **Fix assignment:** Route domain-specific findings to domain owners, general findings to implementers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Review panel deduplication complete — ready for integration with two-wave pattern
- Authority filtering infrastructure in place — wave executor can inject domain constraints
- Requirements AUTH-03 and AUTH-04 satisfied
- Ready for Plan 37-04: Build two-wave pattern implementation

---
*Phase: 37-authority-boundaries*
*Completed: 2026-03-05*
