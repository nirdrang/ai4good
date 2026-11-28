import { atTest, AtPending } from './_bind.ts';

const pendingUntilBuilt = (id: string) => async () => {
  throw new AtPending(id, 'sut-missing', 'the organisation profile and Your projects screen design of 2026-11-28 lands in screen build and screen wiring');
};
atTest('AT-002.32', 'the first sign-in opens the profile with the name from sign-up, later sign-ins open Your projects', pendingUntilBuilt('AT-002.32'));
atTest('AT-002.33', 'missing, too long or malformed fields stop the save with a focused summary; website and logo are optional', pendingUntilBuilt('AT-002.33'));
atTest('AT-002.34', 'the logo takes a small PNG, JPEG or WebP image, a refused image is not added and does not stop the save, and initials stand in', pendingUntilBuilt('AT-002.34'));
atTest('AT-002.35', 'the first save runs once and opens Your projects with the organisation card and an empty project list', pendingUntilBuilt('AT-002.35'));
atTest('AT-002.36', 'editing the profile saves back to where it started and cancelling a change asks first', pendingUntilBuilt('AT-002.36'));
atTest('AT-002.37', 'Your projects shows each project with its stage and one next action and keeps the place on return', pendingUntilBuilt('AT-002.37'));
atTest('AT-002.38', 'a member without the admin role sees the projects but no draft, no edit, and who the admin is', pendingUntilBuilt('AT-002.38'));
atTest('AT-002.39', 'phone sizes, the Account dialog keyboard and signing out', pendingUntilBuilt('AT-002.39'));
