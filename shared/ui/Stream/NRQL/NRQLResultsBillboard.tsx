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
	// Name of the collection
	eventType?: string;
	hasAlias: boolean;
}

export const NRQLResultsBillboard = (props: Props) => {
	const { results, eventType, hasAlias } = props;

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

	const firstResult = results[0];
	const onlyKey = Object.keys(firstResult)[0];
	const isTimestamp = hasTimestampKey(onlyKey);
	const value = firstResult[onlyKey];
	const formattedValue = typeof value === "number" ? formatLargeNumber(value, isTimestamp) : value;
	const eventTypeText =
		eventType && !isTimestamp && (hasAlias ? onlyKey : eventType).replace(/_/g, " ");

	return (
		<BillboardValueWrapper>
			<BillboardValue title={value}>{formattedValue}</BillboardValue>
			{eventTypeText && (
				<BillboardValueType>
					{eventTypeText}
					{typeof value === "number" && value > 1 && "s"}
				</BillboardValueType>
			)}
			{eventType && isTimestamp && <BillboardValueType>Timestamp</BillboardValueType>}
		</BillboardValueWrapper>
	);
};
