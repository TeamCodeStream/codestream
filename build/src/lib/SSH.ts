import { execSync } from "child_process";
import * as consoul from "./Consoul.ts";

const server = "teamcity.cdstrm.dev";
const username = "web";
const keyfile = "C:/Users/Administrator/.ssh/id_rsa";

export function copyRemoteFile(remoteFile: string, localFile: string) {
	consoul.info(`Downloading ${remoteFile} to ${localFile}...`);

	execSync(`scp -i ${keyfile} ${username}@${server}:${remoteFile} ${localFile}`, {
		stdio: "inherit"
	});
}
