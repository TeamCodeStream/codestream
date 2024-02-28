import { FetchCodeErrorsResponse } from "@codestream/protocols/agent";
import {
	createdAt,
	modifiedAt,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";

export function getCodeErrorsResponse(
	postId: string,
	streamId: string,
	codeErrorId: string,
	repoId: string
): FetchCodeErrorsResponse {
	return {
		codeErrors: [
			{
				version: 3,
				deactivated: false,
				numReplies: 0,
				createdAt: createdAt,
				modifiedAt: modifiedAt,
				accountId: 11879688,
				objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
				objectType: "errorGroup",
				title: "TypeError",
				text: "Cannae read prooperties of undefined (reading 'get')",
				stackTraces: [
					{
						text: "TypeError: Cannae read prooperties of undefined (reading 'get')\n    at /app/src/data/usersRepository.js:51:23\n    at Array.reduce (<anonymous>)\n    at countUsersByState (/app/src/data/usersRepository.js:50:19)\n    at userStateReport (/app/src/data/usersRepository.js:57:10)\n    at fetchUserStateReport (/app/src/controllers/usersController.js:11:16)\n    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1324:22)\n    at AsyncLocalStorage.run (node:async_hooks:346:14)\n    at AsyncLocalContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js:65:36)\n    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1314:25)\n    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:956:20)",
						lines: [
							{
								fileFullPath:
									"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/data/usersRepository.js",
								method: "<unknown>",
								fullMethod: "<unknown>",
								arguments: [],
								line: 51,
								column: 23,
								fileRelativePath: "app/src/data/usersRepository.js",
							},
							{
								fileFullPath: "<anonymous>",
								method: "reduce",
								namespace: "Array",
								fullMethod: "Array.reduce",
								arguments: [],
								error: "Unable to find matching file for path <anonymous>",
							},
							{
								fileFullPath:
									"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/data/usersRepository.js",
								method: "countUsersByState",
								fullMethod: "countUsersByState",
								arguments: [],
								line: 50,
								column: 19,
								fileRelativePath: "app/src/data/usersRepository.js",
							},
							{
								fileFullPath:
									"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/data/usersRepository.js",
								method: "userStateReport",
								fullMethod: "userStateReport",
								arguments: [],
								line: 57,
								column: 10,
								fileRelativePath: "app/src/data/usersRepository.js",
							},
							{
								fileFullPath:
									"/Users/dsellars/workspace/clm2/clm-demo-js-node/app/src/controllers/usersController.js",
								method: "fetchUserStateReport",
								fullMethod: "fetchUserStateReport",
								arguments: [],
								line: 11,
								column: 16,
								fileRelativePath: "app/src/controllers/usersController.js",
							},
							{
								fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
								method: "runInContextCb",
								fullMethod: "runInContextCb",
								arguments: [],
								line: 1324,
								column: 22,
								error:
									"Unable to find matching file for path /app/node_modules/newrelic/lib/shim/shim.js",
							},
							{
								fileFullPath: "node:async_hooks",
								method: "run",
								namespace: "AsyncLocalStorage",
								fullMethod: "AsyncLocalStorage.run",
								arguments: [],
								line: 346,
								column: 14,
								error: "Unable to find matching file for path node:async_hooks",
							},
							{
								fileFullPath:
									"/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js",
								method: "runInContext",
								namespace: "AsyncLocalContextManager",
								fullMethod: "AsyncLocalContextManager.runInContext",
								arguments: [],
								line: 65,
								column: 36,
								error:
									"Unable to find matching file for path /app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js",
							},
							{
								fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
								method: "applySegment",
								namespace: "WebFrameworkShim",
								fullMethod: "WebFrameworkShim.applySegment",
								arguments: [],
								line: 1314,
								column: 25,
								error:
									"Unable to find matching file for path /app/node_modules/newrelic/lib/shim/shim.js",
							},
							{
								fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
								method: "_applyRecorderSegment",
								fullMethod: "_applyRecorderSegment",
								arguments: [],
								line: 956,
								column: 20,
								error:
									"Unable to find matching file for path /app/node_modules/newrelic/lib/shim/shim.js",
							},
						],
						language: "javascript",
						header: "TypeError: Cannot read properties of undefined (reading 'get')",
						error: "Cannot read properties of undefined (reading 'get')",
						repoId: repoId,
						sha: "release-4",
						occurrenceId: "dc269712-d026-11ee-91b3-faf14c8b1a88_34668_36439",
					},
				],
				objectInfo: {
					repoId: repoId,
					remote: "https://source.datanerd.us/codestream/clm-demo-js-node",
					accountId: "11879688",
					entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNzQ5NjQy",
					entityName: "clm-demo-js-node (staging.stg-red-car)",
					hasRelatedRepos: true,
				},
				postId: postId,
				teamId: "651ed16ac2f7dee11c938922",
				streamId: streamId,
				creatorId: "652db11a7c271413e88b4ae3",
				followerIds: ["652db11a7c271413e88b4ae3"],
				permalink:
					"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/2pSPucU4QHOaEnhB6yz1eg",
				lastActivityAt: 1708457636848,
				id: codeErrorId,
			},
		],
	};
}
