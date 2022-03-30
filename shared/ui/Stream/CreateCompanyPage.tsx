import React from "react";
import { TextInput } from "../Authentication/TextInput";
import { TooltipIconWrapper } from "../Authentication/Signup";
import { Button } from "../src/components/Button";
import { FormattedMessage } from "react-intl";
import { CodeStreamState } from "../store";
import { useSelector, useDispatch } from "react-redux";
import { switchToTeam, switchToForeignCompany } from "../store/session/actions";
import { CSCompany } from "@codestream/protocols/api";
import { wait } from "../utils";
import { Dialog } from "../src/components/Dialog";
import { closeModal } from "./actions";
import { createCompany, createForeignCompany } from "../store/companies/actions";
import Tooltip from "./Tooltip";
import Icon from "./Icon";
import { Dropdown } from "../Stream/Dropdown";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";

export function CreateCompanyPage() {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { environmentHosts, environment } = state.configs;
		const { currentTeamId } = state.context;
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");

		return {
			environmentHosts,
			environment,
			currentCompanyId: state.teams[currentTeamId].companyId,
			companies: state.companies,
			supportsMultiRegion
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
			action: () => setRegion(host.name)
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
					// what's not to love about code like this?
					const company = ((await dispatch(
						createForeignCompany({ name: companyName }, selectedHost)
					)) as unknown) as CSCompany;
					// artificial delay to ensure analytics from creating the team are actually processed before we logout below
					await wait(1000);
					await dispatch(switchToForeignCompany(company.id));
				}
			} else {
				const team = ((await dispatch(
					createCompany({ name: companyName })
				)) as unknown) as CSCompany;
				// artificial delay to ensure analytics from creating the team are actually processed before we logout below
				await wait(1000);
				await dispatch(switchToTeam(team.id));
			}
		} catch (error) {
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
