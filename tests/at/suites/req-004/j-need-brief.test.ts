import { atTest } from './_bind.ts';
import { notYet } from './_pending.ts';

// d94 (2026-09-29): the need brief, files, and Finish. The Discovery screen item replaces each stub
// with a body that runs against the shared mock first and the wired app after.
atTest('AT-004.61', 'the live brief updates from each reply with importance', { default: notYet('AT-004.61') });
atTest('AT-004.62', 'Finish groups open questions by importance without a model call', { default: notYet('AT-004.62') });
atTest('AT-004.63', 'the Discovery document holds the need and no technical scope', { default: notYet('AT-004.63') });
atTest('AT-004.64', 'the review offers the chat and brief edits, never an AI rewrite', { default: notYet('AT-004.64') });
atTest('AT-004.65', 'the first reply asks for files while fewer than three exist', { default: notYet('AT-004.65') });
atTest('AT-004.66', 'Add a file opens a file chat that asks until the AI is ready', { default: notYet('AT-004.66') });
atTest('AT-004.67', 'file-chat answers are turns and the read is free', { default: notYet('AT-004.67') });
atTest('AT-004.68', 'the file is read in the background into a digest', { default: notYet('AT-004.68') });
atTest('AT-004.69', 'a large file is read in parts into one digest', { default: notYet('AT-004.69') });
atTest('AT-004.70', 'three Discovery files while the project is not funded', { default: notYet('AT-004.70') });
atTest('AT-004.71', 'the Questions card shows states and jumps to the chat', { default: notYet('AT-004.71') });
atTest('AT-004.72', 'one usage bar and a growing message box', { default: notYet('AT-004.72') });
atTest('AT-004.73', 'the brief opens as a side panel on desktop and a full-screen panel on phone', { default: notYet('AT-004.73') });
