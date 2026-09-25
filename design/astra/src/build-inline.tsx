import { createRoot } from "react-dom/client";
import { ProjectBuild } from "./ProjectBuild";

type PreviewStage = "Before first pull" | "First requirement materialized";
declare const Tweak:
  | undefined
  | (new (options: { container: HTMLElement; onChange: () => void }) => {
      addSelect: (
        target: { stage: PreviewStage },
        property: "stage",
        options: { label: string; options: PreviewStage[] },
      ) => void;
    });

const container = document.getElementById("ag-project-hierarchy");
const mount = document.getElementById("ag-project-hierarchy-main");
if (container && mount) {
  const root = createRoot(mount);
  const preview: { stage: PreviewStage } = {
    stage:
      container.dataset.stage === "before" ? "Before first pull" : "First requirement materialized",
  };
  const render = () =>
    root.render(
      <ProjectBuild
        key={preview.stage}
        initialMaterialized={preview.stage === "First requirement materialized"}
        notify={() => {}}
      />,
    );
  render();
  if (typeof Tweak !== "undefined") {
    const tweak = new Tweak({ container, onChange: render });
    tweak.addSelect(preview, "stage", {
      label: "Starting point",
      options: ["First requirement materialized", "Before first pull"],
    });
  }
}
