---
phase: 99-wave-test
plan: 02
type: execute
wave: 1
depends_on: []
files_modified: [skills/foo/SKILL.md, tests/new-test.js]
files_forbidden: [agents/, commands/]
verification_commands:
  - echo ok
---

# Wave 1 Plan B

Test fixture for wave overlap detection. Overlaps with Plan A on skills/foo/SKILL.md.
