import { api } from "@codestream/webview/store/codeErrors/thunks";
import { keyBy as _keyBy } from "lodash-es";
import React, { PropsWithChildren, useState } from "react";
import { useDispatch } from "react-redux";

import { GetObservabilityEntitiesRequestType, WarningOrError } from "@codestream/protocols/agent";

import { Button } from "../src/components/Button";
import { NoContent } from "../src/components/Pane";
import { useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { DropdownButton } from "./DropdownButton";
import { WarningBox } from "./WarningBox";
import Tooltip from "./Tooltip";
import { logError } from "../logger";

interface EntityAssociatorProps {
	title?: string;
	label?: string | React.ReactNode;
	remote: string;
	remoteName: string;
	onSuccess?: Function;
	onFinally?: Function;
}

export const EntityAssociator = React.memo((props: PropsWithChildren<EntityAssociatorProps>) => {
	const dispatch = useDispatch<any>();

	const [entities, setEntities] = useState<{ guid: string; name: string }[]>([]);
	const [selected, setSelected] = useState<{ guid: string; name: string } | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);

	useDidMount(() => {
		HostApi.instance
			.send(GetObservabilityEntitiesRequestType, { appName: props.remoteName })
			.then(_ => {
				setEntities(_.entities);
			});
	});

	const items = entities?.length
		? (
				[
					{
						type: "search",
						placeholder: "Search...",
						action: "search",
						key: "search",
					},
				] as any
		  ).concat(
				entities.map(_ => {
					return {
						key: _.guid,
						label: _.name,
						searchLabel: _.name,
						action: () => {
							setSelected(_);
						},
					};
				})
		  )
		: [];

	return (
		<NoContent style={{ marginLeft: "40px" }}>
			{props.title && <h3>{props.title}</h3>}
			<p style={{ marginTop: 0 }}>{props.label}</p>
			{warningOrErrors && <WarningBox items={warningOrErrors} />}
			<DropdownButton
				items={items}
				selectedKey={selected ? selected.guid : undefined}
				variant={"secondary"}
				//size="compact"
				wrap
			>
				{selected ? selected.name : "Select entity"}
			</DropdownButton>{" "}
			<Tooltip placement="bottom" title={`Associate with ${props.remote}`}>
				<Button
					isLoading={isLoading}
					disabled={isLoading || !selected}
					onClick={e => {
						e.preventDefault();
						setIsLoading(true);
						setWarningOrErrors(undefined);

						const payload = {
							url: props.remote,
							name: props.remoteName,
							applicationEntityGuid: selected?.guid,
							entityId: selected?.guid,
							parseableAccountId: selected?.guid,
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
