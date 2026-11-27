## A. First impression

I read ai4good as a place to spend a few evenings building open-source software for nonprofits. The desktop’s dark green mission panel, bold heading, and roomy form made it feel calm and credible. On my phone the choices were easy to tap, but selecting Volunteer developer pushed the email submit button below the first screen.

## B. Does not work

I found zero broken interactions in round 5.

- **Round 4’s permanent link after “Finish later” still happens, as designed.** On `Desktop` and `PhoneFinishVolunteer`, I paused with confirmed email and GitHub still unlinked, then chose **Sign in with GitHub**. Both screens now warn about the permanent link before that click. Both returned me to **Review and finish** with `@samrivera` linked and my agreement still checked. The phone now waits for **Finish sign-up**. [Desktop warning](/tmp/claude-0/personas-signin/sam/shots/16-r5-desktop-unlinked-pause-before-github.png), [desktop result](/tmp/claude-0/personas-signin/sam/shots/17-r5-desktop-github-sign-in-links-paused-account.png), [phone warning](/tmp/claude-0/personas-signin/sam/shots/29-r5-phone-finish-later-warning.png), [phone result](/tmp/claude-0/personas-signin/sam/shots/30-r5-phone-paused-github-sign-in-review.png)

The earlier items listed in round 4 also held up on recheck.

- **Being asked to link GitHub again is still fixed.** On `Desktop`, I signed up with GitHub, chose **Finish later** from review, then signed back in with GitHub. Review still showed the original link. [53-r5-desktop-github-resumes-with-link-intact.png](/tmp/claude-0/personas-signin/sam/shots/53-r5-desktop-github-resumes-with-link-intact.png)
- **New password rejected after reset is still fixed.** On `DesktopReset`, I saved a new password. The old password was rejected, and the new one opened my volunteer profile. [Old password](/tmp/claude-0/personas-signin/sam/shots/37-r5-desktop-reset-old-password-rejected.png), [new password](/tmp/claude-0/personas-signin/sam/shots/38-r5-desktop-reset-new-password-signs-in.png)
- **Browser Back still leaves the board, as expected in the preview.** I opened `Desktop` from `DesktopReset`, reached review, then pressed browser Back. It returned me to `DesktopReset`. [54-r5-browser-back-returns-to-desktop-reset.png](/tmp/claude-0/personas-signin/sam/shots/54-r5-browser-back-returns-to-desktop-reset.png)
- **Being asked to confirm email again is still fixed.** On `DesktopFinishVolunteer`, I clicked **Link GitHub**. Review kept the **Email confirmed** status and offered **Finish later**. On `Desktop`, the in-page **Back** before confirmation kept my role and form entries. [Review](/tmp/claude-0/personas-signin/sam/shots/58-r5-desktop-explicit-link-keeps-email-confirmed.png), [in-page Back](/tmp/claude-0/personas-signin/sam/shots/49-r5-desktop-in-flow-back-preserves-form.png)
- **Escape still leaves the password visible, as designed.** On `Desktop`, Space on **Show** revealed it, Escape left it visible, and Space on **Hide** masked it again. [After Escape](/tmp/claude-0/personas-signin/sam/shots/44-r5-desktop-keyboard-escape-keeps-password-visible.png), [after Hide](/tmp/claude-0/personas-signin/sam/shots/45-r5-desktop-keyboard-space-hides-password.png)

## C. Usability hints

1. **Put the way I signed up first.** On `Desktop` and `PhoneFinishVolunteer` after **Finish later**, the green message says to sign in the same way I signed up, but Google and GitHub are the first two buttons. The permanent-link warning is smaller and sits below the GitHub button. For a paused email sign-up, put the prefilled email form first and say, “Your email is confirmed. Enter the password you created to pick up where you left off.” Put “Signing in with GitHub permanently links it to your account” directly above the GitHub button. [14-r5-desktop-unlinked-finish-later.png](/tmp/claude-0/personas-signin/sam/shots/14-r5-desktop-unlinked-finish-later.png), [29-r5-phone-finish-later-warning.png](/tmp/claude-0/personas-signin/sam/shots/29-r5-phone-finish-later-warning.png)
2. **Explain what nonprofits will see before I choose GitHub.** On `Desktop` with Volunteer developer selected, “public profile” left me guessing which activity would appear. The email route’s linking screen specified my handle, top languages, public repository count, and contributions. Put that disclosure beside **Continue with GitHub**. “Nonprofits will see your public GitHub handle, top languages, public repository count, and contributions. Linking is permanent. GitHub shows the exact permissions before you authorize.” [02-r5-desktop-volunteer-selected.png](/tmp/claude-0/personas-signin/sam/shots/02-r5-desktop-volunteer-selected.png), [12-r5-desktop-email-confirmed-link-disclosure.png](/tmp/claude-0/personas-signin/sam/shots/12-r5-desktop-email-confirmed-link-disclosure.png)
3. **Give the email option a visible button on the phone.** On `Main` at 390 × 844, the two provider buttons and both email fields were visible, but **Create account** took a scroll. The small “or with email” divider made that route easy to skim past. Replace the divider with a full-width **Sign up with email** button that opens the fields and scrolls them into view. [First screen](/tmp/claude-0/personas-signin/sam/shots/21-r5-phone-volunteer-first-viewport.png), [after scrolling](/tmp/claude-0/personas-signin/sam/shots/22-r5-phone-email-submit-below-fold.png)

## D. Works

- GitHub sign-up reached my signed-in volunteer profile on desktop and phone. GitHub sign-in also reached it on both dedicated sign-in boards. The phone sign-up button now shows **Opening GitHub…** where I tapped.
- Email and password let me confirm my address, pause with GitHub unlinked, and resume with my agreement saved. Finishing required GitHub. The explicit **Link GitHub** route kept my email confirmation and let me finish.
- Tab showed where I was, Enter submitted the form and opened the terms, and Space toggled password visibility. Empty fields, malformed email, and a short password got specific feedback.
- Switching account type midway kept my entries and updated the options. Resend showed that another confirmation link had been sent in the preview.

## E. If I could change only three things

1. Lead with email and password when someone pauses an email sign-up.
2. Show exactly which public GitHub details nonprofits will see before the GitHub button.
3. Make **Sign up with email** visible on the phone without scrolling.

## F. Scores

- **Looks — 8/10.** The green and navy palette, clear type, and generous tap targets felt polished, though the phone’s provider choices pushed the email submit button below the fold.
- **Clarity — 8/10.** I understood the GitHub requirement, but the resume screen took a second read to tell me which sign-in method to use.
- **Safety — 7/10.** The permanent-link warning helped, and I still wanted the specific public data listed before choosing GitHub.

ALL WORKS