import React from "react";
import { ReviewChangesetFileInfo, FileStatus } from "@codestream/protocols/api";
import styled from "styled-components";
import Tooltip from "../Tooltip";
import cx from "classnames";
import { pathBasename } from "@codestream/webview/utilities/fs";

interface Props {
	className?: string;
	onClick?: React.MouseEventHandler;
	selected?: boolean;
	noHover?: boolean;
	icon?: any;
	actionIcons?: any;
	tooltip?: any;
	depth?: number;
	viewMode?: "files" | "tree";
}

export const ChangesetFile = styled((props: ReviewChangesetFileInfo & Props) => {
	const { linesAdded, linesRemoved, status } = props;

	const filename = props.viewMode === "tree" ? pathBasename(props.file) : props.file;
	return (
		<div
			className={cx("row-with-icon-actions ellipsis-left-container", props.className, {
				selected: props.selected,
				"no-hover": props.noHover,
				"with-file-icon": props.icon,
				"with-action-icons": !!props.actionIcons
			})}
			onClick={props.onClick}
			style={props.depth ? { paddingLeft: `${props.depth * 12}px` } : {}}
		>
			{props.icon}
			<Tooltip title={props.tooltip} placement="bottom" delay={1}>
				<span className="file-info ellipsis-left">
					<bdi dir="ltr">{filename}</bdi>
				</span>
			</Tooltip>
			{linesAdded > 0 && <span className="added">+{linesAdded} </span>}
			{linesRemoved > 0 && <span className="deleted">-{linesRemoved}</span>}
			{status === FileStatus.untracked && <span className="added">new </span>}
			{status === FileStatus.added && <span className="added">added </span>}
			{status === FileStatus.copied && <span className="added">copied </span>}
			{status === FileStatus.unmerged && <span className="deleted">conflict </span>}
			{status === FileStatus.deleted && <span className="deleted">deleted </span>}
			{props.actionIcons}
		</div>
	);
})`
	width: 100%;
`;
