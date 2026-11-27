## A. First impression

I thought ai4good was a place to ask volunteers to build free software for Harbor Community Kitchen. On my phone, the large heading and buttons made it easy to start, but choosing Nonprofit pushed **Create account** below the bottom of the screen. On my laptop, the dark green panel made the site look established and told me who could see our private information.

## B. Does not work

I found no broken interactions in the flows I tried. All three problems from round 4 are fixed.

1. **Signing in after “Finish later” skipped the charity’s agreement — fixed.** On `PhoneCheck`, I confirmed my email, left the form and both boxes empty, tapped **Finish later**, and signed in with my password. I returned to **Set up your organisation**. On `PhoneFinishNgo`, I filled in the charity’s details, left both boxes unticked, and did the same thing. My details were still there, and I was back at setup. [36-r5-phone-check-resumes-setup.png](/tmp/claude-0/personas-signin/dana/shots/36-r5-phone-check-resumes-setup.png) · [40-r5-phone-finish-ngo-resumes-setup.png](/tmp/claude-0/personas-signin/dana/shots/40-r5-phone-finish-ngo-resumes-setup.png)
2. **Backing out of an email edit changed which address was confirmed — fixed.** On `Main`, I submitted my work email, tapped **Use a different email**, typed a different address, and tapped **Back** without submitting. The email screen still showed my work address, and opening the link confirmed that same address. [07-r5-main-unsent-edit.png](/tmp/claude-0/personas-signin/dana/shots/07-r5-main-unsent-edit.png) · [08-r5-main-back-from-unsent-edit.png](/tmp/claude-0/personas-signin/dana/shots/08-r5-main-back-from-unsent-edit.png) · [09-r5-main-organisation-setup.png](/tmp/claude-0/personas-signin/dana/shots/09-r5-main-organisation-setup.png)
3. **The volunteer’s Google email carried into a new nonprofit sign-up — fixed.** On `Main`, I typed my work email as a volunteer, tried Google, then chose **Finish later → Create an account → Nonprofit**. The email field was blank. I entered my work address and a password, and the confirmation screen showed my work address. [47-r5-main-volunteer-google.png](/tmp/claude-0/personas-signin/dana/shots/47-r5-main-volunteer-google.png) · [50-r5-main-fresh-nonprofit-email-blank.png](/tmp/claude-0/personas-signin/dana/shots/50-r5-main-fresh-nonprofit-email-blank.png) · [51-r5-main-fresh-nonprofit-check-email.png](/tmp/claude-0/personas-signin/dana/shots/51-r5-main-fresh-nonprofit-check-email.png)

## C. Usability hints

1. **Put the agreement in plain English.** On `Main`, with the full terms open, the text was smaller than the form labels. I reread phrases like “funds AI compute,” “MIT-licensed,” and “No service level” because I wanted to understand what I was agreeing to for the kitchen. Use the same text size as the form and say, “ai4good pays for the AI tools volunteers use. There is no promise of a finished product or a delivery date. The software comes without a warranty. Anyone can see and reuse the code under the MIT licence.” [10-r5-main-terms-expanded.png](/tmp/claude-0/personas-signin/dana/shots/10-r5-main-terms-expanded.png)
2. **Let me see that I can pause before I reach the boxes.** On `Main`, the first setup screen asks for three details and starts to explain the agreement, but **Finish later** is a small link below both boxes and the dark **Finish sign-up** button. If I needed to check with the trustees, I might think agreeing was the only way forward. Add a line under the setup introduction saying “Need to check with someone? You can finish later.” Make **finish later** a link there. [09-r5-main-organisation-setup.png](/tmp/claude-0/personas-signin/dana/shots/09-r5-main-organisation-setup.png) · [11-r5-main-consent-before-agreeing.png](/tmp/claude-0/personas-signin/dana/shots/11-r5-main-consent-before-agreeing.png)
3. **Keep “Create account” in view on the phone.** On `Main`, choosing Nonprofit adds a tall privacy box and a two-line email hint. I could see the password field, but I had to scroll to find the button that submits it. Keep a compact privacy summary near the top from the start, with **Who can see our information?** opening the details. Shorten the email hint to “Use your work email if you have one.” [02-r5-main-nonprofit.png](/tmp/claude-0/personas-signin/dana/shots/02-r5-main-nonprofit.png)
4. **Make changing an email feel like an edit.** On `PhoneCheck`, **Use a different email** sent me to a screen headed **Create your account**, with the role choices and Google button again. I corrected the address and only found out after submitting that I had to enter a password too. Give this step the heading **Change your email address**, put the email and password fields first, and say “Enter your corrected email and re-enter your password to get a new confirmation link.” Label the button **Send confirmation link**. [84-r5-phone-check-edit-email-form.png](/tmp/claude-0/personas-signin/dana/shots/84-r5-phone-check-edit-email-form.png) · [85-r5-phone-check-changing-email-requires-password.png](/tmp/claude-0/personas-signin/dana/shots/85-r5-phone-check-changing-email-requires-password.png)

## D. Works

- I read the terms, ticked both boxes for Harbor Community Kitchen, finished phone sign-up, and signed back in with the password I’d chosen.
- Google on desktop filled in my name and saved me the password and email confirmation steps. After **Finish later**, signing back in with Google brought back my setup details so I could agree and finish.
- Phone sign-in rejected one wrong password and accepted the right one. **Forgot password?** carried over my email, the reset rejected a short password, and the new password got me back in. The old one was rejected. Desktop reset worked too.
- Blank fields and a badly typed email got specific warnings. Switching roles kept my entries and warnings. Renaming the charity cleared both ticks and explained why.

## E. If I could change only three things

1. Make the full agreement readable in ordinary language.
2. Put **Finish later** near the top of organisation setup.
3. Keep **Create account** visible after I choose Nonprofit on my phone.

## F. Scores

- **Looks 8/10.** The headings and buttons were easy to read, but choosing Nonprofit pushed the main button out of sight on my phone.
- **Clarity 8/10.** I could follow sign-up and recover my password, though correcting an email felt like starting over.
- **How safe I felt giving my details 8/10.** Seeing who could access our information and returning to the agreement after pausing reassured me, but I still had to reread the terms before I felt ready to tick the boxes.

ALL WORKS