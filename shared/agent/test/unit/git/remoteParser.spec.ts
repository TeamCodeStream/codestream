import { GitRemoteParser } from "../../../src/git/parsers/remoteParser";

const remoteData = [
	"origin\tgit@source.datanerd.us:codestream-demo/telco-microservices.git (fetch)\norigin\tgit@source.datanerd.us:codestream-demo/telco-microservices.git (push)\n",
	"origin\thttps://source.datanerd.us/codestream/clm-demo-js-node (fetch)\norigin\thttps://source.datanerd.us/codestream/clm-demo-js-node (push)\n",
	"upstream\tgit@source.datanerd.us:username/clm-demo-java-spring.git (fetch)\nusername\tgit@source.datanerd.us:username/clm-demo-java-spring.git (push)\norigin\thttps://source.datanerd.us/codestream/clm-demo-java-spring (fetch)\norigin\thttps://source.datanerd.us/codestream/clm-demo-java-spring (push)\n",
];

describe("GitRemoteParser.parse", () => {
	it("parses case 1", async () => {
		const data = remoteData[0];
		const result = await GitRemoteParser.parse(data, "/my/path");
		expect(result.length).toBe(1);
		expect(result[0].types.length).toBe(2);
		expect(result[0].path).toBe("codestream-demo/telco-microservices");
	});

	it("parses case 2", async () => {
		const data = remoteData[1];
		const result = await GitRemoteParser.parse(data, "/my/path");
		expect(result.length).toBe(1);
		expect(result[0].types.length).toBe(2);
		expect(result[0].path).toBe("codestream/clm-demo-js-node");
		console.log(JSON.stringify(result, null, 2));
	});

	it("parses case 3", async () => {
		const data = remoteData[2];
		const result = await GitRemoteParser.parse(data, "/my/path");
		expect(result.length).toBe(2);
		expect(result[0].types.length).toBe(2);
		expect(result[0].name).toBe("upstream");
		expect(result[1].types.length).toBe(2);
		expect(result[1].name).toBe("origin");
		expect(result[0].path).toBe("username/clm-demo-java-spring");
		expect(result[1].path).toBe("codestream/clm-demo-java-spring");
	});

	it("can parse in parallel", async () => {
		const lotsaData = remoteData.concat(remoteData.concat(remoteData.concat(remoteData)));
		const results = await Promise.all(
			lotsaData.map(data => GitRemoteParser.parse(data, "/my/path"))
		);
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.length === 0) {
				console.warn(`Failing on empty result at index ${i}`);
			}
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].name).toBeDefined();
		}
	});
});
