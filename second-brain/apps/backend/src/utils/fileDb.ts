// apps/backend/src/utils/fileDb.ts

import * as fs from "fs";
import * as path from "path";

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

function readJSON(filename: string) {
  const file = path.join(dataDir, filename);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJSON(filename: string, data: any) {
  const file = path.join(dataDir, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export { readJSON, writeJSON };
