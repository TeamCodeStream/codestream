import { stringify } from "csv-stringify/browser/esm/sync";
import { useAppSelector } from "../utilities/hooks";
import { CodeStreamState } from "../store";
import { mapFilter } from "../utils";
import { createSelector } from "reselect";
import { CodemarkType } from "../../util/src/protocol/agent/api.protocol.models";

const getSearchableCodemarks = createSelector(
	(state: CodeStreamState) => state.codemarks,
	codemarksState => {
		return mapFilter(Object.values(codemarksState), codemark => {
			if (
				!codemark.isChangeRequest &&
				(codemark.type === CodemarkType.Comment || codemark.type === CodemarkType.Issue)
			) {
				return codemark;
			}
			return;
		});
	}
);

export function generateCsv() {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const codemarks = useAppSelector(getSearchableCodemarks);

		return { codemarks, webviewFocused: state.context.hasFocus, repos: state.repos };
	});

	// repo,file,commitSha,location,date,author,id,parentId,type,title,body,assignees
	if (!derivedState.codemarks.length) return;
	let output: {}[] = [];
	derivedState.codemarks.forEach(codemark => {
		if (!codemark) return;
		if (codemark.markers) {
			codemark.markers.map(marker => {
				if (!marker) return;
				const location: any = marker.referenceLocations
					? marker.referenceLocations[marker.referenceLocations.length - 1] || {}
					: {};
				const repo = derivedState.repos[marker.repoId];
				const repoName = repo ? repo.name : "";
				output.push({
					repo: repoName,
					file: marker.file,
					commitSha: location.commitHash,
					location: location.location ? location.location[0] : "",
					date: codemark.createdAt,
					author: codemark.creatorId,
					id: codemark.id,
					parentId: codemark.parentPostId,
					type: codemark.type,
					title: codemark.title || codemark.text,
					body: codemark.title ? codemark.text : "",
					assignees: codemark.assignees,
				});
			});
		}
	});

	try {
		const stringData = stringify(output, {
			header: true,
			columns: {
				repo: "repo",
				file: "file",
				commitSha: "commitSha",
				location: "location",
				date: "date",
				author: "author",
				id: "id",
				parentId: "parentId",
				type: "type",
				title: "title",
				body: "body",
				assignees: "assignees",
			},
		});
		return stringData;
	} catch (ex) {
		console.log(ex);
	}

	return;
}
