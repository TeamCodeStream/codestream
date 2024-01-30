/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	globalSetup: "./jest.global.js",
	preset: "ts-jest",
	reporters: ["default", "jest-teamcity"], // jest-teamcity OK here since it only works when TEAMCITY_VERSION env var set
	testEnvironment: "node"
};
