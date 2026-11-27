# Sign-up and sign-in: screen design review record

Item: AI4DEV-279 (sign-in screen design). Requirement: REQ-001.
Canvas: https://claude.ai/artifact/5coFbSEm9JzWJMiqM3mA5Y

## How this run was led

The founder delegated the run on 2026-11-27 by choosing the decision card option "Three stages, design delegated" ("I add Screen design and Screen build items for sign-in, keep AI4DEV-61 as wiring, and run the design with Codex personas without you, as with intake."). The lead makes each design call below and marks it a lead call. The founder reviews the calls on the pull request.

## Boards

Phone (390 × 844) and desktop (1280 × 900), one board each for: create an account (the whole flow), check your email, finish sign-up as an NGO, finish sign-up as a volunteer (link GitHub), sign in, reset password. `Main.dc.html` holds the flow; the other boards start it at a later step (props `device`, `start`).

## Lead calls

1. **Account type first.** Sign-up starts with "I am signing up as: A nonprofit (NGO) / A volunteer developer". Platform admin is never offered (AT-001.07). Google is offered to both types; GitHub sign-up only to volunteers.
2. **One finish step for an NGO, matching the existing complete-signup function.** After email confirmation (or Google), the NGO gives the organisation name, the signer's full name, role, an "authorised to act" tick, and agrees to the Terms and the Platform Promise (AT-001.01, AT-001.19, AT-001.20, d9 acknowledgment cadence). The rest of the organisation profile is the next screen, designed in the "Create organization and home" thread, which receives the name prefilled. Agreed with that thread on 2026-11-27.
3. **Volunteers must link GitHub to finish** (AT-001.04). The screen states what is read (public profile only), that it shows on the profile, and that the link is permanent (AT-001.41). Signing up with GitHub links it at once.
4. **Sign-in needs a confirmed email.** The first canvas let an unconfirmed email sign in and blocked only Discovery messages (AT-001.10). Round 1 showed that the local config has `enable_confirmations = true`, which refuses that sign-in, so the check-your-email page now says to confirm first. AT-001.10 stays as a backend rule.
5. **Password at least 8 characters.** The local config allows 6 today; screen wiring raises `minimum_password_length` to 8. Contract change.
6. **Primary buttons dark slate (#0f172a), as on the intake canvas.** Desktop sign-in pages use a split layout with a green brand panel; pages after sign-in use the app layout.
7. **Reset gives the same answer whether or not the email has an account** ("If an account uses …"), so the page is not an account-existence oracle (AT-001.21 spirit).

## Codex persona reviews

Personas, played by Codex (gpt-6.2-sol, high effort) driving Playwright on a local copy of the boards: **Dana Okonkwo**, director of Harbor Community Kitchen, not technical, mostly on a phone, wary of agreeing to legal terms for the charity and of being locked out; **Sam Rivera**, volunteer backend developer, mostly desktop, wary of GitHub access he cannot undo. Reports are in `loop/items/AI4DEV-279/codex-review/`; screenshots in the project files folder `signin-persona-review/`.

### Round 1 (canvas version 4): Dana 5 not working, Sam 8 not working

Fixed (defects):
- A password chosen at sign-up or reset did not work at the next sign-in in the same board. The board now keeps the accounts it created.
- "Check your email" said you could sign in before confirming; the sign-in then failed. Lead call: sign-in needs a confirmed email (the local config has `enable_confirmations = true`), so the copy now says so, and signing in unconfirmed says "Confirm your email before you sign in" with a button to send the link again.
- A malformed email on sign-in was reported as a wrong password. It now asks to check the email address.
- Back from "Check your email" cleared the password. It is kept.
- Choosing the account type cleared the email and password errors. Only the type error clears.
- After a failed sign-in with Show on, the next password was visible. A failed sign-in now hides it again.
- Clicking the word Terms on the volunteer finish ticked the agreement. The Terms now open from a separate "Read the Terms and Platform Promise" section above the tick.

Usability hints applied (lead calls):
- One wording for who sees private information: "you, your volunteer and the ai4good team" (desktop panel and terms).
- NGO finish: the terms summary comes before both ticks, and the authority tick sits next to the agreement.
- Sign-up intro says what ai4good is: "ai4good gets free software built for nonprofits by volunteer developers."
- Volunteers see before choosing a sign-up method that every volunteer links GitHub, what is read, and that the link is permanent.
- Volunteer finish has one primary action at a time: Link GitHub first, then "Review and finish" with Finish sign-up as the primary button.
- Sign in sits in the phone header on the sign-up page.
- A failed submit moves focus to the first field that needs attention and scrolls it into view.
- "Check your email" copy differs for NGO and volunteer; the volunteer copy no longer mentions Discovery.
- The reset-sent page has "Send another reset link".
- The signed-in end state says it is the end of the preview and names the button the app shows there.

Hints declined or moved (lead calls):
- Let email volunteers finish without GitHub (Sam). Declined: REQ-001 makes the GitHub link mandatory at volunteer signup (AT-001.04).
- Make the GitHub link reversible (Sam). Declined: decision d91, AT-001.41.
- Escape hides a shown password (Sam). Not adopted; Hide is one key away.
- Browser Back leaving the flow (Sam): each board is its own page in the preview, not a defect. Screen build routes each step, so browser Back works there.
- Explain a second staff member's access (Dana): single-seat NGO in v1 (REQ-001); the terms state one account per organisation.

### Round 2 (canvas version 5): Dana 3 not working, Sam 4 not working

All round 1 defects were confirmed fixed except the reset on `DesktopReset` for an email the board did not know.

Fixed (defects):
- Signing in to a confirmed account that had not finished sign-up landed on Your projects with no organisation and no consent. Lead call: such a sign-in returns to the finish step (in the app: no completed signup means the finish page).
- Ticking both consent boxes, then changing the organisation name, kept the consent for the new name. Changing the name now clears both ticks and says why.
- Back after confirming the email showed "Check your email" again. There is no Back after confirmation.
- The reset board accepted a reset for Sam's email and then rejected the new password. The board now knows both sample accounts, and for an unknown email it says no link was sent (in the app the page gives the same answer for any email).

Usability hints applied (lead calls):
- Shorter account types ("Nonprofit", "Volunteer developer") and a two-line GitHub note that leads with "GitHub is required for volunteers, and the link is permanent."
- "Already have an account? Sign in" in the intro line, visible above the fold on both sizes.
- The NGO email hint says who sees the organisation's private information.
- A failed sign-in message stays until the next submit, so the button does not move while retyping.
- Volunteer finish shows Finish sign-up only after GitHub is linked, and its text changes to "Read the Terms and Platform Promise, then finish signing up."
- An empty submit focuses the account type first.
- The end-of-preview note sits directly under the heading of the signed-in page.

Declined or moved: Review GitHub access with exact scopes, Disconnect GitHub, finish without GitHub (Sam): product rules d91 and AT-001.04; GitHub's own consent page shows the scopes in the app. Browser Back across board addresses and Escape: as round 1.

### Round 3 (canvas version 6): Dana 3 not working, Sam 1 not working

All round 2 defects were confirmed fixed.

Fixed (defects):
- Back after signing up with Google or GitHub returned to the sign-up form, cleared the email, and asked for a link again. Lead call: an account made with Google or GitHub exists at once, so there is no Back from its finish step. "Finish later" is the way out.
- Signing in with Google to an account that had not finished sign-up skipped the finish step. Google and GitHub sign-in now go to the finish step, like the email sign-in.
- Choosing Google before an account type also flagged the empty email and password. Only the type error shows.

Usability hints applied (lead calls):
- "Finish later" on both finish steps. It goes to sign in with "Your email is confirmed. Sign in when you are ready to finish signing up; you continue where you left off."
- For nonprofits, "Who sees your information" sits under the account type, above Google, so it is read before any sign-up method.
- Single-seat copy agrees with itself: "One account per organisation, and it is yours" and "The account is yours alone. Do not share your sign-in with colleagues."
- GitHub comes before Google for volunteers.
- On the phone, Sign in is only in the header; the intro link shows on desktop only, and the bottom link is gone.
- After a password reset, the sign-in page says "Password changed. Enter your new password below." and puts the cursor in the password field.

Declined or moved: exact GitHub scopes and Cancel before authorisation (Sam): GitHub's consent page does this in the app. Join an existing organisation (Dana): single seat in v1. Browser Back and Escape: as round 1.

### Round 4 (canvas version 8): Dana 3 not working, Sam 1 not working

All round 3 defects were confirmed fixed, except that a Google email could still reach a new sign-up form (below).

Fixed (defects):
- "Finish later" followed by a password or GitHub sign-in reached the signed-in pages on boards that start at a later step, without the agreement. "Finish later" now marks the account unfinished, so every sign-in returns to the finish step.
- "Use a different email", then Back without sending, moved the confirmation to the unsent address. Back now restores the address that was sent.
- "Create an account" after "Finish later" kept the email of the earlier sign-up. It now opens an empty form.
- Signing in with GitHub to an unfinished email account linked GitHub without warning. Lead call: in the app a GitHub sign-in links that identity, so the sign-in page now says "For volunteers, signing in with GitHub links it to your account for good."

Usability hints applied (lead calls):
- The "Finish later" notice says how to continue: "When you are ready, sign in the same way you signed up and you continue where you left off."
- "Password changed" sits directly above the password field.
- The tapped provider button shows "Opening GitHub…" or "Opening Google…".

Declined or moved (lead calls): a separate "Sign up with email" control on the phone (Sam) and a privacy link in place of the note (Dana): the phone form fits up to the password field, and one scroll to the button is accepted. Plainer terms text (Dana): the Terms and Platform Promise wording belongs to the acknowledgment copy, which screen wiring takes from the agreed text. GitHub data list beside "Continue with GitHub" (Sam): the volunteer note already says what is read; the full list stays on the link step.

### Round 5 (canvas version 9): ALL WORKS for both personas

Dana and Sam each ended with ALL WORKS. All round 4 defects were confirmed fixed.

Hints left for screen build, where the Codex review runs again on the real screen (lead calls): a "You can finish later" line under the NGO finish introduction (Dana); "Change your email address" as its own short step in place of the sign-up form (Dana); the email form first on sign-in after "Finish later" for an email account, with the GitHub warning above the GitHub button (Sam). Declined as in round 4: plainer terms text, a privacy link in place of the note, a "Sign up with email" button on the phone, and the GitHub data list beside "Continue with GitHub".

## Completion (step 5) and PRD (step 6)

Lead calls under the founder's delegation, for the founder's review on the pull request:
- The screen is complete in both sizes.
- The PRD gets one REQ-001 bullet and decision d107: account type first, passwords of at least 8 characters, a confirmed email before sign-in, sign-up complete only after its finish step, a sign-in to an unfinished account returns to that step, and one reset answer for any email. Smaller details stay on the boards.
- Acceptance tests AT-001.42 to AT-001.49 bind the screens; they are pending until screen build and screen wiring, and the wiring leaf of the verification deliverable in `loop/decomp/req-001.md` lists them.

Canvas copy: `design/canvas/sign-in/project/`, from canvas version 9 (version id 1795813593-0a49).
