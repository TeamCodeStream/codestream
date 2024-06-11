import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HostApi } from "../webview-api";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { CodeStreamState } from "../store";
import { Dialog } from "../src/components/Dialog";
import { closeModal } from "./actions";
import {
	EntityAccount,
	GetObservabilityEntityByGuidRequestType,
} from "@codestream/protocols/agent";
import { useDidMount } from "../utilities/hooks";
import Icon from "../Stream/Icon";

const ButtonRow = styled.div`
	text-align: center;
	margin-top: 20px;
	button {
		width: 100%;
	}
`;

export const ErrorRoadblock = props => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentServiceSearchEntity: state.context.currentServiceSearchEntity,
		};
	});
	const [loadingEntityAccount, setLoadingEntityAccount] = useState(false);
	const [entityAccount, setEntityAccount] = useState<EntityAccount | undefined>(undefined);

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		dispatch(closeModal());
	};

	useDidMount(() => {
		if (derivedState.currentServiceSearchEntity) {
			fetchEntityAccount(derivedState.currentServiceSearchEntity);
		}
	});

	const fetchEntityAccount = async entityGuid => {
		if (derivedState.currentServiceSearchEntity) {
			setLoadingEntityAccount(true);
			const response = await HostApi.instance.send(GetObservabilityEntityByGuidRequestType, {
				id: derivedState.currentServiceSearchEntity,
			});
			setLoadingEntityAccount(false);
			setEntityAccount(response.entity);
		}
	};

	return (
		<Dialog title="Cannot Open Error" onClose={() => dispatch(closeModal())}>
			{!loadingEntityAccount && entityAccount && (
				<form className="standard-form">
					<fieldset className="form-body" style={{ width: "18em", padding: "20px 0" }}>
						<div id="controls">
							<div className="small-spacer" />
							<div style={{ marginBottom: "35px" }}>
								Associate the {entityAccount.entityName} service with a repository so that you can
								investigate this error.
							</div>
							<ButtonRow>
								<Button onClick={onSubmit}>OK</Button>
							</ButtonRow>
						</div>
					</fieldset>
				</form>
			)}
			{loadingEntityAccount && (
				<div
					style={{
						width: "234px",
						height: "160px",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<Icon style={{ transform: "scale(2)" }} name="sync" loading={true} />
				</div>
			)}
		</Dialog>
	);
};
