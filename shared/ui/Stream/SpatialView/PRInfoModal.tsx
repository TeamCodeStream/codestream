import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { Modal } from "../Modal";
import { Button } from "../../src/components/Button";
import { ButtonGroup } from "../../src/components/ButtonGroup";
import { connectProvider, openPanel } from "../actions";
import Icon from "../Icon";
import { CodeStreamState } from "@codestream/webview/store";
import { mapFilter } from "@codestream/webview/utils";
import { ThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { PROVIDER_MAPPINGS } from "../CrossPostIssueControls/types";
import { BoxedContent } from "@codestream/webview/src/components/BoxedContent";
import { CSText } from "@codestream/webview/src/components/CSText";
import { fetchDocumentMarkers } from "@codestream/webview/store/documentMarkers/actions";

const VerticallyCentered = styled.div`
	height: inherit;
	display: flex;
	flex-direction: column;
	justify-content: center;
	max-width: 450px;
	margin: 0 auto;
`;

export const Spacer = styled.div`
	height: 10px;
`;

export const PRInfoModal = (props: { onClose: () => void }) => {
	const dispatch = useDispatch();
	const allProviders = useSelector((state: CodeStreamState) => state.providers);
	const textEditorUri = useSelector((state: CodeStreamState) => state.editorContext.textEditorUri);

	const buttons = React.useMemo(
		() =>
			mapFilter(Object.values(allProviders), (provider: ThirdPartyProviderConfig) => {
				if (
					provider.name === "github" ||
					provider.name === "bitbucket" ||
					provider.name === "gitlab"
					// provider.name === "github_enterprise" ||
				) {
					const { icon, displayName } = PROVIDER_MAPPINGS[provider.name];

					return (
						<Button
							key={provider.id}
							size="large"
							prependIcon={<Icon name={icon!} />}
							onClick={async e => {
								e.preventDefault();
								if (provider.forEnterprise) {
									dispatch(openPanel(`configure-enterprise-${provider.name}-${provider.id}-true`));
								} else {
									await dispatch(connectProvider(provider.id, "PR Toggle"));
									if (textEditorUri) dispatch(fetchDocumentMarkers(textEditorUri));
									props.onClose();
								}
							}}
						>
							<strong>
								Connect to{" "}
								{provider.isEnterprise
									? `${provider.host}*`
									: `${displayName}${provider.forEnterprise ? "*" : ""}`}
							</strong>
						</Button>
					);
				}

				return;
			}),
		[allProviders]
	);

	return (
		<Modal {...props}>
			<VerticallyCentered>
				<BoxedContent title="Pull Requests">
					<CSText>
						Display pull request code comments right alongside the code blocks they refer to.
					</CSText>
					<CSText>Select the service you use for pull requests below to get started.</CSText>
					<Spacer />
					<ButtonGroup direction="column">{buttons}</ButtonGroup>

					{/* <Spacer /><CSText as="small">* Requires GitHub Enterprise version 2.17 or higher</CSText> */}
				</BoxedContent>
			</VerticallyCentered>
		</Modal>
	);
};
