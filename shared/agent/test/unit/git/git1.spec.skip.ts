// import { expect } from "chai";
// import { GitRemoteParser } from "../../../src/git/parsers/remoteParser";
// import { describe, it } from "mocha";

// describe("git.spec.ts", () => {
// 	describe("GitRemoteParser", () => {
// 		/*
// 		// need a .ssh/config with the following

// 		Host beer.github.com
// 		HostName github.com
// 		User brian
// 		IdentityFile ~/.ssh/id_rsa

// 		Host sub.gitlab.com
// 		HostName gitlab.com
// 		User brian
// 		IdentityFile ~/.ssh/id_rsa

// 		*/
// 		// it("can match on an ssh github remote", async function() {
// 		// 	const data = `origin  git@beer.github.com:TeamCodeStream/codestream.git (fetch)
// 		// 	origin  git@beer.github.com:TeamCodeStream/codestream.git (push)`;
// 		// 	const parsed = await GitRemoteParser.parse(data, "c:\\users\\anything");
// 		// 	expect(parsed[0].domain).toEqual("github.com");
// 		// });
// 		// it("can match on an ssh gitlab remote", async function() {
// 		// 	const data = `origin  git@sub.gitlab.com:TeamCodeStream/codestream/codestream-vs.git (fetch)
// 		// 	origin  git@sub.gitlab.com:TeamCodeStream/codestream/codestream-vs.git (push)`;
// 		// 	const parsed = await GitRemoteParser.parse(data, "c:\\users\\anything");
// 		// 	console.log(parsed);
// 		// 	expect(parsed[0].domain).toEqual("gitlab.com");
// 		// 	expect(parsed[0].normalizedUrl).toEqual(
// 		// 		"gitlab.com/teamcodestream/codestream/codestream-vs"
// 		// 	);
// 		// });
// 		// it("can match on an http github remote", async function() {
// 		// 	const data =
// 		// 		"origin\thttps://github.com/TeamCodeStream/codestream (fetch)\norigin\thttps://github.com/TeamCodeStream/codestream (push)\n";
// 		// 	const parsed = await GitRemoteParser.parse(data, "c:\\users\\anything");
// 		// 	console.log(parsed);
// 		// 	expect(parsed[0].domain).toEqual("github.com");
// 		// 	expect(parsed[0].normalizedUrl).toEqual("github.com/teamcodestream/codestream");
// 		// });
// 	});
// });
