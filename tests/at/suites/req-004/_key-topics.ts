import { expect } from 'vitest';
import type { DiscoverySut, Session } from './_contract.ts';

export async function agreeKeyTopics(sut: DiscoverySut, session: Session, organizationId: string, projectId: string): Promise<void> {
  for (;;) {
    const read = await sut.readConversation(session, projectId);
    if (!read.ok || !read.value.brief) throw new Error('Discovery has no live brief.');
    const brief = read.value.brief;
    const open = brief.topics.find((topic) => topic.key === true && (topic.state.kind !== 'agreed' || topic.needsReview === true));
    if (open === undefined) return;
    expect(await sut.briefAction(session, { organizationId, projectId, action: 'accept', topicId: open.id, baseRevision: brief.revision }))
      .toMatchObject({ ok: true });
  }
}
