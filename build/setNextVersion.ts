import * as consoul from "./src/lib/Consoul.ts";
import { setVersion, validateVersion } from "./src/lib/Versioning.ts";
import path from "path";

const args = process.argv.slice(2);

if (args.length !== 1) {
  consoul.error(`Incorrect number of parameters to script`);
  consoul.error();
  consoul.error(`Example Usage`);
  consoul.error(`  node setNextVersion.mjs 15.0.5`);
  consoul.error();
  process.exit(1);
}

const version = args[0];

const products = [
  { code: "vscode", name: "Visual Studio Code" },
  { code: "jb", name: "JetBrains" },
  { code: "vs", name: "Visual Studio" },
];

if (process.env.IS_CI === "1") {
  consoul.error(
    "This script was designed to run locally and the changes committed by an individual, not as part of a CI process.",
  );
  process.exit(1);
}

const checkoutPath = path.resolve(`${process.cwd()}`, '..');

try {
  validateVersion(version);
} catch (err) {
  throw err;
}

for (let product of products) {
  consoul.info(`Updating version for ${product.name} to ${version}...`);
  setVersion(`${checkoutPath}/${product.code}`, product.code, version);
  consoul.info();
}
