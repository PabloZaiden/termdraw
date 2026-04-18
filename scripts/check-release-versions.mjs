import { readFileSync } from "node:fs";

const files = [
  "packages/opentui/package.json",
  "packages/app/package.json",
  "packages/pi/package.json",
];

const manifests = files.map((file) => ({
  file,
  json: JSON.parse(readFileSync(file, "utf8")),
}));

const versions = new Set(manifests.map(({ json }) => json.version));
if (versions.size !== 1) {
  console.error("Publishable package versions must match:");
  for (const { file, json } of manifests) {
    console.error(`- ${file}: ${json.version}`);
  }
  process.exit(1);
}

const releaseVersion = manifests[0].json.version;
const expectedDeps = new Map([
  ["packages/app/package.json", ["@termdraw/opentui"]],
  ["packages/pi/package.json", ["@termdraw/opentui"]],
]);

let failed = false;
for (const { file, json } of manifests) {
  for (const depName of expectedDeps.get(file) ?? []) {
    const actual = json.dependencies?.[depName];
    if (actual !== releaseVersion) {
      console.error(
        `${file} must pin ${depName} to ${releaseVersion}, found ${actual ?? "<missing>"}`,
      );
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Release versions are aligned at ${releaseVersion}.`);
