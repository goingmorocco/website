import { JSDOM } from "jsdom";
import axeSource from "axe-core/axe.min.js?raw";
import fs from "node:fs";
import path from "node:path";
import fsExtra from "node:fs";

const distDir = path.resolve("dist");

function findHtmlFiles(dir) {
  let results = [];
  for (const entry of fsExtra.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(findHtmlFiles(full));
    else if (entry.name.endsWith(".html")) results.push(full);
  }
  return results;
}

const axeSourceText = fs.readFileSync(
  path.resolve("node_modules/axe-core/axe.min.js"),
  "utf-8"
);

const files = findHtmlFiles(distDir);
let totalViolations = 0;

for (const file of files) {
  const html = fs.readFileSync(file, "utf-8");
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://goingmorocco.com/" });
  dom.window.eval(axeSourceText);

  const results = await dom.window.axe.run(dom.window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
  });

  const rel = path.relative(distDir, file);
  if (results.violations.length === 0) {
    console.log(`OK   ${rel}`);
  } else {
    console.log(`FAIL ${rel}`);
    for (const v of results.violations) {
      console.log(`   - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
      totalViolations += v.nodes.length;
    }
  }
  dom.window.close();
}

console.log(`\n${files.length} pages checked, ${totalViolations} total violation instances.`);
process.exit(totalViolations > 0 ? 1 : 0);
