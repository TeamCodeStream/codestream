import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { closeModal } from "./actions";
import ScrollBox from "./ScrollBox";
import { Dialog } from "../src/components/Dialog";
import Button from "./Button";
import { setUserPreference } from "../Stream/actions";
import { setRefreshAnomalies } from "../store/context/actions";
import { isNil as _isNil } from "lodash-es";
import { Dropdown } from "../Stream/Dropdown";
import styled from "styled-components";
import { CLMSettings as ICLMSettings, DEFAULT_CLM_SETTINGS } from "@codestream/protocols/api";
import { Checkbox } from "@codestream/webview/src/components/Checkbox";

interface Props {}
const NumberInput = styled.input`
	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		display: none;
	}
`;

export const CLMSettings = React.memo(function CLMSettings(props: Props) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || ({} as ICLMSettings);
		const activeO11y = state.preferences.activeO11y;
		const currentO11yRepoId = state.preferences.currentO11yRepoId;
		return {
			clmSettings,
			activeO11y,
			currentO11yRepoId,
		};
	});
	const { clmSettings } = derivedState;
	const [compareDataLastValue, setCompareDataLastValue] = useState<string>(
		!_isNil(clmSettings.compareDataLastValue)
			? clmSettings.compareDataLastValue
			: DEFAULT_CLM_SETTINGS.compareDataLastValue
	);
	const [compareDataLastReleaseValue, setCompareDataLastReleaseValue] = useState<boolean>(
		!_isNil(clmSettings.compareDataLastReleaseValue)
			? clmSettings.compareDataLastReleaseValue
			: DEFAULT_CLM_SETTINGS.compareDataLastReleaseValue
	);
	const [againstDataPrecedingValue, setAgainstDataPrecedingValue] = useState<string>(
		!_isNil(clmSettings.againstDataPrecedingValue)
			? clmSettings.againstDataPrecedingValue
			: DEFAULT_CLM_SETTINGS.againstDataPrecedingValue
	);
	const [minimumChangeValue, setMinimumChangeValue] = useState<string>(
		!_isNil(clmSettings.minimumChangeValue)
			? clmSettings.minimumChangeValue
			: DEFAULT_CLM_SETTINGS.minimumChangeValue
	);
	const [minimumBaselineValue, setMinimumBaselineValue] = useState<string>(
		!_isNil(clmSettings.minimumBaselineValue)
			? clmSettings.minimumBaselineValue
			: DEFAULT_CLM_SETTINGS.minimumBaselineValue
	);
	const [minimumErrorRateValue, setMinimumErrorRateValue] = useState<string>(
		!_isNil(clmSettings.minimumErrorRateValue)
			? clmSettings.minimumErrorRateValue
			: DEFAULT_CLM_SETTINGS.minimumErrorRateValue
	);
	const [minimumAverageDurationValue, setMinimumAverageDurationValue] = useState<string>(
		!_isNil(clmSettings.minimumAverageDurationValue)
			? clmSettings.minimumAverageDurationValue
			: DEFAULT_CLM_SETTINGS.minimumAverageDurationValue
	);
	const populateDropdownItems = action => {
		let options: { label: string; key: string; action: Function }[] = [];

		for (let i = 1; i <= 30; i++) {
			options.push({
				label: `${i}`,
				key: `${i}`,
				action: () => action(`${i}`),
			});
		}

		return options;
	};
	const compareDataLastItems = populateDropdownItems(setCompareDataLastValue);
	const againstDataPrecedingItems = populateDropdownItems(setAgainstDataPrecedingValue);

	const handleClickSubmit = e => {
		e.preventDefault();
		e.stopPropagation();

		dispatch(
			setUserPreference({
				prefPath: ["clmSettings"],
				value: {
					["compareDataLastValue"]: compareDataLastValue,
					["compareDataLastReleaseValue"]: compareDataLastReleaseValue,
					["againstDataPrecedingValue"]: againstDataPrecedingValue,
					["minimumChangeValue"]: minimumChangeValue,
					["minimumBaselineValue"]: minimumBaselineValue,
					["minimumErrorRateValue"]: minimumErrorRateValue,
					["minimumAverageDurationValue"]: minimumAverageDurationValue,
				},
			})
		);
		dispatch(setRefreshAnomalies(true));

		dispatch(closeModal());
	};

	const handleNumberChange = React.useCallback(e => {
		e.preventDefault();
		let { value, min, max, name } = e.target;
		value = Math.max(Number(min), Math.min(Number(max), Number(value)));

		switch (name) {
			case "min-change":
				setMinimumChangeValue(value);
				break;
			case "min-baseline":
				setMinimumBaselineValue(value);
				break;
			case "min-error-rate":
				setMinimumErrorRateValue(value);
				break;
			case "min-average-duration":
				setMinimumAverageDurationValue(value);
				break;
			case "compare-last":
				setCompareDataLastValue(value);
				break;
			case "against-preceding":
				setAgainstDataPrecedingValue(value);
				break;
			default:
				throw new Error("Invalid input name");
		}
	}, []);

	// @TODO: convert most this jsx to styled-components
	return (
		<Dialog wide title="Code-Level Metrics Settings" onClose={() => dispatch(closeModal())}>
			<ScrollBox>
				<form className="standard-form vscroll">
					<fieldset className="form-body">
						<div id="controls">
							<div
								style={{
									marginTop: "5px",
									display: "flex",
									justifyContent: "space-between",
									// alignItems: "center",
								}}
							>
								{/*<div style={{ margin: "0px 8px 0px 22px" }}>*/}
								<div>Compare data from the last:</div>
								<div style={{ whiteSpace: "nowrap" }}>
									<Dropdown
										selectedValue={compareDataLastValue}
										items={compareDataLastItems}
										noModal={true}
									/>{" "}
									days
								</div>
							</div>

							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>
									<Checkbox
										name="compare-data-last-release"
										checked={compareDataLastReleaseValue}
										onChange={() => setCompareDataLastReleaseValue(!compareDataLastReleaseValue)}
									/>
								</div>
								<div>Compare data from the last release when available</div>
							</div>

							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Against data from the preceding:</div>
								<div style={{ marginLeft: "auto" }}>
									<Dropdown
										selectedValue={againstDataPrecedingValue}
										items={againstDataPrecedingItems}
										noModal={true}
									/>{" "}
									days
								</div>
							</div>

							<div style={{ borderTop: "1px solid", marginTop: "20px", paddingTop: "20px" }}>
								These settings control how CodeStream determines whether or not a method’s
								performance is anomalous. If you’re not seeing anomalies, decrease the thresholds.
								Particularly the “minimum change”. If you’re seeing too many false positives,
								increase the thresholds.
							</div>

							<div style={{ marginTop: "20px", display: "flex" }}>
								<div>Minimum change to be anomalous:</div>
								<div style={{ marginLeft: "auto" }}>
									<NumberInput
										key="min-change-key"
										name="min-change"
										type="number"
										min="0"
										max="100"
										value={minimumChangeValue}
										onChange={handleNumberChange}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>%</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum baseline sample rate:</div>
								<div style={{ marginLeft: "auto" }}>
									<NumberInput
										key="min-baseline-key"
										name="min-baseline"
										type="number"
										min="0"
										max="100"
										value={minimumBaselineValue}
										onChange={handleNumberChange}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>rpm</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum error rate:</div>
								<div style={{ marginLeft: "auto" }}>
									<NumberInput
										key="min-error-rate-key"
										name="min-error-rate"
										type="number"
										min="0"
										max="100"
										value={minimumErrorRateValue}
										onChange={handleNumberChange}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>%</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum average duration:</div>
								<div style={{ marginLeft: "auto" }}>
									<NumberInput
										name="min-average-duration"
										value={minimumAverageDurationValue}
										type="number"
										min="0"
										max="100"
										onChange={handleNumberChange}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>ms</div>
							</div>
							<div style={{ margin: "30px 0 10px 0" }} className="button-group">
								<Button
									style={{ width: "100px" }}
									className="control-button cancel"
									type="button"
									onClick={() => dispatch(closeModal())}
								>
									Cancel
								</Button>
								<Button
									style={{ width: "100px" }}
									className="control-button"
									type="button"
									loading={false}
									onClick={e => handleClickSubmit(e)}
								>
									Submit
								</Button>
							</div>
						</div>
					</fieldset>
				</form>
			</ScrollBox>
		</Dialog>
	);
});
