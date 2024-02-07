import { OpenInBufferRequestType } from "@codestream/protocols/webview";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import { stringify } from "csv-stringify/browser/esm/sync";
import React from "react";
import { HostApi } from "../../webview-api";
import { default as Icon } from "../Icon";

export const ExportResults = (props: { accountId?: number; results: any }) => {
	return (
		<InlineMenu
			title="Export"
			noFocusOnSelect
			noChevronDown={true}
			items={Object.values(["JSON", "CSV"]).map((_: any) => ({
				label: `Export ${_}`,
				key: _,
				checked: false,
				action: () => {
					let handled;
					if (_ === "JSON") {
						handled = JSON.stringify(props.results, null, 4);
					} else if (_ === "CSV") {
						handled = stringify(props.results, {
							header: true,
						});
					}
					if (handled) {
						HostApi.instance.track("codestream/nrql/export downloaded", {
							account_id: props.accountId,
							event_type: "submit",
							meta_data: `format: ${_.toLowerCase()}`,
						});

						HostApi.instance.send(OpenInBufferRequestType, {
							contentType: _.toLowerCase(),
							data: handled,
						});
					}
				},
			}))}
			align="bottomRight"
			className="dropdown"
		>
			<span>
				<Icon name="download" title="Export Results" />
			</span>
		</InlineMenu>
	);
};

export default ExportResults;
