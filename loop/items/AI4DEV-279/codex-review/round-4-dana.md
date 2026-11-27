## A. First impression

I thought ai4good was a place to ask volunteers to build free software for Harbor Community Kitchen. On my phone, the bold heading and large buttons made it easy to start, though choosing Nonprofit pushed **Create account** below the bottom of my screen. On my laptop, the dark green panel made the service feel more established and told me up front who could see our information.

## B. Does not work

1. **Signing in after “Finish later” skipped the charity’s agreement.** On `PhoneCheck`, I opened the confirmation link, left the organisation form and both consent boxes untouched, tapped **Finish later**, then signed in with my email and password. I landed on **Your projects** even though the sign-in screen said I would pick up where I left off. On `PhoneFinishNgo`, I also reached projects after pausing with both boxes unticked. [55-r4-phone-check-finish-later-sign-in.png](/tmp/claude-0/personas-signin/dana/shots/55-r4-phone-check-finish-later-sign-in.png) · [56-r4-phone-check-password-opens-projects-without-consent.png](/tmp/claude-0/personas-signin/dana/shots/56-r4-phone-check-password-opens-projects-without-consent.png) · [64-r4-phone-finish-ngo-password-sign-in-after-pause.png](/tmp/claude-0/personas-signin/dana/shots/64-r4-phone-finish-ngo-password-sign-in-after-pause.png)
2. **Backing out of an email edit changed which address was confirmed.** On `Main`, I submitted my work email, tapped **Use a different email**, typed `dana+draft@harborkitchen.org`, and tapped **Back** without submitting the edit. **Check your email** then said the link had been sent to the draft address, and opening it marked that address confirmed. I expected Back to return me to the confirmation for the address I had submitted. [80-r4-main-unsent-email-edit.png](/tmp/claude-0/personas-signin/dana/shots/80-r4-main-unsent-email-edit.png) · [81-r4-main-check-email-after-cancelling-edit.png](/tmp/claude-0/personas-signin/dana/shots/81-r4-main-check-email-after-cancelling-edit.png) · [82-r4-main-confirmation-after-unsent-email-edit.png](/tmp/claude-0/personas-signin/dana/shots/82-r4-main-confirmation-after-unsent-email-edit.png)
3. **The volunteer’s Google email still carried into a new nonprofit sign-up.** On `Main`, I entered my work email as a volunteer, tried Google, then chose **Finish later → Create an account → Nonprofit**. The new form was filled with the sample volunteer’s Gmail address. I entered a new password and submitted, and the confirmation screen showed the volunteer’s address. I expected a fresh form for the charity. [36-r4-main-volunteer-draft-before-google.png](/tmp/claude-0/personas-signin/dana/shots/36-r4-main-volunteer-draft-before-google.png) · [39-r4-main-nonprofit-form-after-pausing-volunteer-google.png](/tmp/claude-0/personas-signin/dana/shots/39-r4-main-nonprofit-form-after-pausing-volunteer-google.png) · [40-r4-main-nonprofit-confirmation-uses-volunteer-email.png](/tmp/claude-0/personas-signin/dana/shots/40-r4-main-nonprofit-confirmation-uses-volunteer-email.png)

**Round 3 rechecks**

- **Google skipped consent — fixed on both routes from round 3.** Desktop Google sign-in returned to unfinished setup after **Finish later**. On `Main`, Google sign-in after backing out of email confirmation also opened organisation setup. The password sign-in problem on the two separate phone boards is item 1 above. [15-r4-desktop-google-returns-to-unfinished-setup.png](/tmp/claude-0/personas-signin/dana/shots/15-r4-desktop-google-returns-to-unfinished-setup.png) · [46-r4-main-google-after-unconfirmed-email-sign-up.png](/tmp/claude-0/personas-signin/dana/shots/46-r4-main-google-after-unconfirmed-email-sign-up.png)
- **Google replaced my typed email — partly fixed.** The old Back route is gone. The wrong email still carries over through **Finish later → Create an account**, as shown in item 3. [37-r4-main-volunteer-google-no-back.png](/tmp/claude-0/personas-signin/dana/shots/37-r4-main-volunteer-google-no-back.png)
- **Google asked for an email and password before I picked a role — fixed.** On `Main` and `Desktop`, tapping Google with neither role selected only highlighted the role choices. [32-r4-main-google-role-only-error.png](/tmp/claude-0/personas-signin/dana/shots/32-r4-main-google-role-only-error.png) · [12-r4-desktop-google-role-only-error.png](/tmp/claude-0/personas-signin/dana/shots/12-r4-desktop-google-role-only-error.png)

