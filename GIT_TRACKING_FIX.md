# Quick Fix Guide: Git Tracking Issues

## Overview
This repository has 3 files that should NOT be tracked in git:
1. `frontend/dist/index.html` (1.4 MB build artifact)
2. `mailora.sqlite` (244 KB database)
3. `email-dashboard-handoff.zip` (1.1 MB archive)

---

## Step 1: Update .gitignore

Edit `.gitignore` to add missing patterns:

```bash
# Current content has some duplication and misses database patterns
# Replace the file with this:
```

**Replace the contents of `.gitignore` with:**

```
# Dependencies
node_modules/

# Environment files
.env
.env.*
!.env.example

# Build artifacts
frontend/dist/
dist/
build/

# Database files
*.sqlite
*.sqlite3
*.db
*.log

# Archive files
*.zip
*.tar
*.tar.gz
*.rar

# Other
.vercel
.DS_Store
*.pem
*.key
```

**Or use command:**
```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Environment files
.env
.env.*
!.env.example

# Build artifacts
frontend/dist/
dist/
build/

# Database files
*.sqlite
*.sqlite3
*.db

# Archive files
*.zip
*.tar
*.tar.gz

# Other
.vercel
.DS_Store
EOF
```

---

## Step 2: Remove Files from Git Index

These commands remove files from git's tracking WITHOUT deleting them from disk:

```bash
# Remove the problematic files from git tracking
git rm --cached frontend/dist/index.html
git rm --cached mailora.sqlite
git rm --cached email-dashboard-handoff.zip

# Verify they're removed from index
git status
```

**Expected output:**
```
deleted:    frontend/dist/index.html
deleted:    mailora.sqlite
deleted:    email-dashboard-handoff.zip
```

---

## Step 3: Commit the Changes

```bash
git add .gitignore

git commit -m "ci: Remove build artifacts and database from git tracking

BREAKING: Removes the following from git:
- frontend/dist/index.html (build artifact)
- mailora.sqlite (database file)
- email-dashboard-handoff.zip (archive file)

These files should never have been committed. They are now properly
ignored by .gitignore.

Files remain on disk but are no longer tracked by git.
Changes to these files will not appear in git status."
```

---

## Step 4: Verify the Fix

```bash
# Check git status is clean
git status

# Verify files are now ignored
git check-ignore -v frontend/dist/index.html mailora.sqlite email-dashboard-handoff.zip

# List what's still tracked in these directories
git ls-files frontend/dist/ | head -5
git ls-files | grep -E "\.sqlite|\.zip"
```

**Expected output:**
- `git status` shows clean working tree
- `git check-ignore` shows all files match ignore rules
- `git ls-files` shows no more problematic files

---

## Advanced: Clean Full Git History (OPTIONAL)

⚠️ **WARNING**: This rewrites git history. Only do this if:
- You haven't pushed yet, OR
- You coordinate with all team members, OR
- This is a local/private repository

```bash
# BACKUP FIRST
git bundle create backup.bundle --all

# Remove files from entire git history
git filter-branch --tree-filter 'rm -f mailora.sqlite email-dashboard-handoff.zip frontend/dist/index.html' -- --all

# Clean up refs
git reflog expire --expire=now --all
git gc --aggressive --prune=now

# Check new size (should be smaller)
du -sh .git
```

**Repository size reduction expected:** ~2-3 MB

---

## Troubleshooting

### Issue: "git check-ignore" still shows tracked
```bash
# Sometimes git caches the index. Force refresh:
git rm -r --cached .
git add .
git status
```

### Issue: Files were tracked before .gitignore rule
```bash
# The file was committed before being added to .gitignore
# Solution: Remove from index (Step 2 above) - this is sufficient
git rm --cached <file>
git commit -m "Remove <file> from tracking"
```

### Issue: Want to move files out of repo
```bash
# Save the files first
cp frontend/dist ~/backup/
cp mailora.sqlite ~/backup/
cp email-dashboard-handoff.zip ~/backup/

# Then remove from git
git rm --cached <file>
git commit -m "Move files out of git tracking"
```

---

## Before/After Comparison

### Before Fix
```
Files Tracked: 176
Git Repository Size: 51 MB
Problematic Files: 3
  - frontend/dist/ (1.4 MB)
  - mailora.sqlite (244 KB)
  - email-dashboard-handoff.zip (1.1 MB)

.gitignore: Incomplete (8 lines)
  - Missing database patterns
  - Has duplicate rules
```

### After Fix
```
Files Tracked: 173 (3 fewer)
Git Repository Size: 51 MB (same - history not cleaned)
Problematic Files: 0

.gitignore: Complete (20+ lines)
  - Covers databases, archives, build artifacts
  - No duplicates
  - Clear comments
```

If you also run git history cleanup:
```
Git Repository Size: ~48-49 MB (2-3 MB smaller)
```

---

## Related Commands

```bash
# See what's currently tracked
git ls-files

# See what's ignored (but exists on disk)
git ls-files --others --ignored --exclude-standard

# See what would be staged (before commit)
git diff --cached --name-only

# Check if specific file is ignored
git check-ignore -v frontend/dist/index.html

# Remove file from git but keep on disk
git rm --cached <file>

# Remove file from git and disk
git rm <file>

# Dry run: see what would be removed
git rm --cached --dry-run frontend/dist/
```

---

## Questions?

- **Why remove from tracking?** Build artifacts and databases change frequently and shouldn't be version controlled.
- **Will I lose data?** No - the files remain on your disk. Only git stops tracking changes to them.
- **Should we commit after this?** Yes, one commit with .gitignore and removed files.
- **Do we need to notify the team?** Yes, if code is shared. The commit only removes files already on their disk.
