import React from "react";
import { FormattedMessage } from "react-intl";

import { logout, setEnvironment } from "@codestream/webview/store/session/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { TooltipIconWrapper } from "../Authentication/Signup";
import { TextInput } from "../Authentication/TextInput";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { goToSignup } from "../store/context/actions";
import { Dropdown } from "../Stream/Dropdown";
import { closeModal } from "./actions";
import Icon from "./Icon";
import Tooltip from "./Tooltip";

export function CreateCompanyPage() {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { environmentHosts, environment } = state.configs;
		const { currentTeamId } = state.context;
		const { userId } = state.session;
		const currentUser = state.users[userId!];
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");

		return {
			environmentHosts,
			environment,
			currentCompanyId: state.teams[currentTeamId].companyId,
			companies: state.companies,
			supportsMultiRegion,
			currentUser,
		};
	});

	let regionItems,
		defaultRegion = "";
	if (
		derivedState.supportsMultiRegion &&
		derivedState.environmentHosts &&
		derivedState.environmentHosts.length > 1
	) {
		let usHost = derivedState.environmentHosts.find(host =>
			host.shortName.match(/(^|[^a-zA-Z\d\s:])us($|[^a-zA-Z\d\s:])/)
		);
		if (!usHost) {
			usHost = derivedState.environmentHosts[0];
		}
		regionItems = derivedState.environmentHosts.map(host => ({
			key: host.shortName,
			label: host.name,
			action: () => setRegion(host.name),
		}));
		if (derivedState.environment) {
			const host = derivedState.environmentHosts.find(
				host => host.shortName === derivedState.environment
			);
			if (host) {
				defaultRegion = host.name;
			} else if (usHost) {
				defaultRegion = usHost.name;
			}
		}
	}

	const [companyName, setCompanyName] = React.useState("");
	const [teamNameValidity, setTeamNameValidity] = React.useState(true);
	const [companyNameValidity, setCompanyNameValidity] = React.useState(true);
	const [region, setRegion] = React.useState(defaultRegion);

	const [isLoading, setIsLoading] = React.useState(false);
	const isCompanyNameUnique = (name: string) => {
		return !Object.values(derivedState.companies).some(
			c => c.name.toLowerCase() === name.toLowerCase()
		);
	};

	const isCompanyNameValid = (name: string) => {
		return name.length > 0 && isCompanyNameUnique(name);
	};

	const onValidityChanged = (field: string, validity: boolean) =>
		field === "company" ? setTeamNameValidity(validity) : setCompanyNameValidity(validity);

	const validateOrgName = (name: string) => {
		const valid = isCompanyNameValid(name);
		setCompanyNameValidity(valid);
		return valid;
	};

	const onSubmit: React.FormEventHandler = async e => {
		e.preventDefault();
		if (!validateOrgName(companyName)) return;

		setIsLoading(true);

		try {
			const currentHost =
				derivedState.environmentHosts &&
				derivedState.environmentHosts.find(host => host.shortName === derivedState.environment);
			if (derivedState.environmentHosts && currentHost && region && region !== currentHost.name) {
				const selectedHost = derivedState.environmentHosts.find(host => host.name === region);
				if (selectedHost) {
					await dispatch(setEnvironment(selectedHost.shortName, selectedHost.publicApiUrl));
				}
			}
			const email = derivedState.currentUser.email;
			await dispatch(logout());
			await dispatch(goToSignup({ newOrg: true, companyName, email }));
		} catch (error) {
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog title="Create an Organization" onClose={() => dispatch(closeModal())}>
			<form className="standard-form" onSubmit={onSubmit}>
				<fieldset className="form-body">
					<div id="controls">
						<div className="control-group">
							<label>
								<FormattedMessage id="createCompany.name.label" />
							</label>
							<TextInput
								name="company"
								value={companyName}
								onChange={setCompanyName}
								validate={isCompanyNameValid}
								onValidityChanged={onValidityChanged}
								required
								autoFocus
							/>
							{!teamNameValidity && (
								<small className="explainer error-message">
									{companyName.length === 0
										? "Required"
										: !isCompanyNameUnique(companyName) && "Name already in use"}
								</small>
							)}
							{regionItems && (
								<>
									<br />
									<br />
									Region: <Dropdown
										selectedValue={region}
										items={regionItems}
										noModal={true}
									/>{" "}
									<Tooltip
										placement={"bottom"}
										title={`Select the region where your CodeStream data should be stored.`}
									>
										<TooltipIconWrapper>
											<Icon name="question" />
										</TooltipIconWrapper>
									</Tooltip>
								</>
							)}
						</div>
						<br />
						<div className="button-group">
							<Button variant="primary" isLoading={isLoading}>
								<FormattedMessage id="createCompany.submitButton" />
							</Button>
						</div>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
}
