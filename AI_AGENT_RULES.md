# AI Agent Rules for SnapPost Pro

**READ THIS FIRST IN EVERY SESSION**

These rules ensure consistent, informed responses and prevent repeated mistakes.

---

## Rule 1: Verify Deployment Context FIRST

**Before responding to ANY request about SnapPost Pro:**

1. Confirm: SnapPost Pro is deployed on **Railway** (never Manus)
2. Confirm: Source code is on **GitHub** (aiprof364-maker/snappost-pro)
3. Confirm: Connected via **OAuth App** (not personal access tokens)
4. Confirm: Auto-deploys on push to `main` branch

**Never ask "where is it deployed?" — it's always Railway.**

---

## Rule 2: Read Documentation BEFORE Responding

**In this order:**

1. `SETUP_GUIDE.md` — Deployment method and configuration
2. `todo.md` — Current status and completed items
3. `META_*.md` files — For Meta/Facebook work
4. `references/periodic-updates.md` — For scheduled jobs
5. Any other relevant `.md` files in the project

**Do not guess or assume. Read the files first.**

---

## Rule 3: Never Suggest Manus Changes

- SnapPost Pro is **permanently on Railway**
- We will **never return to Manus**
- Manus is only for development/testing in future projects
- Do not suggest "publishing to Manus" or "deploying via Manus"

---

## Rule 4: Understand the Architecture

**Current setup:**

- **Code repository:** GitHub (aiprof364-maker/snappost-pro)
- **Deployment:** Railway
- **Authentication:** GitHub OAuth App (not personal tokens)
- **Auto-deployment:** Enabled on push to main
- **Domain:** snappostpro.com (live)
- **Business email:** admin@snappostpro.com (Zoho)
- **Meta verification:** In progress

---

## Rule 5: Security — I Cannot Access External Services

**I can only:**
- Read files in the sandbox
- Write code
- Execute shell commands
- Provide step-by-step guidance

**I cannot:**
- Log into GitHub, Railway, Zoho, Meta, Stripe, etc.
- Access your credentials or dashboards
- Make changes to external services

**You execute all external steps. I guide you.**

---

## Rule 6: Context Persistence

- Each session is a continuation of previous work
- Read the inherited context summary at the start
- Read the actual project files to understand current state
- Don't treat each session as a fresh start

---

## Rule 7: Respond with Informed Answers

**Always:**
- Reference specific files/sections
- Explain why you're recommending something
- Show you've read the context
- Provide clear next steps

**Never:**
- Ask questions you could answer by reading files
- Make assumptions about the current state
- Suggest changes without understanding the architecture
- Waste the user's time with clarifications

---

## Rule 7a: Verify Facts from Screenshots Before Recommending

**When the user shows a screenshot:**
- Read EXACTLY what's visible in the screenshot
- Do NOT assume or extrapolate beyond what's shown
- Do NOT suggest removing/changing things that aren't visible
- Do NOT make recommendations based on what you think should be there

**Example of mistake:**
- Screenshot shows only: admin@snappostpro.com
- I suggested: "Remove aiprof364@gmail.com"
- Reality: aiprof364@gmail.com doesn't exist in the screenshot
- **This is wrong. Never suggest removing what you can't see.**

**Correct approach:**
- Screenshot shows: admin@snappostpro.com only
- I should say: "Only admin@snappostpro.com is listed. No other emails to remove."
- Never assume hidden items exist

---

## Rule 8: For Meta Business Verification

**Current status:**
- NZBN updated with trading name "Airprof Studios"
- admin@snappostpro.com added as secondary email on NZBN
- Business verification submitted to Meta (in review)
- Waiting for Meta approval (24-48 hours)

**Next steps when approved:**
- Confirm verification status in Meta Business Settings
- Set admin@snappostpro.com as primary admin
- Remove aiprof364@gmail.com (if needed)

---

## Rule 9: For GitHub Token Management

**Current status:**
- "Railway Deploy" token is **not being used** by Railway
- Railway uses **OAuth App** for GitHub connection
- Token expires on Sun, Jul 12 2026 (never used)

**Action:**
- Delete the unused token (no impact on Railway)
- Railway will continue working via OAuth

---

## Checklist Before Every Response

- [ ] Confirmed deployment is Railway
- [ ] Read relevant documentation files
- [ ] Understood current project state
- [ ] Verified I'm not making assumptions
- [ ] Ready to provide informed answer

**If any checkbox fails, read more files before responding.**

---

## Contact & Escalation

If the AI agent breaks these rules:
1. Point out the specific rule violated
2. Reference this file
3. The agent will acknowledge and correct course

**These rules are non-negotiable.**
