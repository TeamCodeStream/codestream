import React from "react";
import { Link } from "../../Link";
import { Modal } from "../../Modal";
import { Dialog } from "@codestream/webview/src/components/Dialog";
import styled from "styled-components";
import Icon from "../../Icon";
import copy from "copy-to-clipboard";

const Flex = styled.div`
	margin-top: 10px;
	display: flex;
	align-items: flex-start;
	pre {
		margin: 0 0 20px 0 !important;
		flex-grow: 1;
	}
	.icon {
		margin-left: 10px;
	}
`;
export const CommandLineInstructions = props => {
	const Step1 = `git fetch origin\ngit checkout -b "${props.pr.sourceBranch}" "origin/${props.pr.sourceBranch}"`;
	const Step3 = `git fetch origin\ngit checkout "master"\ngit merge --no-ff "${props.pr.sourceBranch}"`;
	const Step4 = 'git push origin "master"';

	const pre = copy => <pre>{copy}</pre>;
	return (
		<Modal translucent>
			<Dialog title="Check out, review, and merge locally" onClose={props.onClose}>
				<div style={{ height: "10px" }} />
				<b>Step 1.</b> Fetch and check out the branch for this merge request
				<Flex>
					<pre className="code">{Step1}</pre>
					<Icon name="copy" onClick={() => copy(Step1)} />
				</Flex>
				<b>Step 2.</b> Review the changes locally
				<div style={{ height: "20px" }} />
				<b>Step 3.</b> Merge the branch and fix any conflicts that come up
				<Flex>
					<pre className="code">{Step3}</pre>
					<Icon name="copy" onClick={() => copy(Step3)} />
				</Flex>
				<b>Step 4.</b> Push the result of the merge to GitLab
				<Flex>
					<pre className="code">{Step4}</pre>
					<Icon name="copy" onClick={() => copy(Step4)} />
				</Flex>
				<b>Tip:</b> You can also checkout merge requests locally by following{" "}
				<Link href="http://gitlab.codestream.us/help/user/project/merge_requests/reviewing_and_managing_merge_requests.md#checkout-merge-requests-locally-through-the-head-ref">
					these guidelines.
				</Link>
			</Dialog>
		</Modal>
	);
};
