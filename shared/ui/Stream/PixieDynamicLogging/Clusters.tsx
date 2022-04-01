import {
	ERROR_PIXIE_NOT_CONFIGURED,
	PixieGetClustersRequestType
} from "@codestream/protocols/agent";
import { Dialog } from "@codestream/webview/src/components/Dialog";
import { CodeStreamState } from "@codestream/webview/store";
import { DropdownButton, DropdownButtonItems } from "@codestream/webview/Stream/DropdownButton";
import { Link } from "@codestream/webview/Stream/Link";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useEffect } from "react";
import { shallowEqual, useSelector } from "react-redux";

export const Clusters = props => {
	const [isLoading, setIsLoading] = React.useState(false);
	const [clusters, setClusters] = React.useState<DropdownButtonItems[]>([]);
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
	const [errorCode, setErrorCode] = React.useState<number | undefined>();

	const defaultClusterId = useSelector(
		(state: CodeStreamState) => state.preferences.pixieDefaultClusterId
	);

	useEffect(() => {
		void loadClusters();
	}, [props.account.id]);

	const loadClusters = async () => {
		setIsLoading(true);
		try {
			const response = await HostApi.instance.send(PixieGetClustersRequestType, {
				accountId: props.account.id
			});
			const newClusters = response.clusters.map(_ => ({
				key: _.clusterId,
				label: _.clusterName,
				searchLabel: _.clusterName,
				action: () => {
					props.onSelect(_);
				}
			})) as DropdownButtonItems[];
			if (newClusters.length > 5) {
				newClusters.unshift(
					{
						label: "",
						placeholder: "Search Clusters",
						type: "search"
					},
					{ label: "-" }
				);
			}
			setClusters(newClusters);
			setErrorCode(undefined);
			setErrorMessage(undefined);
			if (defaultClusterId) {
				props.onSelect(response.clusters.find(_ => _.clusterId === defaultClusterId));
			}
			// props.onSelect(response.clusters[0]);
		} catch (err) {
			props.onSelect(undefined);
			setErrorCode(err.code);
			setErrorMessage(err.message || err.toString());
			setClusters([]);
		}
		setIsLoading(false);
	};

	return (
		<div style={{ padding: "0px 0px 1px 0px" }}>
			{errorCode === ERROR_PIXIE_NOT_CONFIGURED && (
				<Dialog narrow title="">
					<div className="embedded-panel">
						<div className="panel-header" style={{ background: "none" }}>
							<span className="panel-title">Pixie Not Installed</span>
						</div>
						<div style={{ textAlign: "center" }}>
							Dynamic Logging requires that you have&nbsp;
							<Link href="https://docs.newrelic.com/docs/auto-telemetry-pixie/install-auto-telemetry-pixie/">
								Pixie set up to monitor
							</Link>
							&nbsp;your Kubernetes cluster.
						</div>
					</div>
				</Dialog>
			)}
			{errorCode !== ERROR_PIXIE_NOT_CONFIGURED && errorMessage != null && (
				<small className="explainer error-message">{errorMessage}</small>
			)}
			{errorCode == null && (
				<DropdownButton items={clusters} isLoading={isLoading} size="compact" wrap fillParent>
					{props.value?.clusterName || "Make Selection"}
				</DropdownButton>
			)}
		</div>
	);
};
