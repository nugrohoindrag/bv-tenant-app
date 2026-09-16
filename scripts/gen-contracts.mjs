// Sinkron kontrak dari monorepo ../buildingvision: tokens.css (design-tokens/tokens.json) & status-map.ts (contracts/status-map.yaml).
// Sumber kebenaran tetap monorepo; jangan edit file GENERATED manual. Jalankan: npm run gen [-- ../buildingvision]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", process.argv[2] || "../buildingvision");
const tokens = JSON.parse(fs.readFileSync(path.join(root, "design-tokens/tokens.json"), "utf8")).bv;
const statusMap = YAML.parse(fs.readFileSync(path.join(root, "contracts/status-map.yaml"), "utf8"));

const header = "/* GENERATED — jangan edit manual. Sumber: buildingvision/design-tokens/tokens.json. Jalankan `npm run gen`. */\n";
let css = header + ":root {\n";
for (const group of ["brand", "success", "warning", "critical", "info", "neutral"]) {
  for (const [k, v] of Object.entries(tokens[group])) css += `  --bv-${group}-${k}: ${v.$value};\n`;
}
for (const [k, v] of Object.entries(tokens.surface)) css += `  --bv-surface-${k}: ${v.$value};\n`;
for (const [k, v] of Object.entries(tokens.space)) css += `  --bv-space-${k}: ${v};\n`;
for (const [k, v] of Object.entries(tokens.radius)) css += `  --bv-radius-${k}: ${v};\n`;
for (const [k, v] of Object.entries(tokens.shadow)) css += `  --bv-shadow-${k}: ${v};\n`;
css += `  --bv-font-sans: ${tokens.font.sans};\n  --bv-font-mono: ${tokens.font.mono};\n`;
for (const [k, v] of Object.entries(tokens.type)) css += `  --bv-type-${k}-size: ${v.size}; --bv-type-${k}-line: ${v.line}; --bv-type-${k}-weight: ${v.weight};\n`;
css += "}\n";
fs.writeFileSync(path.join(here, "../src/styles/tokens.css"), css);

// Hanya object yang relevan untuk tenant.
const groups = ["service_request", "service_request_tenant", "booking", "visitor", "invoice", "payment"].filter((g) => statusMap[g]);
let ts = "// GENERATED — jangan edit manual. Sumber: buildingvision/contracts/status-map.yaml. Jalankan `npm run gen`.\n";
ts += `export type Semantic = "success" | "warning" | "critical" | "info" | "neutral";\nexport type Variant = "solid" | "soft" | "outline";\n`;
ts += `export interface StatusDef { label_id: string; label_en: string; semantic: Semantic; variant: Variant; icon?: string }\n`;
ts += `export type ObjectType = ${groups.map((g) => JSON.stringify(g)).join(" | ")};\n`;
ts += "export const statusMap: Record<ObjectType, Record<string, StatusDef>> = " + JSON.stringify(Object.fromEntries(groups.map((g) => [g, statusMap[g]])), null, 2) + " as const;\n";
ts += `export function statusDef(objectType: ObjectType, status: string): StatusDef | undefined {\n  return statusMap[objectType]?.[status];\n}\n`;
fs.writeFileSync(path.join(here, "../src/lib/status-map.ts"), ts);
console.log("generated src/styles/tokens.css, src/lib/status-map.ts from", root);
