## A. First impression

I thought ai4good was a place to volunteer my evenings building open-source software for nonprofits. The dark green mission panel, clear headings, and roomy form made the desktop page feel calm and credible. On my phone, the buttons were easy to tap, but choosing Volunteer developer pushed the email sign-up button off the first screen.

## B. Does not work

1. **Signing in after “Finish later” permanently linked GitHub.** On `Desktop`, I created a volunteer account with email and password, confirmed my email, and chose **Finish later** while GitHub was still unlinked. I clicked **Sign in with GitHub** expecting to resume where I left off. Instead, **Review and finish** showed `@samrivera` as permanently linked, and I had never clicked **Link GitHub**. On `PhoneFinishVolunteer`, I repeated this with the agreement already checked and went straight to the signed-in profile. [77-r4-email-pause-offers-three-sign-in-methods.png](/tmp/claude-0/personas-signin/sam/shots/77-r4-email-pause-offers-three-sign-in-methods.png), [79-r4-email-pause-github-signin-result.png](/tmp/claude-0/personas-signin/sam/shots/79-r4-email-pause-github-signin-result.png), [83-r4-phone-paused-github-signin-link-and-agreement.png](/tmp/claude-0/personas-signin/sam/shots/83-r4-phone-paused-github-signin-link-and-agreement.png)

**Round 3 recheck**

- **Email told me to link GitHub again — fixed.** On `Desktop`, GitHub sign-up took me to **Review and finish**, where **Finish later** replaced the Back route that let me switch to email sign-up. Signing back in with GitHub resumed the same review with the link intact. [63-r4-keyboard-review-focus-and-no-back.png](/tmp/claude-0/personas-signin/sam/shots/63-r4-keyboard-review-focus-and-no-back.png), [66-r4-github-resumes-review-with-link.png](/tmp/claude-0/personas-signin/sam/shots/66-r4-github-resumes-review-with-link.png)
- **Reset password rejected — still fixed.** On `DesktopReset`, I saved a new password and signed in with it on the same board. [60-r4-reset-new-password-signin-success.png](/tmp/claude-0/personas-signin/sam/shots/60-r4-reset-new-password-signin-success.png)
- **Browser Back left sign-up — still happens, as expected in the preview.** Browser Back from `Desktop` review returned me to `DesktopReset`. [67-r4-browser-back-returns-to-previous-board.png](/tmp/claude-0/personas-signin/sam/shots/67-r4-browser-back-returns-to-previous-board.png)
- **On-screen Back asked for a second confirmation — still fixed.** After confirming my email and linking GitHub on `Desktop`, review still showed my email as confirmed. **Finish later** was the available exit. [17-r4-desktop-confirmed-email-and-github-review.png](/tmp/claude-0/personas-signin/sam/shots/17-r4-desktop-confirmed-email-and-github-review.png)
- **Escape left the password visible — still happens, as designed.** On `Desktop`, Space on **Show** revealed it, Escape left it visible, and Space on **Hide** masked it again. [38-r4-keyboard-escape-leaves-password-shown.png](/tmp/claude-0/personas-signin/sam/shots/38-r4-keyboard-escape-leaves-password-shown.png), [39-r4-keyboard-space-hides-password.png](/tmp/claude-0/personas-signin/sam/shots/39-r4-keyboard-space-hides-password.png)

## C. Usability hints

1. **Tell me how to resume safely.** On `Desktop` after **Finish later**, the green message promised I could pick up where I left off, and GitHub was offered alongside email sign-in. I read both as ways to resume. For an unlinked email account, show the email form first and say, “Sign in with the password you created to resume. You can link GitHub when you’re ready.” Keep the permanent link behind **Link GitHub**. [77-r4-email-pause-offers-three-sign-in-methods.png](/tmp/claude-0/personas-signin/sam/shots/77-r4-email-pause-offers-three-sign-in-methods.png)
2. **Explain what “public profile” includes before GitHub sign-up.** On `Desktop` with Volunteer developer selected, I knew the link was permanent, but I only saw the specific data on the email route’s linking screen. Put the same disclosure beside **Continue with GitHub**. “We show nonprofits your public GitHub handle, top languages, public repository count, and contributions. The link is permanent. GitHub shows the exact permissions before you authorize.” [02-r4-desktop-volunteer-selected.png](/tmp/claude-0/personas-signin/sam/shots/02-r4-desktop-volunteer-selected.png), [11-r4-desktop-email-confirmed-github-required.png](/tmp/claude-0/personas-signin/sam/shots/11-r4-desktop-email-confirmed-github-required.png)
3. **Make the phone’s email route visible at a glance.** On `Main` at 390 × 844, I could see both inputs and the password hint, but **Create account** required a scroll. Replace the small “or with email” divider with a full-width **Sign up with email** control that opens the fields and brings them into view. [24-r4-phone-volunteer-first-viewport.png](/tmp/claude-0/personas-signin/sam/shots/24-r4-phone-volunteer-first-viewport.png), [25-r4-phone-volunteer-email-button-after-scroll.png](/tmp/claude-0/personas-signin/sam/shots/25-r4-phone-volunteer-email-button-after-scroll.png)
4. **Put loading feedback on the button I tapped.** On `Main`, tapping GitHub greyed out both provider buttons. The “Creating your account…” message appeared on the email button below the fold, so I briefly wondered whether my tap registered. Change the tapped button to **Opening GitHub…** while it loads. [85-r4-phone-github-loading-above-fold.png](/tmp/claude-0/personas-signin/sam/shots/85-r4-phone-github-loading-above-fold.png)

## D. Works

- GitHub sign-up reached my signed-in volunteer profile on desktop and phone. GitHub sign-in worked on both dedicated sign-in boards.
- The email route let me confirm my address and pause without linking. Signing back in with my password kept my confirmation and agreement. Finishing required GitHub, and the explicit link button took me to review.
- Resend showed feedback, and the on-screen Back button before confirmation kept my form entries. Switching roles kept them too and updated the instructions.
- Tab showed visible focus, Enter submitted forms and opened the terms, and Space toggled password visibility. Empty and malformed fields got specific messages, and a wrong sign-in password was rejected.

## E. If I could change only three things

1. Keep permanent GitHub linking behind an explicit **Link GitHub** action, including after **Finish later**.
2. Explain which GitHub details nonprofits will see before **Continue with GitHub**.
3. Give phone users a visible **Sign up with email** control.

## F. Scores

- **Looks — 8/10.** The green and navy palette and readable type made the form feel calm, though the volunteer choices filled the phone screen before I reached the email button.
- **Clarity — 8/10.** I understood the main paths and the GitHub requirement, but the resume screen gave me a misleading choice.
- **Safety — 5/10.** The public-data disclosure helped, but I’d hesitate to continue after a sign-in button created a permanent link.

1