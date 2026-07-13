# AI Agent Guidelines for SnapPost Pro

These guidelines prevent repeated mistakes and ensure efficient task completion.

## Rule 1: Verify Before Asking

**When a user says "do you have X?" or "did we already do X?":**

1. **IMMEDIATELY** check the codebase for the file/feature
2. **NEVER** ask clarifying questions first
3. Report back with: "Yes, it exists at [path]" or "No, it doesn't exist"

**Anti-pattern (WRONG):**
```
User: "do you have the privacy policy?"
AI: "Let me check..." → asks question → searches → discovers it exists
Result: 3 wasted responses
```

**Correct pattern:**
```
User: "do you have the privacy policy?"
AI: [immediately searches] → "Yes, it's at /client/src/pages/Privacy.tsx, live at snappostpro.com/privacy"
Result: 1 response, done
```

**Implementation:**
- Use `shell` with `find` or `grep` to search project files
- Use `file` with `read` to verify content
- Complete verification BEFORE responding to user

---

## Rule 2: Track Completed Work in todo.md

**When a feature is completed:**

1. Mark it as `[x]` in todo.md immediately
2. Add a brief description of what was done
3. Include file paths if relevant

**Why:** Prevents "did we already do this?" questions by having a single source of truth.

**Format:**
```markdown
- [x] Feature name
  - Brief description of what was implemented
  - Key files: /path/to/file1, /path/to/file2
```

---

## Rule 3: Never Repeat "I'll Create X" Without Checking First

**When user says "we did this twice already":**

1. Immediately search for the artifact
2. If it exists: report location and status
3. If it doesn't exist: create it immediately with no further questions

**Anti-pattern (WRONG):**
```
User: "we've done the privacy policy twice, do you have it?"
AI: "I'll create it now" → discovers it exists → wastes time
```

**Correct pattern:**
```
User: "we've done the privacy policy twice, do you have it?"
AI: [searches] → "Yes, at /client/src/pages/Privacy.tsx, deployed to snappostpro.com/privacy"
```

---

## Rule 4: Maintain a "Done" Checklist

**Critical features that have been completed (do not recreate):**

- [x] Privacy Policy — `/client/src/pages/Privacy.tsx`, live at snappostpro.com/privacy
- [x] Error alerting for cron jobs — email alerts to admin@snappostpro.com
- [x] Onboarding checklist — dashboard widget with progress tracking
- [x] Contextual prompts — "Connect Facebook" blue prompt on upload card
- [x] Feature unlock incentives — FeatureUnlock widget showing locked premium features
- [x] Email reminders — 24h and 48h onboarding reminders via Heartbeat cron jobs
- [x] Conversion tracking — conversion_events table logs signup → upgrade funnel
- [x] Success dashboard — SuccessDashboard component shows metrics and premium features

**If user asks about any of these, verify they exist before proposing recreation.**

---

## Rule 5: Check Project Structure Before Proposing Solutions

**Before suggesting a new file or feature:**

1. Search for existing implementations
2. Check if it's already in todo.md (completed or in progress)
3. Check if it's deployed to production
4. Only then propose new work

**Commands to use:**
```bash
# Search for files
find /home/ubuntu/snappost-pro -name "*keyword*" -type f

# Search for code patterns
grep -r "pattern" /home/ubuntu/snappost-pro/client /home/ubuntu/snappost-pro/server

# Check if route exists
grep -r "privacy\|terms\|policy" /home/ubuntu/snappost-pro/client/src/App.tsx
```

---

## Rule 6: Respond in One Message When Possible

**Avoid multi-message back-and-forth:**

- ❌ "Let me check" → [wait] → "I found it" → [wait] → "Here's the path"
- ✅ [check immediately] → "Found it at [path], deployed to [URL]"

**Use this pattern:**
1. Gather all information needed
2. Respond once with complete answer
3. No follow-up questions unless absolutely necessary

---

## Rule 7: Document Decisions in todo.md

**When making a decision about architecture or approach:**

Add a note to todo.md explaining:
- What was decided
- Why it was decided
- Alternative approaches considered

**Example:**
```markdown
## Decision: Focus on contractors with existing Facebook pages

- Decided to NOT build Facebook page creation wizard
- Reason: Liability and ownership issues (contractors must own their pages)
- Alternative: Build wizard later if >20% drop-off at Facebook connection step
- Status: Will revisit post-acquisition
```

---

## Rule 8: Verify Deployment Status

**After making changes:**

1. Confirm code is committed to GitHub
2. Confirm Railway auto-deployed
3. Confirm feature is live at production URL
4. Report status to user

**Never say "should be live" — verify it IS live.**

---

## Rule 9: Meta App Review Checklist

**Before submitting to Meta, verify:**

- [x] Privacy policy exists and is accessible at snappostpro.com/privacy
- [ ] Business verification status: In review (check daily)
- [ ] Screencast recorded: 2-3 min showing full flow
- [ ] Screencast uploaded to YouTube (unlisted)
- [ ] App review submission form filled out with:
  - Use case description
  - Screencast URL
  - Privacy policy URL
  - Permissions requested: pages_manage_posts, pages_read_engagement, pages_show_list

---

## Rule 10: When User Says "For Fuck's Sake"

**This means:**
- I made the same mistake multiple times
- I broke a guideline I said I'd follow
- User is frustrated and needs immediate action, not explanations

**Response:**
1. Acknowledge the mistake
2. Take immediate action (don't ask questions)
3. Fix the root cause (update guidelines, add to todo.md, etc.)
4. Report back when done

**Never:**
- Ask for clarification
- Propose alternatives
- Explain why it happened
- Make excuses

---

## Enforcement

**These guidelines are binding.** If I violate them:
1. User will point it out
2. I will immediately acknowledge and fix
3. I will update this document to prevent recurrence

**Last updated:** July 8, 2026
