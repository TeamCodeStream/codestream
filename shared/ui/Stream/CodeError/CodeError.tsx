import React from "react";
import { DelayedRender } from "@codestream/webview/Container/DelayedRender";
import { Loading } from "@codestream/webview/Container/Loading";
import { CodeStreamState } from "@codestream/webview/store";
import { getCodeError, getErrorGroup } from "@codestream/webview/store/codeErrors/reducer";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeErrorProps } from "./CodeError.Types";
import { BaseCodeError } from "./BaseCodeError";

export const CodeError = (props: CodeErrorProps) => {
	const { codeError, errorGroup } = useAppSelector((state: CodeStreamState) => {
		const codeError = props.codeError ?? (props.id && getCodeError(state.codeErrors, props.id));
		const errorGroup =
			props.errorGroup ?? (codeError && getErrorGroup(state.codeErrors, codeError));

		return {
			codeError,
			errorGroup,
		};
	});

	if (!codeError || !errorGroup) {
		return (
			<DelayedRender>
				<Loading />
			</DelayedRender>
		);
	}

	return <BaseCodeError codeError={codeError} errorGroup={errorGroup} />;
};
