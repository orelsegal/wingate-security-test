# Wingate App — Claude Project Instructions

## Project identity

This is the main Wingate App super-project.

Treat this as a real product environment, not a demo or random experiment.

The product is a Hebrew RTL Wingate learning/app environment that may include:
- Student-facing flows
- Teacher/admin dashboards
- Learning apps
- App launcher / hub-like areas
- External learning tools
- Future integrations

The goal is to create a clear, professional, trustworthy Wingate product experience.

## Core principles

Always follow these principles:

- Hebrew-first
- RTL-first
- Mobile-first
- Clear product thinking before code
- UX before implementation
- Small safe changes over large risky refactors
- Preserve working functionality
- Do not invent features
- Do not add fake demo data
- Do not make unfinished features look active
- Do not hide failures
- Do not claim something works unless it was checked

## Protected areas

Never change these unless explicitly requested and explained first:

- Auth / login / sessions
- Database logic, schemas, rules, migrations
- Firebase / Supabase configuration
- Routing and redirects
- Deployment configuration
- Environment variables
- Permissions / role logic
- Existing live app links
- Existing student / teacher / admin flows
- Data saving or loading behavior
- Security, privacy, or user-data behavior

If a requested task touches one of these areas:
1. Stop before editing.
2. Explain the risk.
3. Propose a safe plan.
4. Ask for confirmation before implementation.

## Default workflow

Before editing code:

1. Understand the request
- What is being asked?
- Which screen, flow, component, or app is involved?
- Is this UX/UI, copy, routing, data, auth, deployment, integration, or bug fixing?

2. Inspect first
- Find the relevant files.
- Read the existing implementation.
- Identify what already works.
- Identify what must not be touched.

3. Plan before changing
Return a short plan:
- Goal
- Files likely involved
- What will change
- What will not change
- Risk level
- How to verify

4. Implement safely
- Make the smallest safe change.
- Do not refactor unrelated code.
- Do not rename files/components unless necessary.
- Do not remove working features without warning.
- Preserve RTL and mobile behavior.
- Keep the existing design system unless asked otherwise.

5. Verify
- Run the relevant check/build/test command if available.
- If no command exists, say so.
- Report the exact result.
- If something fails, explain clearly.

## UX/UI rules

The Wingate App should feel:
- Professional
- Clean
- Premium
- Athletic but not childish
- Educational but not boring
- Israeli, practical, and trustworthy

Design priorities:
- Hebrew text should be natural, short, and clear.
- RTL alignment must be correct.
- Mobile layout is the priority.
- One clear primary action per screen.
- Cards, buttons, navigation, spacing, and typography should feel consistent.
- Avoid clutter.
- Avoid random gradients.
- Avoid huge cropped images or uncontrolled zoom.
- Avoid fake dashboard visuals.
- Avoid duplicate navigation systems.
- Disabled or coming-soon features should not look clickable.

Preferred visual direction:
- Calm navy / deep blue
- Emerald / green accents
- White and soft neutral backgrounds
- Strong readability
- Subtle sports / movement / excellence motifs only when helpful

## App integration rules

When connecting apps, dashboards, routes, links, or tools:

- Do not break existing links.
- Do not change routes unless explicitly requested.
- Do not remove working app entries without warning.
- Do not show unfinished apps as active.
- Clearly distinguish:
  - פעיל
  - בקרוב
  - בפיתוח
  - לא זמין כרגע
- External links should feel intentional.
- Avoid duplicate menus or competing dashboards.
- The user should always understand where they are and what clicking will do.

## Copywriting rules

Default language is Hebrew unless asked otherwise.

Hebrew copy should be:
- Short
- Clear
- Natural
- Not robotic
- Not too formal
- Not childish
- Suitable for students, teachers, admins, and Wingate stakeholders

Avoid:
- Long explanations on buttons
- Fake marketing hype
- Overpromising
- Confusing technical terms in the UI

## Communication with the user

The user prefers step-by-step guidance.

When explaining:
- Be practical.
- Keep instructions clear.
- Do not overload with options.
- Say exactly what to do next.
- When something is risky, explain it simply.
- When work is done, summarize clearly.

For stakeholder/team summaries:
- Write in Hebrew.
- Be concise and professional.
- Separate:
  - בוצע
  - פתוח
  - סיכון
  - נדרש מהצוות
  - שלב הבא

## Final response format after work

After any meaningful task, respond with:

1. What I understood
2. What I changed
3. Files changed
4. How I verified it
5. Risks / next step
