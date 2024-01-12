import fs from "fs";
import * as consoul from "./Consoul.ts";
import path from "path";

export function getVersion(packageJsonFile: string): string | undefined {
  try {
    const fileContents = fs.readFileSync(packageJsonFile, "utf-8");
    const versionRegEx = /"version":\s*"([^"]+)",/g;
    const match = versionRegEx.exec(fileContents);

    if (match) {
      return match[1];
    }
    return undefined;
  } catch (err) {
    throw new Error(
      `An error occurred trying to parse the version from '${packageJsonFile}`,
    );
  }
}

export function validateVersion(version: string): number[] {
  const versionParts = version.split(".");

  let major = parseInt(versionParts[0]);
  let minor = parseInt(versionParts[1]);
  let patch = parseInt(versionParts[2]);
  let build = parseInt(versionParts[3]);

  if (major === undefined || Number.isNaN(major) || major === null) {
    throw new Error(
      `Unable to properly validate the 'major' part of the version number in '${version}'. Please ensure all parts are numeric and seperated by periods.`,
    );
  }

  if (minor === undefined || Number.isNaN(minor) || minor === null) {
    throw new Error(
      `Unable to properly validate the 'minor' part of the version number in '${version}'. Please ensure all parts are numeric and seperated by periods.`,
    );
  }

  if (patch === undefined || Number.isNaN(patch) || patch === null) {
    throw new Error(
      `Unable to properly validate the 'patch' part of the version number in '${version}'. Please ensure all parts are numeric and seperated by periods.`,
    );
  }

  if (!build) {
    return [major, minor, patch];
  } else {
    return [major, minor, patch, build];
  }
}

export function incrementVersion(
  oldVersion: string,
  bumpStyle: string,
  buildNumber: number,
): string {
  let major: number, minor: number, patch: number;

  try {
    [major, minor, patch] = validateVersion(oldVersion);
  } catch (err) {
    throw err;
  }

  switch (bumpStyle) {
    case "major":
      major += 1;
      break;
    case "minor":
      minor += 1;
      break;
    case "patch":
      patch += 1;
      break;
  }

  if (buildNumber) {
    return `${major}.${minor}.${patch}.${buildNumber}`;
  } else {
    return `${major}.${minor}.${patch}`;
  }
}

function _recursiveFindFiles(
  startPath: string,
  filter: string,
  version: string,
  callback: {
    (filename: string, version: string): void;
  },
): void {
  if (!fs.existsSync(startPath)) {
    throw new Error(`Unable to locating starting directory '${startPath}'`);
  }

  const files = fs.readdirSync(startPath);

  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);

    if (stat.isDirectory()) {
      _recursiveFindFiles(filename, filter, version, callback); //recurse
    } else if (filename.indexOf(filter) >= 0) {
      callback(filename, version);
    }
  }
}

function _updateAssemblyInfo(filename: string, version: string): void {
  try {
    const fileContents = fs.readFileSync(filename, "utf-8");

    const versionRegEx = /\[assembly: AssemblyVersion\("([^"]+)"\)\]/g;
    const fileVersionRegEx = /\[assembly: AssemblyFileVersion\("([^"]+)"\)\]/g;

    let newFileContents = fileContents.replace(
      versionRegEx,
      `[assembly: AssemblyVersion("${version}")`,
    );
    newFileContents = newFileContents.replace(
      fileVersionRegEx,
      `[assembly: AssemblyFileVersion("${version}")`,
    );

    fs.writeFileSync(filename, newFileContents);
    consoul.success(
      `Successfully updated '${filename}' with new version '${version}'`,
    );
  } catch (err) {
    consoul.error(
      `An error occurred trying to save the version ${version} into '${filename}' -`,
    );
    throw err;
  }
}

