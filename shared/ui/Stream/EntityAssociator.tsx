import {
	EntityAccount,
	EntityType,
	GetObservabilityEntitiesRequestType,
	WarningOrError,
} from "@codestream/protocols/agent";
import React, { PropsWithChildren, useState } from "react";
import { components, OptionProps } from "react-select";
import { AsyncPaginate } from "react-select-async-paginate";
import styled from "styled-components";

import { HostApi } from "@codestream/webview/webview-api";
import { api } from "@codestream/webview/store/codeErrors/thunks";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { NoContent } from "../src/components/Pane";
import { useAppDispatch } from "../utilities/hooks";
import { WarningBox } from "./WarningBox";
import { isEmpty as _isEmpty } from "lodash";

interface EntityAssociatorProps {
	title?: string;
	label?: string | React.ReactNode;
	remote: string;
	remoteName: string;
	onSuccess?: (entityGuid: { entityGuid: string }) => void;
	servicesToExcludeFromSearch?: EntityAccount[];
	isSidebarView?: boolean;
}

type SelectOptionType = { label: string; value: string };

type AdditionalType = { nextCursor?: string };

const OptionName = styled.div`
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
`;

const OptionType = styled.span`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const OptionAccount = styled.div`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const Option = (props: OptionProps) => {
	const children = (
		<>
			<OptionName>
				{props.data?.label} <OptionType>{props.data?.labelAppend}</OptionType>
			</OptionName>
			<OptionAccount>{props.data?.sublabel}</OptionAccount>
		</>
	);
	return <components.Option {...props} children={children} />;
};

export const EntityAssociator = React.memo((props: PropsWithChildren<EntityAssociatorProps>) => {
	const dispatch = useAppDispatch();
	const [selected, setSelected] = useState<SelectOptionType | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);

	async function loadEntities(search: string, _loadedOptions, additional?: AdditionalType) {
		const { servicesToExcludeFromSearch } = props;

		const result = await HostApi.instance.send(GetObservabilityEntitiesRequestType, {
			searchCharacters: search,
			nextCursor: additional?.nextCursor,
		});

		let options = result.entities.map(e => {
			const typeLabel = (t: EntityType) => {
				switch (t) {
					case "BROWSER_APPLICATION_ENTITY":
						return "Browser";
					case "MOBILE_APPLICATION_ENTITY":
						return "Mobile";
					case "THIRD_PARTY_SERVICE_ENTITY":
						return "OTEL";
					case "INFRASTRUCTURE_AWS_LAMBDA_FUNCTION_ENTITY":
						return "Lambda";
					default:
						return "APM";
				}
			};
			return {
				label: e.name,
				value: e.guid,
				sublabel: e.account,
				labelAppend: typeLabel(e.entityType),
			};
		});

		if (servicesToExcludeFromSearch && !_isEmpty(servicesToExcludeFromSearch)) {
			options = options.filter(
				option =>
					!servicesToExcludeFromSearch.some(exclude => {
						return exclude.entityGuid === option.value;
					})
			);
		}

		return {
			options,
			hasMore: !!result.nextCursor,
			additional: {
				nextCursor: result.nextCursor,
			},
		};
	}

	const handleClick = (e: React.MouseEvent<Element, MouseEvent>): void => {
		e.preventDefault();
		if (!selected) {
			return;
		}
		setIsLoading(true);
		setWarningOrErrors(undefined);

		const payload = {
			url: props.remote,
			name: props.remoteName,
			applicationEntityGuid: selected.value,
			entityId: selected.value,
			parseableAccountId: selected.value,
		};
		dispatch(api("assignRepository", payload))
			.then(response => {
				setTimeout(() => {
					if (response?.directives) {
						console.log("assignRepository", {
							directives: response?.directives,
						});
						// a little fragile, but we're trying to get the entity guid back
						if (props.onSuccess) {
							props.onSuccess({
								entityGuid: response?.directives.find(d => d.type === "assignRepository")?.data
									?.entityGuid,
							});
						}
					} else if (response?.error) {
						setWarningOrErrors([{ message: response.error }]);
					} else {
						setWarningOrErrors([
							{ message: "Failed to direct to entity dropdown, please refresh" },
						]);
						console.warn("Could not find directive", {
							_: response,
							payload: payload,
						});
					}
				}, 5000);
			})
			.catch(err => {
				setWarningOrErrors([{ message: "Failed to direct to entity dropdown, please refresh" }]);
				logError(`Unexpected error during assignRepository: ${err}`, {});
			})
			.finally(() => {
				setTimeout(() => {
					{
						/* @TODO clean up this code, put in place so spinner doesn't stop before onSuccess */
					}
					setIsLoading(false);
				}, 6000);
			});
	};
	return (
		<NoContent style={{ marginLeft: props.isSidebarView ? "20px" : "40px" }}>
			{props.title && <h3>{props.title}</h3>}
			{props.label && <p style={{ marginTop: 0 }}>{props.label}</p>}
			{warningOrErrors && <WarningBox items={warningOrErrors} />}
			<div style={{ marginBottom: "15px" }}>
				<AsyncPaginate
					id="input-entity-autocomplete"
					name="entity-autocomplete"
					classNamePrefix="react-select"
					loadOptions={loadEntities}
					value={selected}
					isClearable
					debounceTimeout={750}
					placeholder={`Type to search for services...`}
					onChange={newValue => {
						setSelected(newValue);
					}}
					components={{ Option }}
				/>
			</div>
			<Button
				style={{ width: "100%" }}
				isLoading={isLoading}
				disabled={isLoading || !selected}
				onClick={handleClick}
			>
				Show Performance Data
			</Button>
			{props.children}
		</NoContent>
	);
});
