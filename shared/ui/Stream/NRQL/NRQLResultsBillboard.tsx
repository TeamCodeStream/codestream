import React from "react";
import { NRQLResult } from "@codestream/protocols/agent";
import styled from "styled-components";
import { validateAndConvertUnixTimestamp } from "./utils";

const BillboardValueWrapper = styled.div`
	margin: 10px;
`;

const BillboardValue = styled.div`
	font-size: 20vw;
	font-weight: normal;
	margin: 0;
	line-height: 1;
`;

const BillboardValueType = styled.div`
	font-size: 8vw;
`;

interface Props {
	results: NRQLResult[];
	/**
	 * Name of the collection
	 */
	eventType?: string;
}

export const NRQLResultsBillboard = (props: Props) => {
	const formatLargeNumber = (number, isTimestamp) => {
		if (isTimestamp) {
			return validateAndConvertUnixTimestamp(number, true);
		}

		const units = ["K", "M", "B", "T"];

		let roundedNumber = number;
		let unit = "";

		// Divide the number by 1000 and increase the unit until the number is smaller than 1000
		for (let i = 0; i < units.length; i++) {
			if (roundedNumber >= 1000) {
				roundedNumber /= 1000;
				unit = units[i];
			} else {
				break;
			}
		}
		// Round the number to 1 decimal place
		roundedNumber = Math.round(roundedNumber * 10) / 10;

		return `${roundedNumber} ${unit}`;
	};

	const hasTimestampKey = str => {
		if (str.includes("timestamp")) {
			return true;
		}
		return false;
	};

	let firstResult = props.results[0];
	let onlyKey = Object.keys(firstResult)[0];
	const isTimestamp = hasTimestampKey(onlyKey);
	const value = firstResult[onlyKey];

	return (
		<BillboardValueWrapper>
			<BillboardValue title={value}>
				{typeof value === "number" ? formatLargeNumber(value, isTimestamp) : value}
			</BillboardValue>
			{props.eventType && !isTimestamp && (
				<BillboardValueType>
					{props.eventType.replace(/_/g, " ")}
					{typeof value === "number" && value > 1 && <>s</>}
				</BillboardValueType>
			)}
			{props.eventType && isTimestamp && <BillboardValueType>Timestamp</BillboardValueType>}
		</BillboardValueWrapper>
	);
};
