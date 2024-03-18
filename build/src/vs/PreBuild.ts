import * as ssh from "../lib/SSH.ts";
import * as versioning from "../lib/Versioning.ts";
import * as teamCity from "../lib/TeamCity.ts";
import fs from "fs";

export default function (vsRootPath: string) {
	const remoteLicenseFile = "/home/web/.codestream/licenses/teamdev.DotNetBrowser.licenses.txt";
	const localReleaseLicenseFile = `${vsRootPath}/licenses/Release/teamdev.licenses`;
	const localDebugLicenseFile = `${vsRootPath}/licenses/Debug/teamdev.licenses`;

	ssh.copyRemoteFile(remoteLicenseFile, localDebugLicenseFile);
	ssh.copyRemoteFile(remoteLicenseFile, localReleaseLicenseFile);

	if (!fs.existsSync(localDebugLicenseFile)) {
		throw new Error(`localDebugLicenseFile Not Found - ${localDebugLicenseFile}`);
	}

	if (!fs.existsSync(localReleaseLicenseFile)) {
		throw new Error(`localReleaseLicenseFile Not Found - ${localReleaseLicenseFile}`);
	}

	if (!fs.existsSync(`${vsRootPath}/src/CodeStream.VisualStudio.Vsix.x64/dist/agent`)) {
		fs.mkdirSync(`${vsRootPath}/src/CodeStream.VisualStudio.Vsix.x64/dist/agent`, {
			recursive: true
		});
	}

	const supplementalSoftwarePath = teamCity.getSupplmentalSoftwareDirectory();

	fs.copyFileSync(
		`${supplementalSoftwarePath}/node/node-v18.15.0-win-x64/node.exe`,
		`${vsRootPath}/src/CodeStream.VisualStudio.Vsix.x64/dist/agent/node.exe`
	);

	const buildNumber = teamCity.getBuildNumber();
	const currentVersion = versioning.getVersionVS();

	teamCity.setVersion(`${currentVersion}.${buildNumber}`);
	versioning.setVersion(vsRootPath, "vs", `${currentVersion}.${buildNumber}`); // ALL VS files will now have major.minor.patch.build
}
