---
name: browser-verification
description: Inspect rendered Vue UI and critical browser flows when code checks are insufficient.
---
# Browser Verification

Use for meaningful UI, responsive layouts, critical forms, authentication, payment/reservation flows, or interaction regressions.

- Run app using repository commands; inspect real rendered state, not source alone.
- Verify applicable desktop/mobile layout, hierarchy, spacing, typography, overflow, focus, keyboard operation, loading/empty/error/success states, and critical interaction.
- Capture evidence required by task. Do not claim inspection if browser capability or runnable app is unavailable.
- Report NOT RUN with reason; required visual gate remains incomplete unless human explicitly resolves it.
