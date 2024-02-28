// Maybe skip?
import {
	codeErrorId,
	createdAt,
	modifiedAt,
	parentPostId,
	postId,
	streamId,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";

export function getAddCodeErrorsPending(repoId: string) {
	return {
		type: "ADD_CODEERRORS",
		payload: [
			{
				accountId: 11879688,
				id: "PENDING-MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
				createdAt: 1708978555345,
				modifiedAt: 1708978555345,
				assignees: [],
				teamId: "",
				streamId: "",
				fileStreamIds: [],
				status: "open",
				numReplies: 0,
				lastActivityAt: 0,
				creatorId: "",
				objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
				objectType: "errorGroup",
				title: "TypeError",
				text: "Cannot read properties of undefined (reading 'get')",
				stackTraces: [
					{
						text: "TypeError: Cannot read properties of undefined (reading 'get')\n    at /app/src/data/usersRepository.js:51:23\n    at Array.reduce (<anonymous>)\n    at countUsersByState (/app/src/data/usersRepository.js:50:19)\n    at userStateReport (/app/src/data/usersRepository.js:57:10)\n    at fetchUserStateReport (/app/src/controllers/usersController.js:11:16)\n    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1324:22)\n    at AsyncLocalStorage.run (node:async_hooks:346:14)\n    at AsyncLocalContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js:65:36)\n    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1314:25)\n    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:956:20)",
						lines: [
							{
								fileFullPath: "/app/src/data/usersRepository.js",
								method: "<unknown>",
								fullMethod: "<unknown>",
								arguments: [],
								line: 51,
								column: 23,
							},
							{
								fileFullPath: "<anonymous>",
								method: "reduce",
								namespace: "Array",
								fullMethod: "Array.reduce",
								arguments: [],
							},
							{
								fileFullPath: "/app/src/data/usersRepository.js",
								method: "countUsersByState",
								fullMethod: "countUsersByState",
								arguments: [],
								line: 50,
								column: 19,
							},
							{
								fileFullPath: "/app/src/data/usersRepository.js",
								method: "userStateReport",
								fullMethod: "userStateReport",
								arguments: [],
								line: 57,
								column: 10,
							},
							{
								fileFullPath: "/app/src/controllers/usersController.js",
								method: "fetchUserStateReport",
								fullMethod: "fetchUserStateReport",
								arguments: [],
								line: 11,
								column: 16,
							},
							{
								fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
								method: "runInContextCb",
								fullMethod: "runInContextCb",
								arguments: [],
								line: 1324,
								column: 22,
							},
							{
								fileFullPath: "node:async_hooks",
								method: "run",
								namespace: "AsyncLocalStorage",
								fullMethod: "AsyncLocalStorage.run",
								arguments: [],
								line: 346,
								column: 14,
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
							},
							{
								fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
								method: "applySegment",
								namespace: "WebFrameworkShim",
								fullMethod: "WebFrameworkShim.applySegment",
								arguments: [],
								line: 1314,
								column: 25,
							},
							{
								fileFullPath: "/app/node_modules/newrelic/lib/shim/shim.js",
								method: "_applyRecorderSegment",
								fullMethod: "_applyRecorderSegment",
								arguments: [],
								line: 956,
								column: 20,
							},
						],
						language: "javascript",
						header: "TypeError: Cannot read properties of undefined (reading 'get')",
						error: "Cannot read properties of undefined (reading 'get')",
						repoId: repoId,
						sha: "release-4",
						occurrenceId: "bd8f64ef-d4e3-11ee-91b3-faf14c8b1a88_36335_38105",
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
			},
		],
	};
}

export function getAddCodeErrorsUpdate1(repoId: string) {
	return {
		type: "ADD_CODEERRORS",
		payload: [
			{
				version: 1,
				deactivated: false,
				numReplies: 0,
				createdAt: 1708978555620,
				modifiedAt: 1708978555729,
				accountId: 11879688,
				objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
				objectType: "errorGroup",
				title: "TypeError",
				text: "Cannot read properties of undefined (reading 'get')",
				stackTraces: [
					{
						text: "TypeError: Cannot read properties of undefined (reading 'get')\n    at /app/src/data/usersRepository.js:51:23\n    at Array.reduce (<anonymous>)\n    at countUsersByState (/app/src/data/usersRepository.js:50:19)\n    at userStateReport (/app/src/data/usersRepository.js:57:10)\n    at fetchUserStateReport (/app/src/controllers/usersController.js:11:16)\n    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1324:22)\n    at AsyncLocalStorage.run (node:async_hooks:346:14)\n    at AsyncLocalContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js:65:36)\n    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1314:25)\n    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:956:20)",
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
						occurrenceId: "bd8f64ef-d4e3-11ee-91b3-faf14c8b1a88_36335_38105",
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
				postId: "65dcf17bc7d6448f0f088ada",
				teamId: "651ed16ac2f7dee11c938922",
				streamId: streamId,
				origin: "JetBrains",
				originDetail: "IntelliJ IDEA Ultimate Edition",
				creatorId: "652db11a7c271413e88b4ae3",
				followerIds: ["652db11a7c271413e88b4ae3"],
				permalink:
					"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/klTzGKoKTUunJdfHL5h8-A",
				lastActivityAt: 1708978555620,
				_id: "65dcf17bc7d6448f0f088adb",
				id: "65dcf17bc7d6448f0f088adb",
			},
		],
	};
}

// possibly parent post
export function addPostsParent1(repoId: string) {
	return {
		type: "ADD_CODEERRORS",
		payload: [
			{
				version: 1,
				deactivated: false,
				numReplies: 0,
				createdAt: createdAt,
				modifiedAt: modifiedAt,
				accountId: 11879688,
				objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
				objectType: "errorGroup",
				title: "TypeError",
				text: "Cannot read properties of undefined (reading 'get')",
				stackTraces: [
					{
						text: "TypeError: Cannot read properties of undefined (reading 'get')\n    at /app/src/data/usersRepository.js:51:23\n    at Array.reduce (<anonymous>)\n    at countUsersByState (/app/src/data/usersRepository.js:50:19)\n    at userStateReport (/app/src/data/usersRepository.js:57:10)\n    at fetchUserStateReport (/app/src/controllers/usersController.js:11:16)\n    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1324:22)\n    at AsyncLocalStorage.run (node:async_hooks:346:14)\n    at AsyncLocalContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js:65:36)\n    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1314:25)\n    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:956:20)",
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
						occurrenceId: "bd8f64ef-d4e3-11ee-91b3-faf14c8b1a88_36335_38105",
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
				postId: "65dcf17bc7d6448f0f088ada",
				teamId: "651ed16ac2f7dee11c938922",
				streamId: streamId,
				origin: "JetBrains",
				originDetail: "IntelliJ IDEA Ultimate Edition",
				creatorId: "652db11a7c271413e88b4ae3",
				followerIds: ["652db11a7c271413e88b4ae3"],
				permalink:
					"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/klTzGKoKTUunJdfHL5h8-A",
				lastActivityAt: 1708978555620,
				_id: "65dcf17bc7d6448f0f088adb",
				id: "65dcf17bc7d6448f0f088adb",
			},
		],
	};
}

export function addCodeErrorsUpdate2(repoId: string) {
	return {
		type: "ADD_CODEERRORS",
		payload: [
			{
				version: 1,
				deactivated: false,
				numReplies: 0,
				createdAt: createdAt,
				modifiedAt: modifiedAt,
				accountId: 11879688,
				objectId: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
				objectType: "errorGroup",
				title: "TypeError",
				text: "Cannot read properties of undefined (reading 'get')",
				stackTraces: [
					{
						text: "TypeError: Cannot read properties of undefined (reading 'get')\n    at /app/src/data/usersRepository.js:51:23\n    at Array.reduce (<anonymous>)\n    at countUsersByState (/app/src/data/usersRepository.js:50:19)\n    at userStateReport (/app/src/data/usersRepository.js:57:10)\n    at fetchUserStateReport (/app/src/controllers/usersController.js:11:16)\n    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1324:22)\n    at AsyncLocalStorage.run (node:async_hooks:346:14)\n    at AsyncLocalContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js:65:36)\n    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1314:25)\n    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:956:20)",
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
								resolved: true,
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
								resolved: true,
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
								resolved: true,
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
								resolved: true,
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
						occurrenceId: "bd8f64ef-d4e3-11ee-91b3-faf14c8b1a88_36335_38105",
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
				postId: "65dcf17bc7d6448f0f088ada",
				teamId: "651ed16ac2f7dee11c938922",
				streamId: streamId,
				origin: "JetBrains",
				originDetail: "IntelliJ IDEA Ultimate Edition",
				creatorId: "652db11a7c271413e88b4ae3",
				followerIds: ["652db11a7c271413e88b4ae3"],
				permalink:
					"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/klTzGKoKTUunJdfHL5h8-A",
				lastActivityAt: 1708978555620,
				_id: "65dcf17bc7d6448f0f088adb",
				id: "65dcf17bc7d6448f0f088adb",
			},
		],
	};
}

// Doesn't seem related to anything else
export function getAddStreamsV1() {
	return {
		type: "ADD_STREAMS",
		payload: [
			{
				version: 37,
				deactivated: false,
				createdAt: 1696518506882,
				modifiedAt: 1708023267719,
				_id: "651ed16ac2f7dee11c938923",
				teamId: "651ed16ac2f7dee11c938922",
				type: "channel",
				name: "general",
				isTeamStream: true,
				privacy: "public",
				creatorId: "651ed16ac2f7dee11c938920",
				sortId: "65ce5de32c7e177956da20da",
				mostRecentPostCreatedAt: 1708023267684,
				mostRecentPostId: "65ce5de32c7e177956da20da",
				numMarkers: 26,
				id: "651ed16ac2f7dee11c938923",
			},
		],
	};
}

// parent post
export function getAddPostsParent2(repoId: string) {
	return {
		type: "ADD_POSTS",
		payload: [
			{
				version: 2,
				deactivated: false,
				numReplies: 0,
				reactions: {},
				shareIdentifiers: [],
				createdAt: createdAt,
				modifiedAt: modifiedAt,
				text: "",
				streamId: streamId,
				language: "javascript",
				analyze: true,
				teamId: "651ed16ac2f7dee11c938922",
				origin: "JetBrains",
				originDetail: "IntelliJ IDEA Ultimate Edition",
				creatorId: "652db11a7c271413e88b4ae3",
				id: "65dcf17bc7d6448f0f088ada",
				codeErrorId: "65dcf17bc7d6448f0f088adb",
				seqNum: 1,
				_id: "65dcf17bc7d6448f0f088ada",
				hasMarkers: false,
				codeError: {
					version: 1,
					deactivated: false,
					numReplies: 0,
					createdAt: 1708978555620,
					modifiedAt: 1708978555729,
					accountId: 11879688,
					objectId:
						"MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
					objectType: "errorGroup",
					title: "TypeError",
					text: "Cannot read properties of undefined (reading 'get')",
					stackTraces: [
						{
							text: "TypeError: Cannot read properties of undefined (reading 'get')\n    at /app/src/data/usersRepository.js:51:23\n    at Array.reduce (<anonymous>)\n    at countUsersByState (/app/src/data/usersRepository.js:50:19)\n    at userStateReport (/app/src/data/usersRepository.js:57:10)\n    at fetchUserStateReport (/app/src/controllers/usersController.js:11:16)\n    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1324:22)\n    at AsyncLocalStorage.run (node:async_hooks:346:14)\n    at AsyncLocalContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/async-local-context-manager.js:65:36)\n    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1314:25)\n    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:956:20)",
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
									resolved: true,
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
									resolved: true,
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
									resolved: true,
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
									resolved: true,
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
							occurrenceId: "bd8f64ef-d4e3-11ee-91b3-faf14c8b1a88_36335_38105",
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
					postId: "65dcf17bc7d6448f0f088ada",
					teamId: "651ed16ac2f7dee11c938922",
					streamId: streamId,
					origin: "JetBrains",
					originDetail: "IntelliJ IDEA Ultimate Edition",
					creatorId: "652db11a7c271413e88b4ae3",
					followerIds: ["652db11a7c271413e88b4ae3"],
					permalink:
						"https://codestream-pd.staging-service.nr-ops.net/e/ZR7RasL33uEck4ki/klTzGKoKTUunJdfHL5h8-A",
					lastActivityAt: 1708978555620,
					_id: "65dcf17bc7d6448f0f088adb",
					id: "65dcf17bc7d6448f0f088adb",
				},
			},
		],
	};
}

export function getAddPostsMain(
	streamId: string,
	postId: string,
	parentPostId: string,
	nraiUserId: string
) {
	return [
		{
			version: 2,
			deactivated: false,
			numReplies: 0,
			reactions: {},
			shareIdentifiers: [],
			createdAt: createdAt,
			modifiedAt: modifiedAt,
			forGrok: true,
			streamId: streamId,
			teamId: "651ed16ac2f7dee11c938922",
			text: "",
			parentPostId: parentPostId,
			origin: "JetBrains",
			originDetail: "IntelliJ IDEA Ultimate Edition",
			creatorId: nraiUserId,
			seqNum: 35,
			_id: postId,
			id: postId,
			hasMarkers: false,
		},
	];
}

export function getAddPostsForStream(nraiUserId: string) {
	return {
		type: "ADD_POSTS_FOR_STREAM",
		payload: {
			posts: [
				{
					version: 2,
					deactivated: false,
					numReplies: 0,
					reactions: {},
					shareIdentifiers: [],
					createdAt: createdAt,
					modifiedAt: modifiedAt,
					text: "",
					streamId: streamId,
					language: "javascript",
					analyze: true,
					teamId: "651ed16ac2f7dee11c938922",
					origin: "JetBrains",
					originDetail: "IntelliJ IDEA Ultimate Edition",
					creatorId: "652db11a7c271413e88b4ae3",
					id: parentPostId,
					codeErrorId: codeErrorId,
					seqNum: 1,
					_id: parentPostId,
				},
				{
					version: 2,
					deactivated: false,
					numReplies: 0,
					reactions: {},
					shareIdentifiers: [],
					createdAt: createdAt,
					modifiedAt: modifiedAt,
					_id: postId,
					forGrok: true,
					streamId: streamId,
					teamId: "651ed16ac2f7dee11c938922",
					text: "",
					parentPostId: parentPostId,
					origin: "JetBrains",
					originDetail: "IntelliJ IDEA Ultimate Edition",
					creatorId: nraiUserId,
					seqNum: 35,
					id: postId,
				},
			],
			streamId: streamId,
		},
	};
}

// Potentially missing a delete of the pending codeerror
