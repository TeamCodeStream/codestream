import React, { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "../../Icon";
import { Button } from "@codestream/webview/src/components/Button";
import { OutlineBox, FlexRow } from "./PullRequest";

export const ApproveBox = props => {
	return (
		<OutlineBox>
			<FlexRow>
				<div style={{ position: "relative" }}>
					<Icon name="person" className="bigger" />
					<Icon name="check" className="overlap" />
				</div>
				<Button className="action-button">Approve</Button>
				<div className="pad-left">
					Approval is optional <Icon name="info" title="About this feature" placement="top" />
				</div>
			</FlexRow>
		</OutlineBox>
	);
};
