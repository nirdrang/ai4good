import { atTest, AtPending } from './_bind.ts';

const pendingUntilBuilt = (id: string) => async () => {
  throw new AtPending(id, 'sut-missing', 'the intake screen design of 2026-11-27 lands in screen build and screen wiring');
};
atTest('AT-003.19', 'Your projects starts a project and the form has no file control', pendingUntilBuilt('AT-003.19'));
atTest('AT-003.20', 'the draft saves itself, one draft at a time, and an empty form leaves no draft', pendingUntilBuilt('AT-003.20'));
atTest('AT-003.21', 'discarding a draft asks first and keeps it on no', pendingUntilBuilt('AT-003.21'));
atTest('AT-003.22', 'empty, spaces-only, too long or missing urgency stops at the form with focus on the first problem', pendingUntilBuilt('AT-003.22'));
atTest('AT-003.23', 'contact details block posting and a name only warns', pendingUntilBuilt('AT-003.23'));
atTest('AT-003.24', 'the preview shows the exact public card and needs the confirmation', pendingUntilBuilt('AT-003.24'));
atTest('AT-003.25', 'posting opens Discovery and the card leads the public list', pendingUntilBuilt('AT-003.25'));
atTest('AT-003.26', 'a member without the admin role sees who can start a project', pendingUntilBuilt('AT-003.26'));
atTest('AT-003.27', 'phone sizes, the Account dialog keyboard and signed-out visitors', pendingUntilBuilt('AT-003.27'));
