import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const base = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = process.argv[2];
if (!destination) throw new Error("Provide the absolute path for the inline preview.");
const result = await Bun.build({
  entrypoints: [resolve(base, "src/build-inline.tsx")],
  target: "browser",
  format: "iife",
  minify: true,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
if (!result.success) throw new Error(result.logs.join("\n"));
const script = result.outputs.find((output) => output.kind === "entry-point");
if (!script) throw new Error("No preview script was generated.");
const [template, css, js] = await Promise.all([
  readFile(resolve(base, "build-inline-template.html"), "utf8"),
  readFile(resolve(base, "src/project-build.css"), "utf8"),
  script.text(),
]);
const scopedCss = css
  .replaceAll(".project-build", "#ag-project-hierarchy .project-build")
  .replace(/\.main-content\.build-content\s*\{[^}]*\}/g, "");
const html = template
  .replace("/* BUILD_STYLES */", () => scopedCss)
  .replace("/* BUILD_SCRIPT */", () => js.replaceAll("</script", "<\\/script"));
if (Buffer.byteLength(html) > 1_000_000) throw new Error("The inline preview is too large.");
await writeFile(destination, html, "utf8");
const saved = await readFile(destination, "utf8");
if (saved !== html) throw new Error("The saved preview differs from the generated preview.");
new Function(js);
console.log(
  JSON.stringify({ destination, bytes: Buffer.byteLength(saved), scriptSyntax: "valid" }),
);
