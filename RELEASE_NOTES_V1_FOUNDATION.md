# PULSE by REYLEX — v1.0 Foundation Build 1

**Status: deployable development baseline, NOT commercial release certification.**

Built from the user-confirmed exact Cloudflare deployment source `v0.6(2).zip`.

## Included in this build
- Updated product identity to **PULSE by REYLEX** on login and sidebar.
- New custom SVG browser favicon with PULSE waveform mark.
- Replaced inline Create button handlers with delegated click handling, preserving functionality across page rerenders. Open errors are now surfaced in a toast and browser console.
- Added Setup Guide accessible from the top bar. Its steps use actual account, facility, asset, PM, and work-order records; includes working create facility flow, and direct links into the existing create forms.
- Setup progress for review-only steps is stored in this browser for this company. Site/assets/PM/WO steps are based on server data, not fake completion.
- Added site selection to asset creation and clearer save errors.
- Existing D1 binding, API routes, scheduler, and migrations retained unchanged.

## Deployment
1. Back up your production D1 database and keep a copy of your previous GitHub commit.
2. Replace the repository files with this ZIP's root files (do not nest the folder).
3. Commit and let Cloudflare Workers deploy, then hard-refresh the browser.
4. Confirm the browser tab shows the PULSE waveform icon and the login/sidebar say PULSE by REYLEX.
5. Sign in as admin, click **Setup Guide**, and walk through facility, asset, PM, and WO creation.
6. Test Create Work Order, Create PM Schedule, and Create Asset from their respective pages. Test saving and reload to verify records persist.

## Important limitations
- Frontend syntax and ZIP structure are checked, but live Cloudflare/D1 integration tests are not available here. A passing syntax check does not certify all flows.
- Existing D1 schema problems from prior versions may still cause backend saves to fail. Save failures now surface messages; fix the exact error before relying on the feature.
- This build does not implement the entire agreed v1.0 commercial feature scope (inventory, inspections, advanced planner, billing, security hardening, etc.). Those are subsequent increments to this same v1.0 foundation.
- Setup Guide does not yet invite users, import assets, or automate subscription setup. Those require additional backend/UI work.
