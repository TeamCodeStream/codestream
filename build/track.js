const https = require("https");
const { execSync } = require("child_process");

let version = process.argv[2];
const entityGuid = process.argv[3];
const NR_API_KEY = process.env.NR_API_KEY;
const ERR_EXIT_CODE = 0; // For now non-fatal exit code
const MAX_RETRIES = 3; // Set the maximum number of retries

if (!version || !entityGuid || !NR_API_KEY) {
	console.error("Missing arguments or environment variables");
	process.exit(ERR_EXIT_CODE);
}

version = version.toLowerCase().trim();

let commit;
try {
	commit = execSync("git rev-parse HEAD").toString().trim();
} catch (error) {
	console.error("Error getting commit from git");
	process.exit(ERR_EXIT_CODE);
}

console.log(
	`Sending deployment event to New Relic for version ${version}, entityGuid ${entityGuid}, commit ${commit}`
);

const DATA = `{"query": "mutation { changeTrackingCreateDeployment( deployment: { version: \\"${version}\\", entityGuid: \\"${entityGuid}\\", commit: \\"${commit}\\" } ) { deploymentId entityGuid } }"}`;

const options = {
	hostname: "staging-api.newrelic.com",
	path: "/graphql",
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
		"Api-Key": NR_API_KEY,
		"NewRelic-Requesting-Services": "CodeStream"
	}
};

function sendRequest(retries) {
	const req = https.request(options, res => {
		let data = "";

		res.on("data", chunk => {
			data += chunk;
		});

		res.on("end", () => {
			if (res.statusCode < 200 || res.statusCode >= 400) {
				console.error("Error sending deployment event to New Relic");
				console.error(`HTTP Status: ${res.statusCode}`);
				console.error(`Response: ${data}`);
				process.exit(ERR_EXIT_CODE);
			} else {
				console.log("Deployment event sent to New Relic");
			}
		});
	});

	req.on("error", error => {
		if (retries > 0) {
			console.log("Retrying request...");
			sendRequest(retries - 1);
		} else {
			console.error("Error sending deployment event to New Relic");
			console.error(`Response: ${error.message}`);
			process.exit(ERR_EXIT_CODE);
		}
	});

	req.write(DATA);
	req.end();
}

sendRequest(MAX_RETRIES);
