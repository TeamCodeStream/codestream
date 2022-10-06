import {
	EntityAccount,
	GetObservabilityEntitiesRequestType,
	WarningOrError,
} from "@codestream/protocols/agent";
import { api } from "@codestream/webview/store/codeErrors/thunks";
import { HostApi } from "@codestream/webview/webview-api";
import React, { PropsWithChildren, useState } from "react";
import { AsyncPaginate } from "react-select-async-paginate";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { NoContent } from "../src/components/Pane";
import { useAppDispatch } from "../utilities/hooks";
import Tooltip from "./Tooltip";
import { WarningBox } from "./WarningBox";

interface EntityAssociatorProps {
	title?: string;
	label?: string | React.ReactNode;
	remote: string;
	remoteName: string;
	onSuccess?: (entityGuid: { entityGuid: string }) => void;
	servicesToExcludeFromSearch?: EntityAccount[];
}

type SelectOptionType = { label: string; value: string };

type AdditionalType = { nextCursor?: string };

export const EntityAssociator = React.memo((props: PropsWithChildren<EntityAssociatorProps>) => {
	const dispatch = useAppDispatch();
	const [selected, setSelected] = useState<SelectOptionType | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);

	async function loadEntities(search: string, _loadedOptions, additional?: AdditionalType) {
		const result = await HostApi.instance.send(GetObservabilityEntitiesRequestType, {
			searchCharacters: search,
			nextCursor: additional?.nextCursor,
		});
		const options = result.entities.map(e => {
			return { label: e.name, value: e.guid };
		});
		return {
			options,
			hasMore: !!result.nextCursor,
			additional: {
				nextCursor: result.nextCursor,
			},
		};
	}

	return (
		<NoContent style={{ marginLeft: "40px" }}>
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
					placeholder={`Type to search for entities...`}
					onChange={newValue => {
						setSelected(newValue);
					}}
				/>
			</div>
			<Tooltip placement="bottom" title={`Associate with ${props.remote}`}>
				<Button
					isLoading={isLoading}
					disabled={isLoading || !selected}
					onClick={e => {
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
							.then(_ => {
								setTimeout(() => {
									if (_?.directives) {
										console.log("assignRepository", {
											directives: _?.directives,
										});
										// a little fragile, but we're trying to get the entity guid back
										if (props.onSuccess) {
											props.onSuccess({
												entityGuid: _?.directives.find(d => d.type === "assignRepository")?.data
													?.entityGuid,
											});
										}
									} else if (_?.error) {
										setWarningOrErrors([{ message: _.error }]);
									} else {
										setWarningOrErrors([
											{ message: "Failed to direct to entity dropdown, please refresh" },
										]);
										console.warn("Could not find directive", {
											_: _,
											payload: payload,
										});
									}
								}, 5000);
							})
							.catch(err => {
								setWarningOrErrors([
									{ message: "Failed to direct to entity dropdown, please refresh" },
								]);
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
					}}
				>
					Associate
				</Button>
			</Tooltip>
			{props.children}
		</NoContent>
	);
});
