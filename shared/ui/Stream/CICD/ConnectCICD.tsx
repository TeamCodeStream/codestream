import { configureAndConnectProvider } from "@codestream/webview/store/providers/actions";
import React from "react";
import { useDispatch } from "react-redux";
import Icon from "../Icon";
import { Provider } from "../IntegrationsPanel";

export const ConnectCICD = () => {
	const dispatch = useDispatch();
	return (
		<>
			<div className="filters" style={{ padding: "0 20px 10px 20px" }}>
				<span>
					Connect to CircleCI to see build status for the branch you&#8217;re currently checked out
					to.
				</span>
			</div>

			<div style={{ padding: "0 20px 20px 20px" }}>
				<Provider
					appendIcon
					style={{ maxWidth: "23em" }}
					key="circleci"
					onClick={() => dispatch(configureAndConnectProvider("circleci*com", "CI/CD Section"))}
				>
					<Icon name="newrelic" /* FIXME */ />
					Connect to CircleCI
				</Provider>
			</div>
		</>
	);
};
