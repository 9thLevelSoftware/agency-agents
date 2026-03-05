#!/usr/bin/env bash
# validate.sh - Health check for the Legion repository
# Usage: bash scripts/validate.sh
# Exit 0 if all checks pass, 1 if any fail.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$REPO_ROOT/agents"
SKILLS_DIR="$REPO_ROOT/skills"
COMMANDS_DIR="$REPO_ROOT/commands"
REGISTRY="$SKILLS_DIR/agent-registry/CATALOG.md"
README="$REPO_ROOT/README.md"
CHANGELOG="$REPO_ROOT/CHANGELOG.md"

PASS=0
FAIL=0
WARN=0

NODE_BIN="${NODE_BIN:-}"
if [[ -z "$NODE_BIN" ]]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="node"
  elif command -v node.exe >/dev/null 2>&1; then
    NODE_BIN="node.exe"
  else
    echo "  FAIL  Node.js runtime not found in PATH (tried node, node.exe)"
    exit 1
  fi
fi

pass()  { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail()  { echo "  FAIL  $1"; FAIL=$((FAIL + 1)); }
warn()  { echo "  WARN  $1"; WARN=$((WARN + 1)); }
header(){ echo ""; echo "=== $1 ==="; }

frontmatter_field() {
  local file="$1" field="$2"
  awk -v field="$field" '
    /^---$/ { if (NR==1) { in_fm=1; next } else { in_fm=0 } }
    in_fm && tolower($0) ~ "^" tolower(field) ":" {
      sub(/^[^:]+:[[:space:]]*/, ""); print; exit
    }
  ' "$file"
}

header "CHECK 0 - Release version sync"

pkg_version="$(cd "$REPO_ROOT" && "$NODE_BIN" -e "console.log(require('./package.json').version)")"
changelog_version="$(awk '/^## \[[^]]+\]/{gsub(/^## \[/, ""); gsub(/\].*$/, ""); print; exit}' "$CHANGELOG")"

if [[ -z "$changelog_version" ]]; then
  fail "CHANGELOG.md - no top version header found"
elif [[ "$pkg_version" != "$changelog_version" ]]; then
  fail "Version mismatch package.json=$pkg_version CHANGELOG.md=$changelog_version"
else
  pass "Version sync package.json == CHANGELOG.md ($pkg_version)"
fi

header "CHECK 1 - Agent frontmatter schema"

VALID_COLORS="red green blue purple cyan orange yellow pink"
VALID_DIVISIONS="engineering design marketing product project-management testing support spatial-computing specialized custom"

for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f")"
  errors=()

  name=$(frontmatter_field "$f" "name")
  desc=$(frontmatter_field "$f" "description")
  div=$(frontmatter_field "$f" "division")
  color=$(frontmatter_field "$f" "color")

  [[ -z "$name"  ]] && errors+=("missing 'name'")
  [[ -z "$desc"  ]] && errors+=("missing 'description'")
  [[ -z "$div"   ]] && errors+=("missing 'division'")
  [[ -z "$color" ]] && errors+=("missing 'color'")

  if [[ -n "$color" ]]; then
    lcolor=$(echo "$color" | tr '[:upper:]' '[:lower:]')
    valid=0
    for c in $VALID_COLORS; do [[ "$lcolor" == "$c" ]] && valid=1 && break; done
    [[ $valid -eq 0 ]] && errors+=("invalid color '$color'")
  fi

  if [[ -n "$div" ]]; then
    ldiv=$(echo "$div" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    valid=0
    for d in $VALID_DIVISIONS; do [[ "$ldiv" == "$d" ]] && valid=1 && break; done
    [[ $valid -eq 0 ]] && errors+=("invalid division '$div'")
  fi

  if [[ ${#errors[@]} -eq 0 ]]; then
    pass "$base"
  else
    fail "$base - $(IFS=', '; echo "${errors[*]}")"
  fi
done

header "CHECK 2 - Agent-registry sync"

for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f" .md)"
  if grep -q "$base" "$REGISTRY" 2>/dev/null; then
    pass "$base - found in registry"
  else
    fail "$base - NOT found in registry"
  fi
done

while IFS= read -r line; do
  line="${line%$'\r'}"
  if [[ "$line" =~ agents/([a-zA-Z0-9_-]+\.md) ]]; then
    agent_file="${BASH_REMATCH[1]}"
    if [[ -f "$AGENTS_DIR/$agent_file" ]]; then
      pass "registry -> $agent_file exists"
    else
      fail "registry -> $agent_file MISSING on disk"
    fi
  fi
done < "$REGISTRY"

header "CHECK 3 - Persona structure contract"

for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f")"
  missing=()

  grep -Eq '^## .*Identity' "$f" || missing+=("identity section")
  grep -Eq '^## .*(Core Mission|Mission)' "$f" || missing+=("mission section")
  grep -Eq '^## .*(Critical Rules|Rules You Must Follow)' "$f" || missing+=("critical-rules section")
  grep -Eq '^## .*(Technical Deliverables|Workflow Process|Implementation Process|Execution Process|Deliverables|Process)' "$f" || missing+=("deliverables/process section")
  grep -Eq '^## .*(Anti-Patterns|What You Must Not Do|Common Rationalizations|Failure Modes)' "$f" || missing+=("anti-patterns section")
  grep -Eq '^## .*(Done Criteria|Success Criteria|Definition of Done|Completion Criteria|Exit Criteria)' "$f" || missing+=("done-criteria section")

  if [[ ${#missing[@]} -eq 0 ]]; then
    pass "$base"
  else
    fail "$base - missing $(IFS=', '; echo "${missing[*]}")"
  fi
done

header "CHECK 4 - Skill path resolution in <execution_context> blocks"

for cmd in "$COMMANDS_DIR"/*.md; do
  cmdbase="$(basename "$cmd")"
  in_block=0

  while IFS= read -r line; do
    line="${line%$'\r'}"
    if [[ "$line" == "<execution_context>" ]]; then
      in_block=1
      continue
    fi
    if [[ "$line" == "</execution_context>" ]]; then
      in_block=0
      continue
    fi
    if [[ $in_block -eq 1 && -n "$line" ]]; then
      full_path="$REPO_ROOT/$line"
      if [[ -f "$full_path" ]]; then
        pass "$cmdbase -> $line"
      else
        fail "$cmdbase -> $line MISSING"
      fi
    fi
  done < "$cmd"
done

header "CHECK 5 - Agent minimum size contract + telemetry"

under_count=0
over_300_count=0
over_350_count=0

for f in "$AGENTS_DIR"/*.md; do
  base="$(basename "$f")"
  lines=$(wc -l < "$f")

  if [[ $lines -lt 80 ]]; then
    fail "$base - only $lines lines (minimum is 80)"
    under_count=$((under_count + 1))
  else
    pass "$base - $lines lines"
    if [[ $lines -gt 300 ]]; then
      over_300_count=$((over_300_count + 1))
    fi
    if [[ $lines -gt 350 ]]; then
      over_350_count=$((over_350_count + 1))
    fi
  fi
done

echo "  INFO  under-80: $under_count, over-300 (telemetry): $over_300_count, over-350 (telemetry): $over_350_count"

header "CHECK 6 - README metrics block sync"

commands_count=$(find "$COMMANDS_DIR" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
skills_count=$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
agents_count=$(find "$AGENTS_DIR" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
min_lines=$(wc -l "$AGENTS_DIR"/*.md | awk '$2!="total"{if(min==""||$1<min)min=$1} END{print min+1}')
max_lines=$(wc -l "$AGENTS_DIR"/*.md | awk '$2!="total"{if(max==""||$1>max)max=$1} END{print max+1}')

metrics_block=$(awk '/<!-- legion-metrics:start -->/{flag=1;next}/<!-- legion-metrics:end -->/{flag=0}flag' "$README")

if [[ -z "$metrics_block" ]]; then
  fail "README metrics marker block missing"
else
  fail_before="$FAIL"
  grep -Fq -- "- Commands: $commands_count" <<< "$metrics_block" || fail "README metrics out of sync for commands count"
  grep -Fq -- "- Skills: $skills_count" <<< "$metrics_block" || fail "README metrics out of sync for skills count"
  grep -Fq -- "- Agents: $agents_count" <<< "$metrics_block" || fail "README metrics out of sync for agents count"
  grep -Fq -- "- Agent personality line range (current): $min_lines-$max_lines" <<< "$metrics_block" || fail "README metrics out of sync for agent line range"
  fail_after="$FAIL"
  [[ "$fail_before" -eq "$fail_after" ]] && pass "README metrics block is in sync"
fi

header "CHECK 7 - Release consistency checks"

if (cd "$REPO_ROOT" && "$NODE_BIN" ./scripts/release-check.js); then
  pass "scripts/release-check.js"
else
  fail "scripts/release-check.js"
fi

echo ""
echo "========================================"
echo "  SUMMARY"
echo "  PASS: $PASS   FAIL: $FAIL   WARN: $WARN"
echo "========================================"

if [[ $FAIL -gt 0 ]]; then
  echo "  Result: FAILED ($FAIL issue(s) require attention)"
  exit 1
else
  echo "  Result: ALL REQUIRED CHECKS PASSED"
  exit 0
fi
