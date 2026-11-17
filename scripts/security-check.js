import fs from "node:fs";
import path from "node:path";

const EXCLUDE_DIRS = new Set(["node_modules", "coverage", ".git", ".agents"]);
const DANGEROUS_PATTERNS = [
  { name: "Google API Key", regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: "eval() usage", regex: /\beval\s*\(/ },
  { name: "innerHTML assignment", regex: /\.innerHTML\s*=/ }
];

function shouldScanFile(fileName) {
  if (fileName === "security-check.js" || !fileName.endsWith(".js")) {
    return false;
  }
  return true;
}

function collectJsFiles(dirPath, fileList = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        collectJsFiles(path.join(dirPath, entry.name), fileList);
      }
    } else if (shouldScanFile(entry.name)) {
      fileList.push(path.join(dirPath, entry.name));
    }
  }
  return fileList;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.regex.test(content)) {
      violations.push({ file: filePath, issue: pattern.name });
    }
  }
  return violations;
}

function runSecurityCheck() {
  const targetDir = process.cwd();
  const files = collectJsFiles(targetDir);
  const allViolations = [];

  for (const file of files) {
    const issues = scanFile(file);
    allViolations.push(...issues);
  }

  if (allViolations.length > 0) {
    process.stderr.write(`Security check failed! Found ${allViolations.length} issue(s):\n`);
    for (const v of allViolations) {
      process.stderr.write(`- [${v.issue}] in ${v.file}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`Security check passed: ${files.length} files scanned with 0 violations.\n`);
}

runSecurityCheck();
