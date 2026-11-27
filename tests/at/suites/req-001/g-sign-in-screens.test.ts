import { atTest, AtPending } from './_bind.ts';

const pendingUntilBuilt = (id: string) => async () => {
  throw new AtPending(id, 'sut-missing', 'the sign-in screen design of 2026-11-27 lands in screen build and screen wiring');
};
atTest('AT-001.42', 'sign-up asks the account type first and checks email and an 8-character password', pendingUntilBuilt('AT-001.42'));
atTest('AT-001.43', 'an email sign-up confirms its email before it can sign in', pendingUntilBuilt('AT-001.43'));
atTest('AT-001.44', 'the NGO finish step records the organisation, the signer and the agreement', pendingUntilBuilt('AT-001.44'));
atTest('AT-001.45', 'a volunteer finishes only after linking GitHub', pendingUntilBuilt('AT-001.45'));
atTest('AT-001.46', 'an unfinished account returns to its finish step and can finish later', pendingUntilBuilt('AT-001.46'));
atTest('AT-001.47', 'a wrong password or malformed email on sign-in says which one is wrong', pendingUntilBuilt('AT-001.47'));
atTest('AT-001.48', 'reset gives one answer for any email and the new password replaces the old', pendingUntilBuilt('AT-001.48'));
atTest('AT-001.49', 'phone sizes, keyboard password toggle and sign out', pendingUntilBuilt('AT-001.49'));
