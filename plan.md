# Plan: Convert Create Proposal Page to Modal

## Summary
The standalone `/voting/create` page is an old flow. There's already a `SubmitProposalModal` used on the `/voting` page that does the same thing. We'll upgrade the modal to be more sophisticated (incorporating the best parts of the page), wire it into the HomeDashboard CTA, and delete the old page.

## Key Finding
The `SubmitProposalModal` already exists and works on `/voting`. The create page has a few features the modal lacks:
- **ProposalSuccessModal** (styled success feedback) — the modal currently uses `alert()`
- More robust blockchain error handling (validates proposalId, txHash before proceeding)
- Better error message for JSON parse failures

The modal has one thing the page lacks:
- Playful amount messages ("wow big spender", etc.)

Web3/wagmi providers are available globally (via `ConditionalWeb3Provider` in layout), so the modal will work on any page.

## Steps

### 1. Upgrade `SubmitProposalModal` with ProposalSuccessModal
**File:** `components/voting/SubmitProposalModal.tsx`
- Add `ProposalSuccessModal` import and state (`successModal` with `txHash`, `proposalId`)
- Replace the `alert(message)` success handler with `setSuccessModal({ isOpen: true, txHash, proposalId })`
- Add the robust blockchain validation from the create page (validate proposalId > 0, txHash starts with 0x)
- Add JSON parse error handling from the create page
- Render `ProposalSuccessModal` alongside the modal, with a "View All Proposals" link
- On success modal close, also call `onSuccess` callback

### 2. Update HomeDashboard CTA to open modal
**File:** `components/home-dashboard/HomeDashboard.tsx`
- Change `ScannerCTA` from using `<a href="/voting/create">` to a `<button>` with `onClick`
- Lift modal open state into `HomeDashboard` component
- Import and render `SubmitProposalModal` inside `HomeDashboard`

### 3. Delete the old create proposal page
**Files to delete:**
- `app/voting/create/page.tsx`
- `app/voting/create/page.module.css`

### 4. Update any remaining references
- `ELIZA_SETUP_GUIDE.md` mentions `/voting/create` — update reference

### 5. Build verification
- Run `npx next build --no-lint` to confirm everything compiles
