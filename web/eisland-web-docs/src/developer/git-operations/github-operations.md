---
title: GitHub Operations
icon: fa6-brands:github
---

# GitHub Operations

:::info
This document covers GitHub collaboration workflows for the eIsland project, including pull requests, code reviews, issue management, and CI/CD. For local Git commands (branching, committing, rebasing), see [Local Git Operations](/developer/git-operations/local-operations.md).
:::

## Prerequisites

Before following this guide, ensure you have:

| Requirement | Description | Setup Guide |
|-------------|-------------|-------------|
| **GitHub account** | Active account with access to the eIsland organization | [github.com](https://github.com) |
| **Repository forked** | Your personal fork of the eIsland repository | [Frontend Setup — Fork](/developer/environment-setup/frontend-setup.md#fork-the-repository) |
| **SSH key or token** | Authentication for push/pull operations | [GitHub Docs — SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) |
| **Git configured locally** | Clone with `origin` (fork) and `upstream` (original) remotes | [Frontend Setup — Project Setup](/developer/environment-setup/frontend-setup.md#project-setup) |

:::warning
You **must** work through your fork (`origin`). You do not have direct push access to the main `JNTMTMTM/eIsland` repository. All contributions go through Pull Requests.
:::

## Fork Workflow Overview

The eIsland project uses a **fork-based workflow**. The typical contribution cycle is:

```text
1. Fork the repository (one-time)
2. Clone your fork and add upstream remote (one-time)
3. Sync your local dev with upstream
4. Create a feature branch from dev
5. Make changes and commit
6. Push to your fork (origin)
7. Open a Pull Request against upstream/dev
8. Code review and iterate
9. Merge (by maintainer)
```

:::details Fork vs. Branch Workflow
**Fork workflow** (used by eIsland):
- Each contributor has their own copy of the repository
- Contributors push to their own fork, then open PRs to the original
- Best for open-source projects with external contributors

**Branch workflow** (not used by eIsland):
- Contributors push branches directly to the shared repository
- Requires write access for all contributors
- Best for small, trusted teams

eIsland uses the fork workflow because it keeps the main repository clean and gives maintainers full control over what gets merged.
:::

## Keeping Your Fork in Sync

### Sync via Command Line

```bash
# Fetch the latest from upstream
git fetch upstream

# Switch to dev
git checkout dev

# Merge upstream changes into your local dev
git merge upstream/dev

# Push the updated dev to your fork
git push origin dev
```

:::tip
Do this before starting any new feature branch. It ensures your work is based on the latest code and reduces merge conflicts later.
:::

### Sync via GitHub UI

1. Visit your fork on GitHub: `https://github.com/your-username/eIsland`
2. Click **Sync fork** (if shown) or compare across forks
3. Click **Update branch** to pull upstream changes into your fork's `dev`

:::note
The GitHub UI sync is convenient but only updates the remote branch. You still need to `git pull origin dev` locally to get the changes on your machine.
:::

## Pull Requests

### Creating a Pull Request

#### Step 1: Prepare Your Branch

```bash
# Ensure dev is up to date
git checkout dev
git fetch upstream
git merge upstream/dev

# Create a feature branch
git checkout -b feat/your-feature-name

# Make your changes, commit following conventions
git add -A
git commit -m "feat: describe your change"

# Push to YOUR fork
git push origin feat/your-feature-name
```

:::important
Always push to `origin` (your fork), never to `upstream` (the main repository). You do not have push access to `upstream`.
:::

#### Step 2: Open the PR on GitHub

1. Visit your fork: `https://github.com/your-username/eIsland`
2. Click **Compare & pull request** (appears after pushing a new branch)
3. Configure the PR:

| Field | Value |
|-------|-------|
| **Base repository** | `JNTMTMTM/eIsland` |
| **Base branch** | `dev` |
| **Head repository** | `your-username/eIsland` |
| **Head branch** | `feat/your-feature-name` |

4. Fill in the PR title and description (see [PR Template](#pr-template) below)
5. Click **Create pull request**

:::warning
Double-check that the **base branch** is `dev`, not `main`. All feature PRs must target `dev`. The `main` branch is reserved for stable releases.
:::

#### Step 3: PR Template

Use this structure for your PR description:

```markdown
## Summary

Brief description of what this PR does and why.

## Changes

- List of specific changes made
- Each change on its own line
- Reference related issues with #issue-number

## Testing

- [ ] Tested locally with `npm run dev` / `mvnw spring-boot:run`
- [ ] All existing tests pass
- [ ] Added new tests for new functionality (if applicable)

## Screenshots (if applicable)

Before/after screenshots for UI changes.
```

:::tip
A well-written PR description speeds up code review. Reviewers should understand the "what" and "why" without reading every line of code.
:::

### Updating a Pull Request

If reviewers request changes, update your existing PR:

```bash
# Make the requested changes
git add -A
git commit -m "fix: address review comments"

# Push to the same branch
git push origin feat/your-feature-name
```

The PR automatically updates with the new commits.

:::info
You do not need to create a new PR for each round of changes. Pushing to the same branch updates the existing PR.
:::

### Rebasing a Pull Request

If your PR has conflicts with `dev` or you want a cleaner history:

```bash
# Fetch latest upstream
git fetch upstream

# Rebase your branch onto upstream/dev
git rebase upstream/dev

# Resolve any conflicts, then continue
git rebase --continue

# Force push to update the PR (with lease for safety)
git push --force-with-lease origin feat/your-feature-name
```

:::warning
`git push --force-with-lease` rewrites the remote branch history. Only use this on your own feature branches — never force-push to shared branches (`dev`, `main`).
:::

:::tip
Use `--force-with-lease` instead of `--force`. It checks that the remote branch matches your local tracking branch before pushing, preventing you from accidentally overwriting commits pushed by others.
:::

### Closing a Pull Request

If you want to abandon a PR:

1. Go to the PR page on GitHub
2. Scroll to the bottom
3. Click **Close pull request**

:::note
Closing a PR does not delete the branch. You can still delete the branch from your fork after closing:
```bash
git push origin --delete feat/your-feature-name
git branch -d feat/your-feature-name
```
:::

## Code Reviews

### Reviewing Pull Requests

When reviewing a PR, focus on these areas:

| Area | What to Look For |
|------|------------------|
| **Correctness** | Does the code do what the PR description says? Are edge cases handled? |
| **Style** | Does it follow project conventions? Is naming consistent? |
| **Performance** | Are there unnecessary re-renders, N+1 queries, or memory leaks? |
| **Security** | Are inputs validated? Are secrets exposed? Is authentication enforced? |
| **Tests** | Are new features covered by tests? Do existing tests still pass? |

:::tip
Start with the PR description to understand the intent. Then review the changes file by file. Leave comments on specific lines rather than general feedback — it is more actionable for the author.
:::

### Leaving Review Comments

On the GitHub PR page:

1. Click on a file in the **Files changed** tab
2. Click the **+** button next to the line you want to comment on
3. Write your comment and choose:

| Action | When to Use |
|--------|-------------|
| **Add single comment** | For questions or suggestions that do not block the PR |
| **Start a review** | For batched feedback — all comments are sent together |
| **Request changes** | When the PR has issues that must be fixed before merging |
| **Approve** | When the PR is ready to merge |

:::important
Use **Request changes** sparingly and only for genuine issues. Nitpicks and style suggestions should use **Add single comment** or be prefixed with `nit:` to signal they are non-blocking.
:::

### Handling Review Feedback

As a PR author, when you receive review feedback:

1. **Read all comments** before making changes — some may overlap or contradict
2. **Reply to comments** to clarify or acknowledge — do not just silently fix
3. **Push fixes** as new commits (do not force-push during review — it makes re-review harder)
4. **Mark conversations as resolved** after addressing the feedback

```bash
# After addressing feedback
git add -A
git commit -m "fix: address review — use const instead of let"
git push origin feat/your-feature-name
```

:::info
Once all requested changes are addressed and reviewers approve, the PR is eligible for merging. A maintainer will merge it or ask you to do so.
:::

## Merging Pull Requests

:::warning
Only maintainers can merge PRs into the main repository. If you are a contributor, a maintainer will merge your PR after approval. The information below is for understanding the process.
:::

### Merge Strategies

| Strategy | Command | Result | When to Use |
|----------|---------|--------|-------------|
| **Merge commit** | `git merge --no-ff` | Creates a merge commit preserving branch history | Default for feature branches — preserves the branch boundary |
| **Squash merge** | `git merge --squash` | Combines all PR commits into one commit on `dev` | Small PRs (1-3 commits) — keeps `dev` history clean |
| **Rebase merge** | `git rebase + merge` | Replays commits linearly without a merge commit | When you want a linear history without squash |

:::details Choosing a Merge Strategy
**Use merge commit (`--no-ff`)** when:
- The PR has meaningful intermediate commits you want to preserve
- The branch represents a cohesive feature with a clear history
- You want to be able to revert the entire feature with one `git revert`

**Use squash merge** when:
- The PR is small (1-3 commits) or has messy commit history
- You want `dev` to have one commit per feature
- The individual commits are not meaningful on their own

**Use rebase merge** when:
- You want a completely linear history
- Each commit in the PR is meaningful and self-contained
- You do not need the branch boundary marker
:::

### After Merging

Clean up the remote branch after merging:

```bash
# Delete the remote branch (GitHub usually does this automatically)
git push origin --delete feat/your-feature-name

# Prune local tracking references
git fetch upstream --prune
git remote prune origin
```

:::tip
GitHub shows a **Delete branch** button after a PR is merged. Click it to keep the fork clean. You can also enable auto-deletion in the repository settings under **Merge button → Automatically delete head branches**.
:::

## Issue Management

### Creating Issues

When creating an issue, use the appropriate template:

| Template | When to Use |
|----------|-------------|
| **Bug Report** | Something is broken or not working as expected |
| **Feature Request** | A new feature or enhancement idea |
| **Task** | Internal work items (refactoring, documentation, etc.) |

:::tip
Before creating a new issue, search existing issues to avoid duplicates. Use the search bar with keywords or filter by labels.
:::

### Issue Labels

| Label | Color | Meaning |
|-------|-------|---------|
| `bug` | Red | Confirmed defect |
| `feature` | Blue | New functionality |
| `enhancement` | Cyan | Improvement to existing functionality |
| `documentation` | Green | Documentation-related |
| `good first issue` | Purple | Suitable for new contributors |
| `help wanted` | Yellow | Extra attention needed |
| `priority: high` | Orange | Urgent — should be addressed soon |
| `priority: low` | Gray | Nice to have — not urgent |

:::note
Maintainers apply labels to issues. Contributors can reference issues in commits and PRs using `#issue-number` (e.g., `fix: resolve login crash (#42)`).
:::

### Linking Issues to Pull Requests

Reference issues in your PR description or commit messages:

```markdown
## Summary

Fixes #42 — Login crashes when token is expired
```

:::info
Using `Fixes #42`, `Closes #42`, or `Resolves #42` in the PR description automatically closes the issue when the PR is merged. Use `Related to #42` for partial fixes that should not close the issue.
:::

## GitHub Actions (CI/CD)

The eIsland project uses GitHub Actions for continuous integration. CI runs automatically on every pull request.

### CI Pipeline Overview

| Stage | Trigger | What It Does |
|-------|---------|--------------|
| **Lint** | Every PR and push | Runs ESLint, Stylelint, and HTML-validate checks |
| **Test** | Every PR and push | Runs the full test suite (`npm run test` / `mvnw test`) |
| **Build** | Every PR and push | Builds the project to verify compilation |
| **Package** | Tag push (`v*`) | Creates release artifacts |

:::warning
A PR cannot be merged if CI checks fail. Fix all failing checks before requesting review.
:::

### Viewing CI Results

1. Go to the PR page on GitHub
2. Click the **Checks** tab (or scroll to the bottom of the PR)
3. Click on individual check runs to see logs and details

:::tip
If a CI check fails, click **Details** next to the failed check to see the full log. Common failures include lint errors, test failures, and build errors — all of which should be fixable locally before pushing.
:::

### Running Checks Locally

Before pushing, run the same checks CI will run:

**Frontend:**

```bash
# Lint
npm run lint

# Test
npm run test

# Build
npm run build
```

**Backend:**

```bash
cd server

# Build and test
./mvnw clean verify
```

:::important
Always run tests locally before pushing. CI failures waste reviewer time and block the PR from merging. Treat CI as a safety net, not the primary quality gate.
:::

## GitHub CLI (`gh`)

The GitHub CLI provides a faster way to manage PRs and issues from the terminal.

### Installation

```bash
# Windows (using Scoop)
scoop install gh

# Or download from https://cli.github.com/
```

### Authentication

```bash
# Log in to GitHub
gh auth login

# Verify authentication
gh auth status
```

### Common Commands

#### Pull Requests

```bash
# List open PRs
gh pr list

# View a specific PR
gh pr view 42

# Create a PR from the current branch
gh pr create --title "feat: add animation" --body "Description here"

# Check out a PR locally for review
gh pr checkout 42

# Merge a PR (maintainer)
gh pr merge 42 --merge

# Close a PR
gh pr close 42
```

#### Issues

```bash
# List open issues
gh issue list

# View a specific issue
gh issue view 42

# Create a new issue
gh issue create --title "Bug: login crash" --body "Steps to reproduce..."

# Close an issue
gh issue close 42
```

#### Checks and Status

```bash
# View CI status for the current branch
gh run list

# View the latest workflow run
gh run view

# Watch a running workflow
gh run watch
```

:::tip
`gh pr create` opens an interactive prompt if you omit `--title` and `--body`. It auto-detects the base branch from your remote configuration, so you do not need to specify it manually.
:::

:::details Example — Full PR Workflow with `gh`
```bash
# 1. Create and switch to a feature branch
git checkout -b feat/new-feature

# 2. Make changes and commit
git add -A
git commit -m "feat: implement new feature"

# 3. Push to your fork
git push origin feat/new-feature

# 4. Create a PR interactively
gh pr create

# 5. View the PR
gh pr view

# 6. After review, merge (if you have permission)
gh pr merge --squash

# 7. Clean up
git checkout dev
git pull upstream dev
git branch -d feat/new-feature
```
:::

## Troubleshooting

### PR Shows Conflicts

If your PR shows "This branch has conflicts that must be resolved":

```bash
# Fetch latest upstream
git fetch upstream

# Rebase onto upstream/dev
git rebase upstream/dev

# Resolve conflicts in your editor, then:
git add <resolved-files>
git rebase --continue

# Force push to update the PR
git push --force-with-lease origin feat/your-feature-name
```

:::info
GitHub shows a **Resolve conflicts** button for simple conflicts. You can resolve them directly in the browser, but using the command line gives you more control and the ability to test after resolving.
:::

### CI Fails on PR

If a CI check fails:

1. Click **Details** next to the failed check
2. Read the error log
3. Fix the issue locally:

```bash
# Run the same check locally
npm run test    # or mvnw test
npm run lint    # or mvnw checkstyle:check

# Commit the fix
git add -A
git commit -m "fix: resolve CI failure — missing import"
git push origin feat/your-feature-name
```

:::tip
CI logs are public for all repository collaborators. If you cannot understand the failure, paste the relevant log snippet in the PR comments and ask for help.
:::

### Accidentally Pushed to Upstream

If you accidentally pushed a branch to `upstream`:

```bash
# Delete the branch from upstream (requires push access)
git push upstream --delete accidental-branch
```

:::danger
If you do not have push access to `upstream`, contact a maintainer immediately to delete the branch. Do not attempt to force-push or overwrite anything on `upstream`.
:::

### PR Not Showing on GitHub

If you pushed but do not see a PR prompt:

1. Visit `https://github.com/your-username/eIsland/pulls`
2. Click **New pull request**
3. Manually set the base repository to `JNTMTMTM/eIsland` and base branch to `dev`
4. Select your head branch

:::note
The **Compare & pull request** banner only appears when you push a branch that does not exist on the base repository. If the branch name already exists upstream, you may need to create the PR manually.
:::
