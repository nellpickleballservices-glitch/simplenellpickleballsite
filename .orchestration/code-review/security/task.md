# Worker Task: security

- Session: `code-review`
- Repo root: `/Users/joseurizar/Desktop/nell_pickleball_club`
- Worktree: `/Users/joseurizar/Desktop/nell_pickleball_club-code-review-security`
- Branch: `orchestrator-code-review-security`
- Launcher status file: `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/security/status.md`
- Launcher handoff file: `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/security/handoff.md`

## Objective
You are a security reviewer. Review ALL changed files in the nell_pickleball_club project for security vulnerabilities. Focus on:
- Server actions in app/actions/ (SQL injection, auth bypass, input validation)
- Authentication flows in app/[locale]/(auth)/
- Admin endpoints (privilege escalation, missing auth checks)
- Any hardcoded secrets or credentials
- OWASP Top 10 vulnerabilities

Run: git diff HEAD to see all changes.
Write your findings to SECURITY-REVIEW.md in the repo root. Use severity levels: CRITICAL, HIGH, MEDIUM, LOW, INFO.

## Completion
Do not spawn subagents or external agents for this task.
Report results in your final response.
The worker launcher captures your response in `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/security/handoff.md` automatically.
The worker launcher updates `/Users/joseurizar/Desktop/nell_pickleball_club/.orchestration/code-review/security/status.md` automatically.
