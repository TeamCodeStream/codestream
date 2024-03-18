import * as consoul from "./Consoul.ts";

export function getCheckoutDirectory(): string {
  const checkoutDirectory = process.env.TC_CHECKOUT_DIR;

  if (checkoutDirectory) {
    return checkoutDirectory;
  }

  consoul.error(`Unable to locate process.env.TC_CHECKOUT_DIR`);
  process.exit(1);
}

export function getBuildNumber(): string {
  return process.env.build_counter || "0";
}

export function setVersion(version: string): void {
  consoul.info(`##teamcity[buildNumber '${version}']`);
}

export function isTeamCity(): boolean {
  return isCI() || isPI();
}

export function isCI(): boolean {
  try {
    return process.env.IS_CI === "1";
  } catch (error) {
    consoul.error(JSON.stringify(error));
    process.exit(1);
  }
}

export function isPI(): boolean {
  try {
    return process.env.IS_PI === "1";
  } catch (error) {
    consoul.error(JSON.stringify(error));
    process.exit(1);
  }
}