function _updateVsixManifest(filename: string, version: string): void {
  try {
    const fileContents = fs.readFileSync(filename, "utf-8");

    const versionRegEx = /(<Identity[^>]*Version=")([^"]*)(")/g;

    const newFileContents = fileContents.replace(
      versionRegEx,
      `$1${version}$3`,
    );

    fs.writeFileSync(filename, newFileContents);
    consoul.success(
      `Successfully updated '${filename}' with new version '${version}'`,
    );
  } catch (err) {
    consoul.error(
      `An error occurred trying to save the version ${version} into '${filename}' -`,
    );
    throw err;
  }
}

function _updateSolutionInfo(filename: string, version: string): void {
  try {
    const fileContents = fs.readFileSync(filename, "utf-8");

    const versionRegEx = /(Version\s*=\s*")([^"]*)(")/g;

    const newFileContents = fileContents.replace(
      versionRegEx,
      `$1${version}$3`,
    );

    fs.writeFileSync(filename, newFileContents);
    consoul.success(
      `Successfully updated '${filename}' with new version '${version}'`,
    );
  } catch (err) {
    consoul.error(
      `An error occurred trying to save the version ${version} into '${filename}' -`,
    );
    throw err;
  }
}

function _setVersion(packageJsonFile: string, version: string): void {
  try {
    const fileContents = fs.readFileSync(packageJsonFile, "utf-8");
    const versionRegEx = /("version":\s*)"([^"]+)",/g;
    const newFileContents = fileContents.replace(
      versionRegEx,
      `$1"${version}",`,
    );
    fs.writeFileSync(packageJsonFile, newFileContents);
    consoul.success(
      `Successfully updated '${packageJsonFile}' with new version '${version}'`,
    );
  } catch (err) {
    consoul.error(
      `An error occurred trying to save the version ${version} into '${packageJsonFile}' -`,
    );
    throw err;
  }
}

function setVersionVSCode(version: string, productRootPath: string): void {
  try {
    _setVersion(`${productRootPath}/package.json`, version);
  } catch (err) {
    throw err;
  }
}

function setVersionJetBrains(version: string, productRootPath: string): void {
  try {
    _setVersion(`${productRootPath}/package.json`, version);
  } catch (err) {
    throw err;
  }

  const versionFile = `${productRootPath}/build.gradle`;

  try {
    const fileContents = fs.readFileSync(versionFile, "utf-8");
    const versionRegEx = /^(version\s+"[^"]+")(\s*)$/gm;
    const newFileContents = fileContents.replace(
      versionRegEx,
      `version "${version}"$2`,
    );
    fs.writeFileSync(versionFile, newFileContents);
    consoul.success(
      `Successfully updated '${versionFile}' with new version '${version}'`,
    );
  } catch (err) {
    consoul.error(
      `An error occurred trying to save the version ${version} into '${versionFile}' -`,
    );
    throw err;
  }
}

function setVersionVisualStudio(
  version: string,
  productRootPath: string,
): void {
  try {
    _setVersion(`${productRootPath}/package.json`, version);
  } catch (err) {
    throw err;
  }

  try {
    _recursiveFindFiles(
      productRootPath,
      "AssemblyInfo.cs",
      version,
      _updateAssemblyInfo,
    ); // there are a few of these, and just in case another is added, find them recursively
  } catch (err) {
    throw err;
  }

  try {
    _recursiveFindFiles(
      productRootPath,
      "source.extension.vsixmanifest",
      version,
      _updateVsixManifest,
    ); // there are a few of these, and just in case another is added, find them recursively
  } catch (err) {
    throw err;
  }

  try {
    _recursiveFindFiles(
      productRootPath,
      "SolutionInfo.cs",
      version,
      _updateSolutionInfo,
    ); // there is only one of these, but the recursive find makes it easier
  } catch (err) {
    throw err;
  }
}

export function setVersion(
  productRootPath: string,
  product: string,
  version: string,
): void {
  try {
    validateVersion(version);
  } catch (err) {
    throw err;
  }

  switch (product) {
    case "vscode":
      setVersionVSCode(version, productRootPath);
      break;
    case "jb":
      setVersionJetBrains(version, productRootPath);
      break;
    case "vs":
      setVersionVisualStudio(version, productRootPath);
      break;
  }
}
