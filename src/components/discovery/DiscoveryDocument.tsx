import type { BriefSnapshot, DiscoveryFile } from "@/lib/discovery-stream";
import { IMPORTANCE, SCREEN, TEXT } from "./a11y";
import { fileTookLine, openForReview, reviewSections } from "./model";

export function DiscoveryDocument({
  projectTitle,
  brief,
  files,
}: {
  projectTitle: string;
  brief: BriefSnapshot;
  files: readonly DiscoveryFile[];
}) {
  const open = openForReview(brief);
  return (
    <section role={SCREEN.document.role} aria-label={SCREEN.document.name} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{TEXT.review.title(projectTitle)}</h1>
        <p className="text-sm text-muted-foreground">{TEXT.revision(brief.revision)}</p>
      </div>
      {reviewSections(brief).map((section) => (
        <div key={section.id} className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-semibold">{section.title}</h2>
          <p className="whitespace-pre-line break-words text-sm">{section.text}</p>
          <p className="text-sm text-muted-foreground">{section.source}</p>
        </div>
      ))}
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-base font-semibold">{TEXT.review.openQuestions}</h2>
        <ul className="flex flex-col gap-2">
          {open.map((item) => (
            <li key={item.topicId} className="break-words text-sm">
              {item.topicTitle}. {IMPORTANCE[item.importance]}. {item.why}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-base font-semibold">Your files</h2>
        {files.map((file) => (
          <p key={file.id} className="break-words text-sm">
            {fileTookLine(file)}
          </p>
        ))}
      </div>
      {brief.dataTier ? <p className="text-sm">{TEXT.dataTier[brief.dataTier.tier]}</p> : null}
      {brief.fit ? <p className="text-sm">{TEXT.fit[brief.fit.verdict]}</p> : null}
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-base font-semibold">{TEXT.review.cause}</h2>
        {brief.causeLabels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{TEXT.review.noCause}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {brief.causeLabels.map((label) => (
              <li key={label} className="text-sm">
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
