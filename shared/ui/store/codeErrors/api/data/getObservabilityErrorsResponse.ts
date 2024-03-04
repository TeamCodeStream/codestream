import { GetObservabilityErrorsResponse } from "@codestream/protocols/agent";

const lastOccurrence = Date.now() - 90000;

export function getObservabilityErrorsResponse(repoId: string): GetObservabilityErrorsResponse {
	return {
		repos: [
			{
				repoId: repoId,
				repoName: "Java",
				errors: [
					{
						entityId: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQ1ODg2NTYz",
						appName: "webportal-telco-dillon",
						errorClass: "java.lang.NullPointerException",
						message:
							'Cannot invoke "acme.storefront.action.report.UserDataManager$Phone.getCountryCode()" because the return value of "acme.storefront.action.report.UserDataManager$User.getPhone()" is null',
						remote: "https://github.com/TeamCodeStream/telco-microservices.git",
						errorGroupGuid:
							"MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHwzMTY4NTFkZS1hMjVmLTNlMzMtYmI2ZS0zMTc2ZGRiYjIwYjU",
						occurrenceId: "a8e80e5f-d99a-11ee-894b-068eae1a6a25_12731_13774",
						count: 348,
						lastOccurrence: lastOccurrence,
						errorGroupUrl:
							"https://staging-one.newrelic.com/launcher/nr1-core.explorer?pane=eyJlbnRpdHlJZCI6Ik1URTROemsyT0RoOFFWQk5mRUZRVUV4SlEwRlVTVTlPZkRRMU9EZzJOVFl6IiwibmVyZGxldElkIjoiZXJyb3JzLWluYm94LmVudGl0eS1lcnJvcnMtaW5ib3gifQ==&sidebars[0]=eyJlbnRpdHlHdWlkIjoiTVRFNE56azJPRGg4UVZCTmZFRlFVRXhKUTBGVVNVOU9mRFExT0RnMk5UWXoiLCJuZXJkbGV0SWQiOiJucjEtY29yZS5hY3Rpb25zIiwic2VsZWN0ZWROZXJkbGV0Ijp7Im5lcmRsZXRJZCI6ImVycm9ycy1pbmJveC5lbnRpdHktZXJyb3JzLWluYm94In19&cards[0]=eyJlbnRpdHlHdWlkIjoiTVRFNE56azJPRGg4UVZCTmZFRlFVRXhKUTBGVVNVOU9mRFExT0RnMk5UWXoiLCJlcnJvckdyb3VwR3VpZCI6Ik1URTROemsyT0RoOFJWSlVmRVZTVWw5SFVrOVZVSHd6TVRZNE5URmtaUzFoTWpWbUxUTmxNek10WW1JMlpTMHpNVGMyWkdSaVlqSXdZalUiLCJuZXJkbGV0SWQiOiJlcnJvcnMtaW5ib3guZXJyb3ItZ3JvdXAtZGV0YWlscyJ9&platform[timeRange][duration]=600000&platform[$isFallbackTimeRange]=true",
					},
				],
			},
		],
	};
}
