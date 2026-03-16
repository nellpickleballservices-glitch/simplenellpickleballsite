# Worker Task: quality

- Session: `code-review`
- Repo root: `/Users/joseurizar/Desktop/nell_pickleball_club`
- Worktree: `/Users/joseurizar/Desktop/nell_pickleball_club-code-review-quality`
- Branch: `orchestrator-code-review-quality`
- Launcher status file: `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/quality/status.md`
- Launcher handoff file: `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/quality/handoff.md`

## Objective
You are a code quality and test coverage reviewer. Review ALL changed files in the nell_pickleball_club project for quality issues. Focus on:
- Missing error handling in server actions (app/actions/)
- Type safety issues in lib/types/
- i18n completeness (compare messages/en.json vs messages/es.json)
- Missing test coverage for new features (locations, courts, reservations)
- Code duplication across admin pages
- Accessibility issues in components

Run: git diff HEAD to see all changes.
Write your findings to QUALITY-REVIEW.md in the repo root. Use severity levels: CRITICAL, HIGH, MEDIUM, LOW, INFO.

## Completion
Do not spawn subagents or external agents for this task.
Report results in your final response.
The worker launcher captures your response in `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/quality/handoff.md` automatically.
The worker launcher updates `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/quality/status.md` automatically.
