import * as consoul from "./Consoul.ts";

export function setVersion(version: string): void {
  consoul.info(`##teamcity[buildNumber '${version}']`);
}
