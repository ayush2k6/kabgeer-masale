# KABGEER JI — AI DEVELOPMENT RULES

## 1. Project identity

Project:
Kabgeer Ji

Current stack:
- React
- Vite
- JavaScript/JSX
- Firebase
- React Router
- Existing frontend/UX

Do not assume a different framework or rewrite the project into Angular, Next.js, etc.

## 2. Golden rule

Before changing ANYTHING:

1. Inspect the existing implementation.
2. Understand how the relevant feature currently works.
3. Check PROJECT_STATUS.md.
4. Check CHANGELOG.md.
5. Check whether the requested change conflicts with an existing decision.
6. Identify dependencies with other features.
7. Only then make changes.

Never blindly rewrite existing functionality.

## 3. Preserve existing work

The existing frontend and UX are already substantially developed.

DO NOT redesign or rewrite existing working UI unless explicitly instructed.

Do not:
- change brand identity
- change colors
- change layouts
- replace components unnecessarily
- replace libraries unnecessarily
- rewrite working features
- remove functionality just because another implementation is preferred

Reuse existing code wherever practical.

## 4. One task at a time

Only work on the task explicitly requested.

Do NOT independently add:
- admin dashboards
- new pages
- tracking pages
- new libraries
- new architecture
- unrelated refactors
- "improvements" outside the requested task

If you discover another issue, document it in PROJECT_STATUS.md under "Discovered Issues" instead of silently fixing it.

## 5. Dependency protection

Before modifying a component, determine:

- What imports it?
- What does it import?
- What routes use it?
- What contexts/services depend on it?
- Does checkout/cart/auth/order functionality depend on it?

Do not break existing functionality while implementing a new feature.

## 6. Architecture protection

The planned V1 architecture is:

React + Vite
        ↓
Firebase
        ↓
Secure server-side/backend functionality
        ├── Razorpay
        ├── Resend
        ├── Google Sheets
        └── Shiprocket
                ↓
             Trackon

The owner workflow is intended to use Google Sheets rather than building a full admin dashboard.

Do not introduce a different architecture without explicit approval.

## 7. Security rules

NEVER expose secrets.

Never place private credentials in:
- React components
- client-side JavaScript
- public files
- Git commits

Private credentials include:
- Razorpay secret
- Shiprocket credentials
- Resend API key
- Google service credentials
- Firebase Admin credentials
- any private API token

Use environment variables and appropriate server-side execution.

Never print secret values in responses, logs, documentation, or commits.

## 8. Payment rules

Razorpay payment must eventually use:

Customer
→ backend
→ Razorpay order
→ Razorpay checkout
→ payment
→ server-side verification
→ Firebase order

Never trust the client to determine:
- final payment amount
- payment success
- payment status
- order authenticity

Do not consider a payment complete merely because the frontend callback says it succeeded.

## 9. Order rules

Orders must have a reliable unique order ID.

Order creation must prevent:
- duplicate orders
- duplicate payment processing
- inconsistent totals

Order data should be stored in a proper top-level orders structure.

## 10. Shipping rules

Shiprocket is the shipping integration.

Trackon should be treated as a courier handled through Shiprocket.

Do not create a direct Trackon integration unless explicitly requested.

The planned workflow is:

Owner
→ Ready to Ship
→ Shiprocket
→ Courier/AWB
→ Tracking
→ Webhook
→ Firebase
→ Google Sheets

## 11. Testing rules

After every meaningful change:

1. Run the relevant checks.
2. Run the application.
3. Test the affected feature.
4. Check that previously working features still work.
5. Check console/build errors.
6. Only then mark the task complete.

Never mark a task complete simply because the code was written.

## 12. Change safety

Before modifying important architecture:

Explain:
- what will change
- why it is necessary
- what files will change
- what existing functionality may be affected
- how it will be tested

For large architectural changes, wait for explicit approval before implementation.

## 13. File modification discipline

Modify the minimum number of files necessary.

Do not perform broad automated rewrites.

Do not overwrite working code unnecessarily.

## 14. Documentation discipline

After every completed task:

Update:
- PROJECT_STATUS.md
- CHANGELOG.md

The update must describe:
- what was changed
- files changed
- why it was changed
- tests performed
- result
- any remaining issue

## 15. Conflict detection

Before marking a task complete, compare the implementation against:

- AGENTS.md
- PROJECT_STATUS.md
- CHANGELOG.md
- existing code
- previous completed tasks

Explicitly check that the new implementation does not break or contradict previous work.

## 16. If uncertain

DO NOT guess.

If a requirement is ambiguous or conflicts with previous decisions:

STOP and ask for clarification.
