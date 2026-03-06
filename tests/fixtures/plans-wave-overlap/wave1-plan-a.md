---
phase: 99-wave-test
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [skills/foo/SKILL.md, skills/bar/SKILL.md]
files_forbidden: [agents/, commands/]
verification_commands:
  - echo ok
---

# Wave 1 Plan A

Test fixture for wave overlap detection. Modifies skills/foo/SKILL.md and skills/bar/SKILL.md.
