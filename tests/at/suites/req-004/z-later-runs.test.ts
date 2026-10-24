import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

atTest('AT-004.16', 'Discovery criterion 16 awaits referenceUpload', { default: awaiting(AWAITED.referenceUpload) });
atTest('AT-004.18', 'Discovery criterion 18 awaits referenceUpload', { default: awaiting(AWAITED.referenceUpload) });
atTest('AT-004.19', 'Discovery criterion 19 awaits referenceUpload', { default: awaiting(AWAITED.referenceUpload) });
atTest('AT-004.53', 'Discovery criterion 53 awaits fitDecline', { default: awaiting(AWAITED.fitDecline) });
atTest('AT-004.54', 'Discovery criterion 54 awaits fitDecline', { default: awaiting(AWAITED.fitDecline) });
atTest('AT-004.55', 'Discovery criterion 55 awaits fitDecline', { default: awaiting(AWAITED.fitDecline) });
atTest('AT-004.56', 'Discovery criterion 56 awaits fitDecline', { default: awaiting(AWAITED.fitDecline) });
atTest('AT-004.57', 'Discovery criterion 57 awaits fitDecline', { default: awaiting(AWAITED.fitDecline) });
atTest('AT-004.74', 'the Discovery document freezes and the screen locks read-only when the volunteer starts PRD work, in the UI and at the API', { default: awaiting(AWAITED.publishFlow) });
