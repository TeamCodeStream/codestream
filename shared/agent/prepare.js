const isProduction = process.env.NODE_ENV === "production";
const isCi = process.env.TEAMCITY_VERSION !== undefined;

if (!isCi && !isProduction) {
	console.log("Installing husky...");
	process.chdir("../../");
	require("husky").install();
} else {
	console.log("Skipping husky install");
}