## C. Usability hints

1. **Make it easier to pause before agreeing.** On `Main`, **Finish later** is a small link below the dark **Finish sign-up** button, and both sit below the first screen. I only found the pause option after scrolling past the two boxes. Add a line under the introduction saying “Need to check with your trustees? You can finish later.” Give *finish later* a clear link there. [05-r4-main-confirmed-setup.png](/tmp/claude-0/personas-signin/dana/shots/05-r4-main-confirmed-setup.png) · [07-r4-main-named-consent-before-agreeing.png](/tmp/claude-0/personas-signin/dana/shots/07-r4-main-named-consent-before-agreeing.png)
2. **Make the agreement easier to read.** On `Main`, the expanded terms use smaller text than the form and phrases like “funds AI compute” and “MIT-licensed” made me stop and reread. Use the same text size as the form and say, “ai4good pays for the AI tools volunteers use. There is no guarantee of a finished product or a delivery date. Anyone can see and reuse the software code under the MIT licence.” [06-r4-main-full-terms-before-consent.png](/tmp/claude-0/personas-signin/dana/shots/06-r4-main-full-terms-before-consent.png)
3. **Keep the phone sign-up button in view.** On `Main`, choosing Nonprofit added a tall privacy box and a two-line email hint. I could see the password field but had to scroll to submit. Put a compact **Who can see our information?** link under the introduction, make it visible from the start, and shorten the email hint to “Use your work email if you have one.” [01-r4-main-start.png](/tmp/claude-0/personas-signin/dana/shots/01-r4-main-start.png) · [02-r4-main-nonprofit.png](/tmp/claude-0/personas-signin/dana/shots/02-r4-main-nonprofit.png)
4. **Put the reset confirmation beside the password field.** On `PhoneReset`, the green message said to enter my new password, but the Google and GitHub buttons sat between that message and the field. Move “Password changed. Enter your new password below.” directly above the password field so I can follow it at a glance. [92-r4-phone-reset-board-password-changed.png](/tmp/claude-0/personas-signin/dana/shots/92-r4-phone-reset-board-password-changed.png)

## D. Works

- I read the terms, ticked both boxes for Harbor Community Kitchen, finished phone sign-up, and signed back in with the password I had chosen.
- Google on desktop filled in my name and saved me the password and email confirmation steps. I could still read the terms before agreeing.
- Phone sign-in rejected one wrong password and accepted the correct one. **Forgot password?** carried my email over, the reset rejected a short password, and the replacement got me back in. The old password was rejected. Desktop reset worked too.
- Blank fields and badly typed email addresses got clear warnings. Switching roles kept my entries and warnings, and renaming the charity after ticking both boxes cleared both ticks and asked me to agree again.

## E. If I could change only three things

1. Return me to unfinished organisation setup every time I sign in before agreeing.
2. Keep the confirmation tied to the last email I submitted when I back out of an edit.
3. Start a fresh nonprofit form when I choose to create a new account after pausing volunteer sign-up.

## F. Scores

- **Looks 8/10.** The headings and buttons were easy to read, but picking Nonprofit pushed the main button off my phone screen.
- **Clarity 7/10.** I could follow the main steps, but the terms took rereading and Back surprised me during the email edit.
- **How safe I felt giving my details 6/10.** Seeing who could access our information helped, but reaching projects with both boxes empty left me unsure when the charity’s agreement counted.

3