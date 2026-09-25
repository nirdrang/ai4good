import { FileText, Upload, X } from "lucide-react";
import type { ScreenProps } from "./components";

export function DiscoveryReferences({
  state,
  setState,
  notify,
}: Pick<ScreenProps, "state" | "setState" | "notify">) {
  return (
    <section
      className="panel reference-panel discovery-references"
      aria-label="Discovery reference files"
    >
      <details>
        <summary>
          Reference files · {state.files.filter((file) => file.discoveryVisible).length} shared with
          AI
        </summary>
        <p className="small muted">
          Choose which files the Discovery assistant may read. Use blank forms or fictional
          examples.
        </p>
        <label className="upload-control">
          <Upload size={16} /> Add reference files
          <input
            type="file"
            multiple
            data-testid="discovery-file-upload"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []).map((file) => ({
                name: file.name,
                size: file.size,
                discoveryVisible: false,
              }));
              setState((current) => ({ ...current, files: [...current.files, ...files] }));
              event.target.value = "";
              notify(
                "File names saved. Choose which files Discovery can use. The mock does not upload file contents.",
              );
            }}
          />
        </label>
        <ul className="file-list">
          {state.files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <FileText size={14} />
              <label className="checkbox-field grow">
                <input
                  type="checkbox"
                  checked={file.discoveryVisible ?? false}
                  data-testid="discovery-file-visibility"
                  onChange={(event) => {
                    const visible = event.target.checked;
                    setState((current) => ({
                      ...current,
                      files: current.files.map((entry, i) =>
                        i === index ? { ...entry, discoveryVisible: visible } : entry,
                      ),
                    }));
                  }}
                />
                <span>
                  {file.name}
                  <small>
                    {file.discoveryVisible
                      ? "Discovery can read this file"
                      : "Not shared with Discovery"}
                  </small>
                </span>
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    files: current.files.filter((_, i) => i !== index),
                  }))
                }
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <p className="small muted">
          Adding files and changing visibility use no turns. This fixture stores names and sizes
          only.
        </p>
      </details>
    </section>
  );
}
