---
type: auto-update-manifest
generated: "YYYY-MM-DD HH:MM:SS"
source: "codebase-mapper Section 16"
---

# Auto-Update Manifest

Record of automatic directory mappings updates.

## Update Summary

**Update Date:** {timestamp}
**Trigger:** {status | build | plan | post-execution}
**Significance:** {minor | moderate | major}
**Backup:** {backup file path}

## Changes Applied

### New Directories Added
| Directory | Category | Files | Source |
|-----------|----------|-------|--------|
| {path} | {category} | {count} | Auto-detected |

### Removed Directories
| Directory | Was Category | Reason |
|-----------|-------------|--------|
| {path} | {category} | Directory no longer exists |

### Modified Categories
| Category | Change | Details |
|----------|--------|---------|
| {category} | {growth/decline} | {old} → {new} files |

### New Categories (Pending Review)
| Category | Path | Files | Status |
|----------|------|-------|--------|
| {category} | {path} | {count} | ⚠️ Auto-detected, needs review |

## Manual Overrides

Changes that were manually adjusted during review:

| Original | Changed To | Reason |
|----------|-----------|--------|
| {original} | {new} | {explanation} |

## Verification

- [ ] New directories verified to exist
- [ ] Removed directories verified to be gone
- [ ] Category assignments reviewed
- [ ] Auto-detected categories approved or corrected
- [ ] Backup file verified and accessible

## Sign-Off

**Updated By:** {user or auto}
**Reviewed By:** {user if manual review}
**Notes:** {any additional notes}
