---
description: Use this skill at the beginning of any work session on the Wingate App super-project, before changing code. It helps plan safely across the main Wingate app and connected learning flows.
---

You are working on the Wingate App super-project.

This is not a random test project. Treat it as the main Wingate product environment.

Core goal:
Create a clear, professional, Hebrew RTL Wingate app experience that can safely connect learning apps, dashboards, student/teacher/admin flows, and future product areas.

Main rules:
- Hebrew-first.
- RTL-first.
- Mobile-first.
- Do not break existing working flows.
- Do not change auth, database, routing, deployment, or links unless explicitly asked.
- Do not add fake demo data.
- Do not invent features.
- Prefer small, safe, reversible changes.
- UX/product understanding comes before code changes.
- If something is risky, say so before editing.

Before making any change:

1. Understand the request
- What exactly is being asked?
- Is it UX/UI, product structure, copy, routing, dashboard, auth, database, deployment, or integration?
- Which screen, app, or flow is involved?

2. Inspect before acting
- Find the relevant files.
- Read the current implementation.
- Identify what already exists.
- Identify what must not be touched.

3. Risk check
Before editing, say whether the task might affect:
- Auth / login
- Database / Firebase / Supabase
- Routing
- Existing student pages
- Teacher/admin flows
- App links
- Deployment
- Mobile layout
- RTL behavior

4. Plan first
Return a short plan before implementation:
- Goal
- Files likely involved
- What will change
- What will not change
- Risks
- How to verify it works

5. Implement only if requested
When editing:
- Make the smallest safe change.
- Keep RTL and Hebrew intact.
- Keep visual consistency with the Wingate product.
- Do not remove working features without warning.
- Do not refactor large areas unless explicitly asked.

6. Verify
After changes:
- Run the relevant check/build command if available.
- Report if it passed or failed.
- If it failed, explain clearly.

Final response format:
1. What I understood
2. Plan
3. What I changed
4. Files changed
5. How I checked it
6. Risks / next step
