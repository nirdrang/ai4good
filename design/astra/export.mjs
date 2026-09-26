import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const project = path.resolve(root, "../..");
const manifest = JSON.parse(await readFile(path.join(root, "screens.json"), "utf8"));
await readFile(path.join(root, "dist/index.html"));
const destination = path.join(
  root,
  "exports",
  `astra-${new Date().toISOString().replaceAll(":", "-")}`,
);
await mkdir(destination, { recursive: true });
await cp(path.join(root, "dist"), path.join(destination, "preview"), { recursive: true });
await cp(path.join(root, "src"), path.join(destination, "astra-source"), { recursive: true });
await cp(path.join(project, "src/styles.css"), path.join(destination, "application-theme.css"));
await cp(path.join(root, "screens.json"), path.join(destination, "screens.json"));
await cp(path.join(root, "discovery-review.md"), path.join(destination, "discovery-review.md"));
await cp(path.join(root, "build-review.md"), path.join(destination, "build-review.md"));
for (const name of ["design-review.html", "design-review-preview.html", "design-review.md"]) {
  await cp(path.join(root, name), path.join(destination, name));
}
await cp(
  path.join(project, "design/design-ui-contract.md"),
  path.join(destination, "design-ui-contract.md"),
);
await cp(path.join(root, "fixtures"), path.join(destination, "fixtures"), { recursive: true });
await cp(
  path.join(project, "design/discovery-ui-contract.md"),
  path.join(destination, "discovery-ui-contract.md"),
);
await cp(
  path.join(project, "design/ui-ux-instructions.md"),
  path.join(destination, "ui-ux-instructions.md"),
);
await mkdir(path.join(destination, "claude-baseline"));
const hashes = {};
for (const name of new Set(
  manifest.screens
    .filter((screen) => screen.sourceAuthor !== "Astra")
    .map((screen) => screen.source),
)) {
  const file = path.join(project, "design/screens", name);
  await cp(file, path.join(destination, "claude-baseline", name));
  hashes[name] = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}
await writeFile(
  path.join(destination, "claude-baseline-sha256.json"),
  JSON.stringify(hashes, null, 2) + "\n",
);
await writeFile(
  path.join(destination, "README.md"),
  `# Astra design handoff\n\nAuthor: Astra. Runtime: fixtures only. Review status is recorded per screen in screens.json.\n\nServe the preview folder with a local static server. For example:\n\n    python -m http.server 4310 --bind 127.0.0.1 --directory preview\n\nOpen http://127.0.0.1:4310/. Module scripts require an HTTP server.\n\nThe preview and astra-source folders are Astra work.\nThe claude-baseline folder contains unchanged Claude Design references, with SHA-256 checksums.\nThe application-theme file belongs to the existing application.\nRead screens.json and the Discovery and Design contracts before revising the design. The Design workspace is accepted for implementation. Open design-review-preview.html to inspect that reviewed mock.\n\nPreserve dependent questions, editable answers, explicit NGO confirmation, and free-first USD funding.\nReturn a revision to design/astra/ in the original repository. Astra and Claude share that one mock.\nName the author of the revision in the screen's review record. Record visual changes and proposed behavior changes separately.\nThis export does not contain real customer data, credentials, or backend connections.\n`,
);
console.log(destination);
