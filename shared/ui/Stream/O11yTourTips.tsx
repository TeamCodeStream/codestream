import { Tip, Step, Subtext } from "./ReviewNav";
import React from "react";
import { Button } from "../src/components/Button";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { setUserPreference } from "./actions";

export const StepOneContinue = () => {
	const dispatch = useAppDispatch();

	return (
		<Tip>
			<Step>1</Step>
			<div>
				Log Search & Query Builder
				<Subtext>
					Search logs for any service or entity. Run NRQL queries, and share them with the team via
					.nrql files.
				</Subtext>
				<Button
					onClick={() => {
						dispatch(setUserPreference({ prefPath: ["o11yTour"], value: "services" }));
					}}
				>
					Next &gt;
				</Button>
			</div>
		</Tip>
	);
};

export const StepOneEnd = () => {
	const dispatch = useAppDispatch();

	return (
		<Tip>
			<div>
				Log Search & Query Builder
				<Subtext>
					Search logs for any service or entity. Run NRQL queries, and share them with the team via
					.nrql files.
				</Subtext>
				<Button
					onClick={() => {
						dispatch(setUserPreference({ prefPath: ["o11yTour"], value: "done" }));
					}}
				>
					Done!
				</Button>
			</div>
		</Tip>
	);
};

export const StepTwoPerformanceData = () => {
	const dispatch = useAppDispatch();

	return (
		<Tip>
			<Step>2</Step>
			<div>
				Contextual observability
				<Subtext>See performance data for the services built from this repo.</Subtext>
				<Button
					onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						dispatch(setUserPreference({ prefPath: ["o11yTour"], value: "service-search" }));
					}}
				>
					Next &gt;
				</Button>
			</div>
		</Tip>
	);
};

export const StepTwoEntityAssociator = () => {
	const dispatch = useAppDispatch();

	return (
		<Tip>
			<Step>2</Step>
			<div>
				Contextual observability
				<Subtext>Select the service built from this repo to see how its performing.</Subtext>
				<Button
					onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						dispatch(setUserPreference({ prefPath: ["o11yTour"], value: "service-search" }));
					}}
				>
					Next &gt;
				</Button>
			</div>
		</Tip>
	);
};

export const StepThree = () => {
	const dispatch = useAppDispatch();

	return (
		<Tip>
			<Step>3</Step>
			<div>
				Performance data for any service
				<Subtext>See performance data for any APM, Browser, or OTel service. </Subtext>
				<Button
					onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						dispatch(setUserPreference({ prefPath: ["o11yTour"], value: "done" }));
					}}
				>
					Done!
				</Button>
			</div>
		</Tip>
	);
};
