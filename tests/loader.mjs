// Testlar uchun Node yuklovchisi: "@/..." taxallusi, kengaytmasiz importlar va "server-only".
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(fileURLToPath(import.meta.url), "../../src");

function withExt(p) {
  for (const c of [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  // Route handler'lar uchun: connection() — testda hech narsa qilmaydi
  if (specifier === "next/server") return { url: "data:text/javascript,export async function connection() {}", shortCircuit: true };
  let target = null;
  if (specifier.startsWith("@/")) target = withExt(path.join(SRC, specifier.slice(2)));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    target = withExt(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
  }
  if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  return next(specifier, context);
}
