import styled from "styled-components";
import React from "react";
import { Button } from "../src/components/Button";
import Icon from "./Icon";
import { Modal } from "./Modal";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { BoxedContent } from "../src/components/BoxedContent";
import { CSText } from "../src/components/CSText";
import { getPRLabelForProvider } from "../store/providers/reducer";

const VerticallyCentered = styled.div`
	height: inherit;
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-width: 350px;
	max-width: 450px;
	margin: 0 auto;
	.octicon {
		vertical-align: middle;
	}
`;

const Section = styled.div`
	display: flex;
	align-items: flex-start;
	margin: 15px 0;
	> .icon {
		display: inline-block;
		transform: scale(1.25);
		margin-right: 10px;
		color: var(--text-color-highlight);
	}
	h3 {
		color: var(--text-color-highlight);
		margin-top: 0;
		font-weight: normal;
	}
	color: var(--text-color-subtle);
`;

export interface PrePRProviderInfoModalProps {
	onClose: () => void;
	providerName: string;
	action: () => void;
	helpText?: string;
}

export const PrePRProviderInfoModal = (props: PrePRProviderInfoModalProps) => {
	const { displayName, icon, supportsPRManagement } = PROVIDER_MAPPINGS[props.providerName];

	const prLabel = getPRLabelForProvider(props.providerName);

	const onClickConnect = e => {
		e.preventDefault();
		props.action();
		props.onClose();
	};

	return (
		<Modal {...props}>
			<VerticallyCentered>
				<BoxedContent title={`${displayName} Integration`}>
					<Section>
						<Icon name="issue" />
						<div>
							<CSText as="h3">Create Issues</CSText>
							<CSText>
								See a problem in the code? Simply select it and create an issue on {displayName}{" "}
								directly from CodeStream.
							</CSText>
						</div>
					</Section>
					<Section>
						<Icon name="issue" />
						<div>
							<CSText as="h3">View Your Assigned Issues</CSText>
							<CSText>
								View the issues assigned to you and in one step: create a branch, move the ticket,
								and update your status.
							</CSText>
						</div>
					</Section>
					{supportsPRManagement && (
						<Section>
							<Icon name="pull-request" />
							<div>
								<CSText as="h3">Create &amp; Review {prLabel.PullRequest}s</CSText>
								<CSText>
									Create a {prLabel.PR} for your work in progress, and perform code review on{" "}
									{prLabel.PR}s assigned to you.
								</CSText>
							</div>
						</Section>
					)}
					<Section>
						<Icon name="pull-request" />
						<div>
							<CSText as="h3">View {prLabel.PullRequest} Comments</CSText>
							<CSText>
								Display comments on {prLabel.pullrequest}s right alongside the code blocks they
								refer to. {props.helpText ? `(${props.helpText})` : null}
							</CSText>
						</div>
					</Section>
					<Button fillParent prependIcon={<Icon name={icon!} />} onClick={onClickConnect}>
						<strong>Connect to {displayName}</strong>
					</Button>
				</BoxedContent>
			</VerticallyCentered>
		</Modal>
	);
};
