import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const budgetPath = resolve(projectRoot, ".lint-budget.json");
const budget = JSON.parse(readFileSync(budgetPath, "utf8"));

const eslint = new ESLint({ cwd: projectRoot });
const reports = await eslint.lintFiles(["."]);

const totals = reports.reduce(
  (counts, report) => ({
    errors: counts.errors + report.errorCount,
    warnings: counts.warnings + report.warningCount,
  }),
  { errors: 0, warnings: 0 },
);

if (totals.errors > 0) {
  console.error(`ESLint budget failed: ${totals.errors} error(s), ${totals.warnings} warning(s).`);
  process.exit(1);
}

if (totals.warnings > budget.maxWarnings) {
  console.error(
    `ESLint warning budget failed: ${totals.warnings} warning(s), budget is ${budget.maxWarnings}. Fix new warnings or lower the budget after cleanup.`,
  );
  process.exit(1);
}

console.log(`ESLint budget passed: ${totals.errors} error(s), ${totals.warnings}/${budget.maxWarnings} warning(s).`);
