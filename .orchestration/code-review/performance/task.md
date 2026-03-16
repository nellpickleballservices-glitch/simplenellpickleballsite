# Worker Task: performance

- Session: `code-review`
- Repo root: `/Users/joseurizar/Desktop/nell_pickleball_club`
- Worktree: `/Users/joseurizar/Desktop/nell_pickleball_club-code-review-performance`
- Branch: `orchestrator-code-review-performance`
- Launcher status file: `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/performance/status.md`
- Launcher handoff file: `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/performance/handoff.md`

## Objective
You are a performance reviewer. Review ALL changed files in the nell_pickleball_club project for performance issues. Focus on:
- Database queries in lib/queries/ (N+1 queries, missing indexes, unoptimized joins)
- Server actions doing unnecessary work or redundant fetches
- React component re-renders, missing memoization in components/
- Large bundle imports or unnecessary dependencies in package.json
- Supabase query patterns and RLS policy performance

Run: git diff HEAD to see all changes.
Write your findings to PERFORMANCE-REVIEW.md in the repo root. Use severity levels: CRITICAL, HIGH, MEDIUM, LOW, INFO.

## Completion
Do not spawn subagents or external agents for this task.
Report results in your final response.
The worker launcher captures your response in `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/performance/handoff.md` automatically.
The worker launcher updates `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/performance/status.md` automatically.
