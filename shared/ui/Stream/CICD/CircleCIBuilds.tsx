import { ThirdPartyBuild } from "@codestream/protocols/agent";
import { PaneNode, PaneNodeName } from "@codestream/webview/src/components/Pane";
import React, { Reducer, useReducer } from "react";
import { BuildStatus } from "./BuildStatus";

interface Props {
	projects: {
		[key: string]: ThirdPartyBuild[];
	};
}

export const CircleCIBuilds = (props: Props) => {
	/*
	const derivedState = useSelector((state: CodeStreamState) => {
		const { editorContext, repos } = state;

		return {
			remotes: editorContext.scmInfo?.scm?.remotes || [],
		};
	});

	const [projects, setProjects] = useState<object>();
	const [loading, setLoading] = useState(true);

	React.useEffect(() => {
		const fetchProjects = async (remotes: { url: string }[]) => {
			for (const remote of remotes) {
				const result = await HostApi.instance.send(FetchThirdPartyBuildsRequestType, {
					providerId: "circleci*com",
					remote: remote.url,
				});
				if (result.projects) {
					setProjects(result.projects);
					break;
				}
			}
			setLoading(false);
		};
		if (derivedState.remotes.length > 0) {
			fetchProjects(derivedState.remotes).catch(() => {});
		}
	}, [derivedState.remotes]);
	*/

	const [projectsCollapsed, toggleProjectCollapsed] = useReducer<
		Reducer<{ [key: string]: boolean }, string>
	>(
		(state, project) => ({
			...state,
			[project]: !state[project],
		}),
		{}
	);

	return (
		<>
			{props.projects &&
				Object.entries(props.projects).map(([name, workflows]) => (
					<PaneNode key={`${name}`}>
						<PaneNodeName
							onClick={() => toggleProjectCollapsed(name)}
							title={name}
							collapsed={projectsCollapsed[name]}
						></PaneNodeName>
						<div style={{ padding: "0 20px 0 40px" }}>
							{!projectsCollapsed[name] &&
								workflows.map(workflow => {
									const data = {
										...workflow,
										title: workflow.id,
									};
									return <BuildStatus {...data} />;
								})}
						</div>
					</PaneNode>
				))}
		</>
	);
};
