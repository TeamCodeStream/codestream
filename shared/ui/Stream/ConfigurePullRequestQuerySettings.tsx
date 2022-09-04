import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React from "react";
import { Button } from "../src/components/Button";
import { Checkbox } from "../src/components/Checkbox";
import { ButtonRow, Dialog } from "../src/components/Dialog";
import { CodeStreamState } from "../store";
import { setUserPreference } from "./actions";
import { Modal } from "./Modal";

interface Props {
	onClose: Function;
}

export function ConfigurePullRequestQuerySettings(props: Props) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		return {
			allRepos:
				preferences.pullRequestQueryShowAllRepos == null
					? true
					: preferences.pullRequestQueryShowAllRepos,
			hideLabels: preferences.pullRequestQueryHideLabels,
		};
	});

	const [showLabelsField, setShowLabelsField] = React.useState(!derivedState.hideLabels);
	const [repoOnlyField, setRepoOnlyField] = React.useState(!derivedState.allRepos);

	const save = () => {
		dispatch(
			setUserPreference({ prefPath: ["pullRequestQueryShowAllRepos"], value: !repoOnlyField })
		);
		dispatch(
			setUserPreference({ prefPath: ["pullRequestQueryHideLabels"], value: !showLabelsField })
		);
		props.onClose();
	};

	return (
		<Modal translucent>
			<Dialog title="Pull Request Query Settings" narrow onClose={() => props.onClose()}>
				<form className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							<div style={{ margin: "20px 0" }}>
								<Checkbox
									name="repo-only"
									checked={repoOnlyField}
									onChange={() => setRepoOnlyField(!repoOnlyField)}
								>
									Only show PRs from repos that are open in my editor
								</Checkbox>
								<Checkbox
									name="hide-labels"
									checked={showLabelsField}
									onChange={() => setShowLabelsField(!showLabelsField)}
								>
									Show Labels
								</Checkbox>
							</div>
						</div>
						<ButtonRow>
							<Button onClick={save}>Save Settings</Button>
						</ButtonRow>
					</fieldset>
				</form>
			</Dialog>
		</Modal>
	);
}
