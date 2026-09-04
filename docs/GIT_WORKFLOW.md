# Team 344 Hackathon Git Workflow

A simple, low-friction Git strategy for 3 developers working on a 24-hour project.

---

## 🚀 Recommended Branching Model

- `main`: Always contains working, deployable code.
- Feature branches named by developer:
  - `dev-auth`
  - `dev-backend-api`
  - `dev-ui-pages`

---

## 🔄 Daily Hackathon Cycle

### 1. Start of Feature
```bash
git checkout main
git pull origin main
git checkout -b dev-my-feature
```

### 2. Commit Frequently with Clear Messages
```bash
git add .
git commit -m "feat: add task creation endpoint"
```

### 3. Sync Before Pushing
```bash
git checkout main
git pull origin main
git checkout dev-my-feature
git rebase main # or git merge main
git push origin dev-my-feature
```

### 4. Code Review Rule for 24h
- Keep PRs small (< 150 lines).
- Require 1 quick approval from a teammate before merging into `main`.
