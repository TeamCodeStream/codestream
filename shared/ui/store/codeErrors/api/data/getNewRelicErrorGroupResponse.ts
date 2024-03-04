import { GetNewRelicErrorGroupResponse } from "@codestream/protocols/agent";

export function getNewRelicErrorGroupResponse(): GetNewRelicErrorGroupResponse {
	return {
		accountId: 11879688,
		errorGroup: {
			entity: {
				relatedRepos: [
					{
						url: "https://github.com/TeamCodeStream/telco-microservices.git",
						name: "telco-microservices",
					},
				],
			},
			accountId: 11879688,
			entityGuid: "MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQ1ODg2NTYz",
			guid: "MTE4Nzk2ODh8RVJUfEVSUl9HUk9VUHwzMTY4NTFkZS1hMjVmLTNlMzMtYmI2ZS0zMTc2ZGRiYjIwYjU",
			title: "java.lang.NullPointerException",
			message:
				'Cannot invoke "acme.storefront.action.report.UserDataManager$Phone.getCountryCode()" because the return value of "acme.storefront.action.report.UserDataManager$User.getPhone()" is null',
			errorGroupUrl:
				"https://staging-one.newrelic.com/launcher/nr1-core.explorer?pane=eyJlbnRpdHlJZCI6Ik1URTROemsyT0RoOFFWQk5mRUZRVUV4SlEwRlVTVTlPZkRRMU9EZzJOVFl6IiwibmVyZGxldElkIjoiZXJyb3JzLWluYm94LmVudGl0eS1lcnJvcnMtaW5ib3gifQ==&sidebars[0]=eyJlbnRpdHlHdWlkIjoiTVRFNE56azJPRGg4UVZCTmZFRlFVRXhKUTBGVVNVOU9mRFExT0RnMk5UWXoiLCJuZXJkbGV0SWQiOiJucjEtY29yZS5hY3Rpb25zIiwic2VsZWN0ZWROZXJkbGV0Ijp7Im5lcmRsZXRJZCI6ImVycm9ycy1pbmJveC5lbnRpdHktZXJyb3JzLWluYm94In19&cards[0]=eyJlbnRpdHlHdWlkIjoiTVRFNE56azJPRGg4UVZCTmZFRlFVRXhKUTBGVVNVOU9mRFExT0RnMk5UWXoiLCJlcnJvckdyb3VwR3VpZCI6Ik1URTROemsyT0RoOFJWSlVmRVZTVWw5SFVrOVZVSHd6TVRZNE5URmtaUzFoTWpWbUxUTmxNek10WW1JMlpTMHpNVGMyWkdSaVlqSXdZalUiLCJuZXJkbGV0SWQiOiJlcnJvcnMtaW5ib3guZXJyb3ItZ3JvdXAtZGV0YWlscyJ9&platform[timeRange][duration]=600000&platform[$isFallbackTimeRange]=true",
			entityUrl:
				"https://staging-one.newrelic.com/redirect/entity/MTE4Nzk2ODh8QVBNfEFQUExJQ0FUSU9OfDQ1ODg2NTYz",
			errorTrace: {
				path: "webportal-telco-dillon",
				stackTrace: [
					{
						formatted:
							"\tacme.storefront.action.report.UserDataManager.getUserViewByState(UserDataManager.java:240)",
					},
					{
						formatted: "\tacme.storefront.MyMain.runApp(MyMain.java:38)",
					},
					{
						formatted: "\tacme.storefront.MyMain.lambda$main$0(MyMain.java:16)",
					},
					{
						formatted: "\tjava.base/java.lang.Thread.run(Thread.java:840)",
					},
				],
			},
			hasStackTrace: true,
			attributes: {},
			states: ["UNRESOLVED", "RESOLVED", "IGNORED"],
			entityName: "webportal-telco-dillon",
			entityAlertingSeverity: "NOT_CONFIGURED",
			state: "UNRESOLVED",
		},
	};
}
