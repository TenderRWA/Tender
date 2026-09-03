# TENDER Dual-Repository Synchronization Guide

This document outlines the workflow and architecture for synchronizing the TENDER codebase between the **Private Production Repo** (`notadeveloper7/tender`) and the **Public Open-Source Repo** (`tenderRWA/tender`).

---

## 1. Architecture Overview

| Property | Private / Production Repo | Public Open-Source Repo |
| :--- | :--- | :--- |
| **GitHub URI** | `notadeveloper7/tender` | `tenderRWA/tender` |
| **Git Remote** | `origin` | `origin-public` |
| **Branch** | `master` | `master` |
| **Author Name** | `notadeveloper7` | `TenderRWA` |
| **Author Email** | `notadeveloper7@outlook.com` | `tenderrwa@outlook.com` |
| **Purpose** | Production Deployments, CI/CD | Public GitHub, Community, Open-Source |

---

## 2. Fast Commands

From the project root:

### A. Push to Production Only
Pushes your local `master` branch directly to the private repo (`notadeveloper7/tender`):
```bash
bun run push:origin
# or: git push origin master
```

### B. Push to Public Open-Source Repo Only
Automatically rewrites all commit authors and committers to `TenderRWA <tenderrwa@outlook.com>` and force-pushes to `origin-public/master`:
```bash
bun run push:public
```

### C. Push to Both Repos Simultaneously
Pushes to production first, then triggers the public author-sanitizing sync:
```bash
bun run push:all
```

---

## 3. How the Public Sync Engine Works

The sync script is located at [`scripts/sync-public.py`](file:///home/skipp/Documents/gigs/tender/scripts/sync-public.py).

### Under the Hood:
1. **`git fast-export master`**: Streams the entire commit tree, preserves exact commit timestamps, commit messages, and tree hashes.
2. **Byte-Exact Stream Rewriter**:
   - Replaces `author ...` with `author TenderRWA <tenderrwa@outlook.com> <timestamp> <tz>`
   - Replaces `committer ...` with `committer TenderRWA <tenderrwa@outlook.com> <timestamp> <tz>`
   - Preserves all binary blobs (images, fonts, WASM, icons) without character corruption.
   - Redirects target ref from `refs/heads/master` to `refs/heads/public-master`.
3. **`git fast-import`**: Generates a clean local branch `public-master`.
4. **`git push origin-public public-master:master --force`**: Publishes the clean history to the public repo.
5. **Zero Disruption to Production**: Your local `master` branch and `origin/master` remain 100% intact with original commit hashes so deployments are never broken.

---

## 4. Verifying Remotes & Credentials

To check your remote URLs:
```bash
git remote -v
```

Expected output:
```text
origin          https://ghp_...github.com/notadeveloper7/tender.git (fetch)
origin          https://ghp_...github.com/notadeveloper7/tender.git (push)
origin-public   https://ghp_...github.com/tenderRWA/tender.git (fetch)
origin-public   https://ghp_...github.com/tenderRWA/tender.git (push)
```

To verify commit authorship on the public branch:
```bash
git log -n 5 --format="%h %an <%ae> %s" public-master
```

---

## 5. Security & Sensitive Files Policy

The following paths are explicitly untracked and excluded from git via `.gitignore`:
- `.env` / `backend/.env` (secrets, private keys, API credentials)
- `technical-docs/` (internal product specifications and notes)
- `X_DEVELOPER_USE_CASE.txt`
