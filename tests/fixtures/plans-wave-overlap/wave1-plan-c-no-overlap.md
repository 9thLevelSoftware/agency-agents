---
phase: 99-wave-test
plan: 03
type: execute
wave: 1
depends_on: []
files_modified: [commands/new-command.md]
files_forbidden: [agents/]
verification_commands:
  - echo ok
---

# Wave 1 Plan C (No Overlap)

Test fixture for wave overlap detection. No overlapping files with Plan A or Plan B.
