import { CodeStreamState } from "@codestream/webview/store";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { isWordy } from "@codestream/webview/utilities/strings";
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { configureProvider, connectProvider, ViewLocation } from "../store/providers/actions";
import { closePanel } from "./actions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";

interface Props {
	providerId: string;
	originLocation: ViewLocation | string;
}

export default function ConfigureAzureDevOpsPanel(props: Props) {
	const initialInput = useRef<HTMLInputElement>(null);

	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers, ide } = state;
		const provider = providers[props.providerId];
		const isInVscode = ide.name === "VSC";
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return { provider, providerDisplay, isInVscode };
	});

	const dispatch = useDispatch();

	const [organization, setOrganization] = useState("");
	const [organizationTouched, setOrganizationTouched] = useState(false);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [loading, setLoading] = useState(false);

	useDidMount(() => {
		initialInput.current?.focus();
	});

	const onSubmit = async e => {
		e.preventDefault();
		setSubmitAttempted(true);
		if (isFormInvalid()) return;
		setLoading(true);
		const { providerId } = props;
		const organization = getOrg();
		await dispatch(configureProvider(providerId, { organization }));
		await dispatch(connectProvider(providerId, props.originLocation));
		setLoading(false);
		dispatch(closePanel());
	};

	const renderError = () => {};

	const onBlurOrganization = () => {
		setOrganizationTouched(true);
	};

	const renderOrganizationHelp = () => {
		if (organizationTouched || submitAttempted) {
			if (organization.length === 0) return <small className="error-message">Required</small>;
			if (!isOrgValid()) return <small className="error-message">Invalid URL</small>;
		}
		return;
	};

	const tabIndex = (): any => {};

	const isFormInvalid = () => {
		return isOrgEmpty() || !isOrgValid();
	};

	const isOrgEmpty = () => {
		return organization.trim().length === 0;
	};

	const isOrgValid = () => {
		return getOrg().length > 0;
	};

	const getOrg = () => {
		if (isWordy(organization.trim())) return organization.trim();
		return extractOrgFromUrl();
	};

	const extractOrgFromUrl = () => {
		try {
			const url = new URL(organization.trim());
			// Replace leading and trailing slash
			const trimmedUrl = url.pathname.replace(/^\//, "").replace(/\/$/, "");
			// Should only have 1 path deep i.e. /myorg OK but not /whatever/myorg
			if (trimmedUrl.includes("/")) {
				return "";
			}
			return trimmedUrl;
		} catch (e) {
			return "";
		}
	};

	const inactive = false;
	const { providerDisplay } = derivedState;
	const { displayName, getUrl } = providerDisplay;
	const placeholder = "myorg";
	return (
		<div className="panel configure-provider-panel">
			<form className="standard-form vscroll" onSubmit={onSubmit}>
				<div className="panel-header">
					<CancelButton onClick={() => dispatch(closePanel())} />
					<span className="panel-title">Configure {displayName}</span>
				</div>
				<fieldset className="form-body" disabled={inactive}>
					{getUrl && (
						<p style={{ textAlign: "center" }} className="explainer">
							Not a {displayName} customer yet? <a href={getUrl}>Get {displayName}</a>
						</p>
					)}
					<p>
						Name of your Azure DevOps Services organization. For example, if you access Azure DevOps
						Services at https://dev.azure.com/
						<strong>myorg</strong>, you would supply "<strong>myorg</strong>" here
					</p>
					{renderError()}
					<div id="controls">
						<div id="configure-azuredevops-controls" className="control-group">
							<label>Your {displayName} Organization</label>
							<input
								ref={initialInput}
								className="input-text control"
								type="text"
								name="organization"
								tabIndex={tabIndex()}
								value={organization}
								onChange={e => setOrganization(e.target.value)}
								onBlur={onBlurOrganization}
								placeholder={placeholder}
								id="configure-provider-initial-input"
							/>
							{renderOrganizationHelp()}
						</div>
						<div className="button-group">
							<Button
								id="save-button"
								className="control-button"
								tabIndex={tabIndex()}
								type="submit"
								loading={loading}
							>
								Submit
							</Button>
							<Button
								id="discard-button"
								className="control-button cancel"
								tabIndex={tabIndex()}
								type="button"
								onClick={() => dispatch(closePanel())}
							>
								Cancel
							</Button>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
}
