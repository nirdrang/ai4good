## A. First impression

I thought I was creating an account to build open-source software for nonprofits in my spare time. The dark green mission panel and the light form made the desktop page feel calm, and the two account types were easy to tell apart. On my phone, the large controls were easy to tap, but the form felt crowded once I chose Volunteer developer.

## B. Does not work

1. **The email screen told me to link GitHub again.** On `Desktop`, I chose Volunteer developer, continued with GitHub, and saw `@samrivera` linked. I clicked the on-screen **Back**, switched to Nonprofit and back to Volunteer developer, then submitted the prefilled email with a password. **Check your email** told me I would link GitHub next. Opening the confirmation link took me straight to **Review and finish**, where GitHub was already linked. The screen gave me the wrong next step. [55-r3-desktop-github-back-email-submission-result.png](/tmp/claude-0/personas-signin/sam/shots/55-r3-desktop-github-back-email-submission-result.png), [56-r3-desktop-email-confirmed-existing-github-retained.png](/tmp/claude-0/personas-signin/sam/shots/56-r3-desktop-email-confirmed-existing-github-retained.png)

**Round 2 recheck**

- **Reset password rejected — fixed.** On `DesktopReset`, I opened the preview reset link, saved a new password, and used it to sign in successfully on the same board. [36-r3-desktop-reset-password-changed.png](/tmp/claude-0/personas-signin/sam/shots/36-r3-desktop-reset-password-changed.png), [38-r3-desktop-reset-fresh-password-signed-in.png](/tmp/claude-0/personas-signin/sam/shots/38-r3-desktop-reset-fresh-password-signed-in.png)
- **Browser Back left sign-up — still happens, as expected in the preview.** From `Desktop` at **Review and finish**, browser Back returned me to the previous board, `DesktopReset`. [49-r3-desktop-github-review-before-browser-back.png](/tmp/claude-0/personas-signin/sam/shots/49-r3-desktop-github-review-before-browser-back.png), [50-r3-desktop-browser-back-across-boards.png](/tmp/claude-0/personas-signin/sam/shots/50-r3-desktop-browser-back-across-boards.png)
- **On-screen Back asked for a second email confirmation — fixed by removing Back from that step.** On `Desktop`, after confirming my email and linking GitHub, **Review and finish** still showed my email as confirmed. The Back button that previously sent me to **Check your email** was gone. [15-r3-desktop-email-confirmed-review-after-link.png](/tmp/claude-0/personas-signin/sam/shots/15-r3-desktop-email-confirmed-review-after-link.png)
- **Escape left the password visible — still happens, as designed.** On `Desktop`, I tabbed to **Show**, pressed Space, then Escape. The password stayed visible. Space on **Hide** masked it again. [44-r3-desktop-keyboard-escape-password-still-shown.png](/tmp/claude-0/personas-signin/sam/shots/44-r3-desktop-keyboard-escape-password-still-shown.png), [45-r3-desktop-keyboard-space-remasks-password.png](/tmp/claude-0/personas-signin/sam/shots/45-r3-desktop-keyboard-space-remasks-password.png)

## C. Usability hints

1. **Show the exact GitHub access before I commit.** On `Desktop`, choosing Volunteer developer showed a short notice about public profile access and permanence. The email route gave me the specifics before linking on `DesktopFinishVolunteer`. It says ai4good reads my public handle, top languages, repository count, and contributions, shows them to nonprofits, and gives me no way to unlink. **Continue with GitHub** took me straight to the linked state in the preview, so I couldn’t verify the live OAuth permissions. Put the same detailed disclosure behind **Review GitHub access** on both routes, show the exact permissions being requested, and offer **Cancel** before authorization. [02-r3-desktop-volunteer-selected.png](/tmp/claude-0/personas-signin/sam/shots/02-r3-desktop-volunteer-selected.png), [04-r3-desktop-github-linked-review.png](/tmp/claude-0/personas-signin/sam/shots/04-r3-desktop-github-linked-review.png), [60-r3-desktop-standalone-github-disclosure.png](/tmp/claude-0/personas-signin/sam/shots/60-r3-desktop-standalone-github-disclosure.png)
2. **Give me a way to pause before linking.** On `Desktop` after email confirmation and on `PhoneFinishVolunteer`, I could read the terms and even agree, but I couldn’t finish without GitHub. With no visible exit, I couldn’t tell how to step away without starting over. Add **Finish later** under **Link GitHub**, with “Your email is confirmed. Sign in later to finish setting up your volunteer account.” [13-r3-desktop-email-agreed-github-still-required.png](/tmp/claude-0/personas-signin/sam/shots/13-r3-desktop-email-agreed-github-still-required.png), [65-r3-phone-standalone-github-disclosure.png](/tmp/claude-0/personas-signin/sam/shots/65-r3-phone-standalone-github-disclosure.png)
3. **Show what I’ve already completed.** On `Desktop`, going Back after linking returned me to a form with my email filled in and no visible GitHub status. The next screen then told me to link again. Show “GitHub connected as @samrivera” on the form and say “Confirm your email, then review and finish signing up” when GitHub is already connected. [52-r3-desktop-github-on-screen-back-result.png](/tmp/claude-0/personas-signin/sam/shots/52-r3-desktop-github-on-screen-back-result.png), [55-r3-desktop-github-back-email-submission-result.png](/tmp/claude-0/personas-signin/sam/shots/55-r3-desktop-github-back-email-submission-result.png)
4. **Use the phone’s first screen for the sign-up choices.** On `Main` at 390 × 844, choosing Volunteer developer pushed **Create account** below the fold. The page had three **Sign in** links, and Google appeared above GitHub even though GitHub is required. Keep **Sign in** in the sticky header, remove the two duplicates, tighten the spacing around the role cards, and put GitHub first for volunteers. [21-r3-phone-start.png](/tmp/claude-0/personas-signin/sam/shots/21-r3-phone-start.png), [22-r3-phone-volunteer-selected-at-fold.png](/tmp/claude-0/personas-signin/sam/shots/22-r3-phone-volunteer-selected-at-fold.png), [23-r3-phone-volunteer-email-controls-after-scroll.png](/tmp/claude-0/personas-signin/sam/shots/23-r3-phone-volunteer-email-controls-after-scroll.png)

## D. Works

- GitHub sign-up reached my signed-in volunteer profile on desktop and phone. GitHub sign-in worked on both dedicated sign-in boards.
- The desktop email route confirmed my address, kept my agreement when I linked GitHub, and let me finish. The check-email board showed resend feedback and let me edit the address.
- Tab showed visible focus. Enter submitted forms and opened the Terms. Space toggled Show/Hide. Switching roles kept my typed details. Empty and malformed inputs got specific messages, and a failed sign-in cleared and masked the password field for the next try.

## E. If I could change only three things

1. Put the exact GitHub permissions and a chance to cancel before the permanent link.
2. Give confirmed volunteers a **Finish later** option that saves their progress.
3. Keep the GitHub status and next-step instructions accurate when someone switches sign-up methods.

## F. Scores

- **Looks — 8/10.** The green and navy palette and readable type felt calm, though the repeated links crowded the phone form.
- **Clarity — 8/10.** I knew GitHub was required as soon as I chose volunteer, but switching methods gave me a misleading next step.
- **Safety — 6/10.** The public-data disclosure helped, but I’d still pause before making a permanent connection without seeing the exact permissions.

1