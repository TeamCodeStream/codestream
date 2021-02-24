import React from "react";
import { PropsWithChildren } from "react";
import styled from "styled-components";
import Tooltip, { Placement } from "./Tooltip";

export const MINUTE = 60;
export const HOUR = MINUTE * 60;
export const DAY = 24 * HOUR;
export const WEEK = DAY * 7;
export const MONTH = (DAY * 365) / 12;
export const YEAR = DAY * 365;

export const plural = (word: string, count: number, many?: string): string => {
	if (count == 1) {
		return word;
	} else if (many) {
		return many;
	} else {
		return word + "s";
	}
};

export const distanceOfTimeInWords = (
	time: number,
	relativeToNow: boolean = true,
	abbreviated?: boolean
): string => {
	const now = new Date().getTime();
	let seconds: number = relativeToNow ? Math.floor((now - time) / 1000) : time;
	const isAgo: boolean = seconds >= 0;

	seconds = Math.abs(seconds);

	if (relativeToNow && seconds < 60) return isAgo ? "just now" : "soon";

	let distance: number;
	let when: string;

	if (seconds < MINUTE) {
		// 1 minute
		when = `${seconds}${abbreviated ? "s" : plural(" second", seconds)}`;
	} else if (seconds < HOUR) {
		// 1 hour
		distance = Math.floor(seconds / 60);
		when = `${distance}${abbreviated ? "m" : plural(" minute", distance)}`;
	} else if (seconds < DAY) {
		// 1 day
		distance = Math.round(seconds / (60 * 60));
		when = `${distance}${abbreviated ? "h" : plural(" hour", distance)}`;
	} else if (seconds < WEEK * 2) {
		// 2 weeks
		distance = Math.round(seconds / (60 * 60 * 24));
		when = `${distance}${abbreviated ? "d" : plural(" day", distance)}`;
	} else if (seconds < MONTH * 1.5) {
		// 1.5 months
		distance = Math.round(seconds / (60 * 60 * 24 * 7));
		when = `${distance}${abbreviated ? "w" : plural(" week", distance)}`;
	} else {
		return prettyDateDay(time, abbreviated);
	}

	// if (seconds < YEAR) {
	// 	// # 1 year
	// 	distance = Math.round(seconds / (60 * 60 * 24 * (365 / 12)));
	// 	when = `${distance} ${plural(abbreviated ? "month" : "month", distance)}`;
	// } else {
	// 	distance = Math.round(seconds / (60 * 60 * 24 * 365));
	// 	when = `${distance} ${plural(abbreviated ? "yr" : "year", distance)}`;
	// }

	if (!relativeToNow) {
		return when;
	} else if (isAgo) {
		if (when === "1 day") return abbreviated ? "yest" : "yesterday";
		else return abbreviated ? when : `${when} ago`;
	} else {
		return `in ${when}`;
	}
};

const prettyDateDay = function(time, abbreviated?: boolean) {
	if (time === 0 || time === null || time === undefined) return "";
	var now = new Date().getTime();
	// now = this.adjustedTime(now, options.timezone_info);
	// time = this.adjustedTime(time, options.timezone_info);
	const ELEVEN_MONTHS = 1000 * 60 * 60 * 24 * 30 * 11;

	// if it's within the last 11 months, there's no need to show
	// the year since it'll be the most recent of that month.
	// example: in january, if the date is "Dec 20" we don't
	// need to specify the year if it's the most recent December,
	// even though the years are different
	if (time + ELEVEN_MONTHS > now) {
		return new Intl.DateTimeFormat("en", {
			day: "numeric",
			month: "short"
		}).format(time);
	} else {
		if (abbreviated) {
			return new Intl.DateTimeFormat("en", {
				day: "numeric",
				month: "short",
				year: "2-digit"
			})
				.format(time)
				.replace(/(\d\d)$/, `'$1`);
		} else {
			return new Intl.DateTimeFormat("en", {
				day: "numeric",
				month: "short",
				year: "numeric"
			}).format(time);
		}
	}
};

const prettyDateDayTime = function(time, abbreviated?: boolean) {
	if (time === 0 || time === null || time === undefined) return "";
	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZoneName: "short"
	}).format(time);
};

const prettyTime = function(time) {
	var prettyTime;
	// time = this.adjustedTime(time, options.timezone_info);
	prettyTime = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(time);
	prettyTime = prettyTime.replace(/^0:/, "12:");
	return prettyTime;
};

const sameDateAs = (date1, date2) => {
	return (
		date1.getFullYear() == date2.getFullYear() &&
		date1.getMonth() == date2.getMonth() &&
		date1.getDate() == date2.getDate()
	);
};

const renderRelative = () => {};

interface Props {
	position?: "static" | "fixed";
	title?: string;
	relative?: boolean;
	dateOnly?: boolean;
	className?: string;
	time: number | string;
	edited?: boolean;
	abbreviated?: boolean;
	showTooltip?: boolean;
	placement?: Placement;
}

const StyledTime = styled.time`
	color: var(--text-color-subtle);
	font-weight: normal;
	padding-left: 5px;
	&.no-padding {
		padding-left: 0;
	}
	// details isn't used in relative timestamps
	.details {
		padding-left: 5px;
		transition: opacity 0.4s;
	}
`;

export default function Timestamp(props: PropsWithChildren<Props>) {
	if (!props.time) return null;
	// allow a UTC string to be passed in
	let time = props.time;
	if (typeof props.time == "string" && (props.time as string).indexOf("Z") > -1) {
		time = new Date(props.time).getTime();
	}

	const edited = props.edited ? " (edited)" : "";

	let timeDiv: JSX.Element | undefined = undefined;
	if (props.relative) {
		timeDiv = (
			<StyledTime className={props.className}>
				{distanceOfTimeInWords(time as number, true, props.abbreviated)}
				{edited}
			</StyledTime>
		);
	} else {
		const timeText = prettyTime(time);
		const timeDetails = prettyDateDay(time, props.abbreviated);

		if (props.dateOnly)
			timeDiv = (
				<StyledTime className={props.className}>
					{timeDetails}
					{edited}
				</StyledTime>
			);
		else
			timeDiv = (
				<StyledTime className={props.className}>
					{timeText}
					<span className="details">{timeDetails}</span>
					{edited}
				</StyledTime>
			);
	}

	if (props.showTooltip) {
		return (
			<Tooltip title={prettyDateDayTime(time)} placement={props.placement}>
				{timeDiv}
			</Tooltip>
		);
	} else {
		return timeDiv;
	}
}
