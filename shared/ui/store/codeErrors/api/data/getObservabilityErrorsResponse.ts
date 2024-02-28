import { GetObservabilityErrorsResponse } from "@codestream/protocols/agent";

const lastOccurrence = Date.now() - 90000;

export function getObservabilityErrorsResponse(repoId: string): GetObservabilityErrorsResponse {
	return {
		repos: [
			{
				repoId: repoId,
				repoName: "clm-demo-js-node",
				errors: [
					{
						entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQxNzQ5NjQy",
						appName: "clm-demo-js-node (staging.stg-red-car)",
						errorClass: "TypeError",
						message: "Cannae read prooperties of undefined (reading 'get')",
						remote: "https://source.datanerd.us/codestream/clm-demo-js-node",
						errorGroupGuid:
							"MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHxhOTE1MGJkMC05Mzg4LTM4ZWItOTRmMi0wYzA5MTQwYjlmMWE",
						occurrenceId: "58a8168e-d0fb-11ee-91b3-faf14c8b1a88_0_1835",
						count: 5086,
						lastOccurrence,
						errorGroupUrl:
							"https://staging-one.newrelic.com/launcher/nr1-core.explorer?pane=eyJlbnRpdHlJZCI6Ik1URTROemsyT0RoOFFWQk5mRUZRVUV4SlEwRlVTVTlPZkRReE56UTVOalF5IiwibmVyZGxldElkIjoiZXJyb3JzLWluYm94LmVudGl0eS1lcnJvcnMtaW5ib3gifQ==&sidebars[0]=eyJlbnRpdHlHdWlkIjoiTVRFNE56azJPRGg4UVZCTmZFRlFVRXhKUTBGVVNVOU9mRFF4TnpRNU5qUXkiLCJuZXJkbGV0SWQiOiJucjEtY29yZS5hY3Rpb25zIiwic2VsZWN0ZWROZXJkbGV0Ijp7Im5lcmRsZXRJZCI6ImVycm9ycy1pbmJveC5lbnRpdHktZXJyb3JzLWluYm94In19&cards[0]=eyJlbnRpdHlHdWlkIjoiTVRFNE56azJPRGg4UVZCTmZFRlFVRXhKUTBGVVNVOU9mRFF4TnpRNU5qUXkiLCJlcnJvckdyb3VwR3VpZCI6Ik1URTROemsyT0RoOFJWSlVmRVZTVWw5SFVrOVZVSHhoT1RFMU1HSmtNQzA1TXpnNExUTTRaV0l0T1RSbU1pMHdZekE1TVRRd1lqbG1NV0UiLCJuZXJkbGV0SWQiOiJlcnJvcnMtaW5ib3guZXJyb3ItZ3JvdXAtZGV0YWlscyJ9&platform[timeRange][duration]=600000&platform[$isFallbackTimeRange]=true",
					},
				],
			},
		],
	};
}
