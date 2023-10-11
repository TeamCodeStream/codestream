import cx from "classnames";
import * as path from "path-browserify";
import React, { useState } from "react";
import styled from "styled-components";
import Icon from "./Icon";

interface Props {
	files: any;
	indent?: number;
}

const LI = styled.li`
	&[data-depth="0"] {
		padding-left: 60px !important;
	}
	&[data-depth="1"] {
		padding-left: 80px !important;
	}
`;

export const FileTree = (props: Props) => {
	const [nodeClosed, setNodeClosed] = useState({});
	let currentDirectory = "";
	let depth = 1;

	const splitPath = (filename: string): [string, string] => {
		const dir = path.dirname(filename);
		return [dir, path.basename(filename)];
	};

	const toggleClosed = directory => {
		setNodeClosed({ ...nodeClosed, [directory]: !nodeClosed[directory] });
	};

	const renderDirectory = directory => {
		currentDirectory = directory;
		const padding = (props.indent || 0) + depth * 20;
		depth++;
		return (
			<li
				className={cx("directory", { closed: nodeClosed[directory] })}
				onClick={e => toggleClosed(directory)}
				style={{ paddingLeft: padding }}
			>
				<Icon name="chevron-down" />
				{directory}
			</li>
		);
	};

	const renderFile = file => {
		// const [directory, fileName] = splitPath(file[0]);
		const fileName = file[0];
		return (
			<>
				{/* directory === currentDirectory || renderDirectory(directory) */}
				<li
					className="file row-with-icon-actions ellipsis-left-container"
					style={{ paddingLeft: (props.indent || 0) + depth * 20 }}
				>
					{file[3] && <Icon name="alert" className="merge" />}
					<span className={"ellipsis-left" + (file[3] ? " merge" : "")}>
						<bdi dir="ltr">{fileName}</bdi>
					</span>
					<span className="added">+{file[1]} </span>
					<span className="deleted">-{file[2]} </span>
				</li>
			</>
		);
	};

	return props.files.sort().map(file => renderFile(file));
};
