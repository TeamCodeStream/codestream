import React from "react";
import Icon from "./Icon";
import { CodeStreamState } from "@codestream/webview/store";
import { setUserPreference } from "./actions";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { shallowEqual } from "react-redux";
import { PaneNode, PaneNodeName } from "../src/components/Pane";
import { RepoHeader } from "./Observability";

interface Props {}

export const ObservabilityServiceSearch = React.memo((props: Props) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const serviceSearchDropdownIsExpanded = preferences?.serviceSearchDropdownIsExpanded ?? false;

		return {
			serviceSearchDropdownIsExpanded,
		};
	}, shallowEqual);

	const handleRowOnClick = () => {
		const { serviceSearchDropdownIsExpanded } = derivedState;

		dispatch(
			setUserPreference({
				prefPath: ["serviceSearchDropdownIsExpanded"],
				value: !serviceSearchDropdownIsExpanded,
			})
		);
	};

	return (
		<>
			<PaneNode>
				<PaneNodeName
					data-testid={`observability-service-search`}
					title={
						<RepoHeader>
							<Icon style={{ transform: "scale(0.7)", display: "inline-block" }} name="search" />{" "}
							<span
								style={{
									fontSize: "11px",
									fontWeight: "bold",
									margin: "1px 2px 0px 0px",
								}}
							>
								SERVICE SEARCH
							</span>
							<span
								style={{
									fontSize: "11px",
									marginTop: "1px",
									paddingLeft: "2px",
								}}
								className="subtle"
							></span>
						</RepoHeader>
					}
					labelIsFlex={true}
					onClick={e => {}}
					collapsed={false}
					showChildIconOnCollapse={true}
					actionsVisibleIfOpen={true}
					customPadding="2px 10px 2px 4px"
				>
					icon?
				</PaneNodeName>
				Dropdown Content here
			</PaneNode>
		</>
	);
});
