#!/usr/bin/env bash
# ==========================================================
# safe-branch-cleanup.sh
# Finds stale remote branches and (optionally) deletes them.
#
# Run from inside any repo directory (woosoo-platform,
# tablet-ordering-pwa, woosoo-print-bridge, etc.).
#
# Usage:
#   bash scripts/safe-branch-cleanup.sh            # dry run — always safe
#   DRY_RUN=false bash scripts/safe-branch-cleanup.sh  # actually delete
# ==========================================================

set -euo pipefail
# set -e        → abort immediately if any command exits non-zero
# set -u        → treat any unset variable as an error
# set -o pipefail → if any command in a pipe fails, the whole pipe fails

# ── CONFIGURATION ────────────────────────────────────────────
# Regex of branch names that must NEVER be deleted.
# Edit this list if your team adds more permanent branches.
PROTECTED="main|master|dev|staging"

# The remote alias to target (almost always 'origin').
REMOTE="origin"

# Safety default: dry-run prints candidates without deleting anything.
# Override at call-time:  DRY_RUN=false bash scripts/safe-branch-cleanup.sh
DRY_RUN="${DRY_RUN:-true}"
# ─────────────────────────────────────────────────────────────

echo ""
echo "======================================================"
echo "  safe-branch-cleanup.sh"
echo "  Repo : $(basename "$PWD")"
echo "  Mode : $([ "$DRY_RUN" == "true" ] && echo 'DRY RUN (no deletions)' || echo 'LIVE — branches will be deleted')"
echo "======================================================"


# ── STEP 1: Sync ─────────────────────────────────────────────
# Downloads the current list of branches from the remote.
# --prune removes local "bookmarks" for remote branches that no longer
#   exist — safe, it only touches tracking references, not real branches.
echo ""
echo ">>> [1/4] Syncing with remote '$REMOTE'..."
git fetch --prune "$REMOTE"


# ── STEP 2: Find merged branches ─────────────────────────────
# `git branch -r --merged origin/main` lists every remote branch whose
# commits are already contained inside origin/main.  When a PR is merged
# the feature branch becomes redundant — every commit it ever held now
# lives in main.
#
# We then filter out:
#   HEAD             → a pointer alias, not a real branch
#   PROTECTED names  → the safety block applied BEFORE any deletion
#   "origin/" prefix → stripped so the name is ready for `git push --delete`
echo ""
echo ">>> [2/4] Finding branches fully merged into $REMOTE/main..."
MERGED=$(
  git branch -r --merged "$REMOTE/main" \
    | grep -v "HEAD" \
    | grep -vE "^\s*$REMOTE/($PROTECTED)$" \
    | sed "s|[[:space:]]*$REMOTE/||"
)

if [[ -z "$MERGED" ]]; then
  echo "    (none found)"
else
  echo "$MERGED" | sed 's/^/    /'
fi


# ── STEP 3: Find branches with no unique commits ──────────────
# A branch may not appear as "merged" when the team used squash-merge or
# rebase instead of a standard merge commit.  We catch those here by
# counting commits that exist in the branch but NOT in main.
#
# `git rev-list --count A..B`  = "how many commits are in B but not A?"
# A count of 0 means the branch adds nothing new — safe to delete.
echo ""
echo ">>> [3/4] Finding branches with 0 unique commits vs $REMOTE/main..."
STALE=""
for FULL_BRANCH in $(git branch -r | grep -v "HEAD" | grep -vE "^\s*$REMOTE/($PROTECTED)$"); do
  SHORT="${FULL_BRANCH#"$REMOTE/"}"      # strip the "origin/" prefix
  SHORT="${SHORT//[[:space:]]/}"         # strip any surrounding whitespace
  AHEAD=$(git rev-list --count "$REMOTE/main".."$REMOTE/$SHORT" 2>/dev/null || echo "0")
  if [[ "$AHEAD" -eq 0 ]]; then
    # Skip branches already caught by the --merged check above
    if ! echo "$MERGED" | grep -qxF "$SHORT"; then
      STALE="$STALE
$SHORT"
      echo "    $SHORT  (0 commits ahead of main)"
    fi
  fi
done
[[ -z "$STALE" ]] && echo "    (none found)"


# ── STEP 4: Combine, de-duplicate, and act ───────────────────
# Merge both candidate lists, remove duplicates and blank lines.
ALL_CANDIDATES=$(printf '%s\n%s\n' "$MERGED" "$STALE" | sort -u | grep -v '^$')

echo ""
echo "======================================================"
echo "  DELETION CANDIDATES"
echo "----------------------------------------------"
if [[ -z "$ALL_CANDIDATES" ]]; then
  echo "  None found — nothing to do."
  echo "======================================================"
  exit 0
fi
echo "$ALL_CANDIDATES" | sed 's/^/  /'
echo "======================================================"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo ">>> DRY RUN complete — no branches were deleted."
  echo ">>> If the list above looks correct, run for real with:"
  echo ">>>   DRY_RUN=false bash scripts/safe-branch-cleanup.sh"
else
  echo ""
  echo ">>> Deleting branches from remote '$REMOTE'..."
  while IFS= read -r BRANCH; do
    [[ -z "$BRANCH" ]] && continue
    echo "  Deleting: $BRANCH"
    git push "$REMOTE" --delete "$BRANCH"
  done <<< "$ALL_CANDIDATES"
  echo ""
  echo ">>> Done."
  echo ">>> IMPORTANT: have all teammates run the following on their machines"
  echo ">>>   to remove stale local tracking refs:"
  echo ">>>   git fetch --prune"
fi
