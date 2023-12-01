import { MapReposRequestType, RepoMap } from "@codestream/protocols/agent";
import React from "react";
import { ShellPromptFolderRequestType } from "../ipc/host.protocol";
import { HostApi } from "../webview-api";
import Button from "./Button";
import Tooltip from "./Tooltip";

interface Props {
	repoId: string | undefined;
	repoName: string;
	callback: Function;
}
interface State {
	locateLoading: boolean;
}
export class LocateRepoButton extends React.Component<Props, State> {
	state: State = {
		locateLoading: false,
	};
	mounted = false;

	async locateCode() {
		const { repoId, repoName } = this.props;
		if (!repoId) return;

		this.setState({
			locateLoading: true,
		});
		let response = await HostApi.instance.send(ShellPromptFolderRequestType, {
			message: `Please select the root folder for the ${repoName} repository.`,
		});
		try {
			if (response && response.path) {
				const result = await HostApi.instance.send(MapReposRequestType, {
					repos: [{ repoId: repoId, ...response } as RepoMap],
				});

				if (this.props.callback) {
					await this.props.callback(result && result.success);
				}
			}
		} catch (e) {
		} finally {
			if (this.mounted) this.setState({ locateLoading: false });
		}
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		return (
			<Tooltip title="Locate this repository on your file system" delay={1} placement="topRight">
				<Button
					className="btn-locate-repo"
					loading={this.state.locateLoading}
					onClick={event => {
						event.stopPropagation();
						this.locateCode();
					}}
				>
					Locate...
				</Button>
			</Tooltip>
		);
	}
}
