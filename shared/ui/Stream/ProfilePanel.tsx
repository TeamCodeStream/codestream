import React from "react";
import { useDispatch, useSelector } from "react-redux";
import ScrollBox from "./ScrollBox";
import styled from "styled-components";
import { includes as _includes, sortBy as _sortBy, last as _last } from "lodash-es";
import { CodeStreamState } from "../store";
import { useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { PanelHeader } from "../src/components/PanelHeader";
import { openModal, closeModal, setUserPreference } from "./actions";
import Icon from "./Icon";
import { Headshot } from "../src/components/Headshot";
import { MetaLabel } from "./Codemark/BaseCodemark";
import { WebviewModals } from "../ipc/webview.protocol.common";
import Timestamp from "./Timestamp";
import { UserStatus } from "../src/components/UserStatus";
import { UpdateUserRequestType, DeleteUserRequestType } from "@codestream/protocols/agent";
import Menu from "./Menu";
import { confirmPopup } from "./Confirm";
import { logout } from "../store/session/actions";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { isCurrentUserInternal } from "../store/users/reducer";

const Root = styled.div`
	.edit-headshot {
		position: relative;
		cursor: pointer;
		width: 128px;
		.icon {
			position: absolute;
			bottom: 5px;
			right: 5px;
			visibility: hidden;
			background: var(--app-background-color);
			color: var(--text-color-highlight);
			border-radius: 5px;
			padding: 5px;
			z-index: 5;
		}
		&:hover .icon {
			visibility: visible;
		}
	}
	.edit-headshot,
	.headshot-wrap {
		float: right;
		margin: 20px 0 10px 10px;
		@media only screen and (max-width: 430px) {
			float: none;
			margin: 20px 0 10px 0;
		}
	}
`;

const Value = styled.span`
	padding-right: 10px;
`;

const Row = styled.div`
	margin-bottom: 15px;
	.row-icon {
		margin-right: 10px;
		opacity: 0.7;
		visibility: hidden;
		pointer-events: none;
	}
	&:hover .row-icon {
		visibility: visible;
		pointer-events: auto;
	}
	time {
		color: var(--text-color) !important;
		padding: 0 !important;
	}
`;

const StyledUserStatus = styled(UserStatus)`
	padding-left: 0;
	padding-right: 10px;
`;

const RowIcon = ({ name, title, onClick }) => {
	return (
		<Icon
			name={name}
			title={title}
			onClick={onClick}
			placement="bottom"
			delay={0.5}
			className="clickable row-icon"
		/>
	);
};

export const ProfilePanel = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { session, users, teams, context } = state;
		const person = users[context.profileUserId!];
		const me = users[session.userId!];
		const team = teams[context.currentTeamId];

		return {
			isInternalUser: isCurrentUserInternal(state),
			demoMode: state.preferences.demoMode,
			person,
			team,
			isMe: person ? person.id === session.userId : false,
			webviewFocused: state.context.hasFocus,
			repos: state.repos,
			teamId: state.context.currentTeamId,
			currentUserEmail: me.email,
			currentUserId: me.id
		};
	});

	const { person, isMe } = derivedState;

	useDidMount(() => {
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Profile" });
	});

	if (!derivedState.person) {
		return (
			<div className="panel full-height">
				<PanelHeader title={<>&nbsp;</>}></PanelHeader>
				<ScrollBox>
					<div className="channel-list vscroll">person not found</div>
				</ScrollBox>
			</div>
		);
	}

	const [editingTimeZone, setEditingTimeZone] = React.useState();
	const timeZoneItems = timeZoneList.map(timeZone => ({
		label: timeZone,
		searchLabel: timeZone,
		action: async () => {
			await HostApi.instance.send(UpdateUserRequestType, { timeZone });
			HostApi.instance.track("TimeZone Change Request", {});
		}
	})) as any;
	timeZoneItems.unshift({ type: "search" }, { label: "-" });

	const editUsername = () => dispatch(openModal(WebviewModals.ChangeUsername));
	const editEmail = () => dispatch(openModal(WebviewModals.ChangeEmail));
	const editAvatar = () => dispatch(openModal(WebviewModals.ChangeAvatar));
	const editFullName = () => dispatch(openModal(WebviewModals.ChangeFullName));
	const editPhoneNumber = () => dispatch(openModal(WebviewModals.ChangePhoneNumber));
	const editWorksOn = () => dispatch(openModal(WebviewModals.ChangeWorksOn));
	const copyEmail = () => {
		if (emailRef && emailRef.current) {
			emailRef.current.select();
			document.execCommand("copy");
		}
	};
	const noop = () => {};
	const cancelAccount = () => {
		const { team, currentUserId } = derivedState;
		const { adminIds } = team;

		if (adminIds && adminIds.length == 1 && adminIds.includes(currentUserId!)) {
			confirmPopup({
				title: "Not Possible",
				message:
					"As the only admin in your organization, you may not delete your account. Please contact customer service.",
				centered: true,
				buttons: [{ label: "Go Back", className: "control-button" }]
			});
		} else {
			confirmPopup({
				title: "Are you sure?",
				message: "Deleting your CodeStream user account cannot be undone.",
				centered: true,
				buttons: [
					{ label: "Go Back", className: "control-button" },
					{
						label: "Delete Account",
						className: "delete",
						wait: true,
						action: async () => {
							await HostApi.instance.send(DeleteUserRequestType, {
								userId: currentUserId!
							});
							dispatch(logout());
						}
					}
				]
			});
		}
	};

	const emailRef = React.useRef<HTMLTextAreaElement>(null);

	const title = (
		<Row style={{ margin: 0 }}>
			<Value>{person.fullName}</Value>
			{isMe && <RowIcon name="pencil" title="Edit Name" onClick={editFullName} />}
		</Row>
	);

	const toggleDemoMode = () => {
		dispatch(setUserPreference(["demoMode"], !derivedState.demoMode));

		// When toggling demo mode on, reset preference values that show tours
		if (derivedState.demoMode) {
			dispatch(setUserPreference(["hideCodeErrorInstructions"], false));
			dispatch(setUserPreference(["hideReviewInstructions"], false));
		}
	};

	return (
		<Dialog wide noPadding onClose={() => dispatch(closeModal())}>
			<Root>
				<PanelHeader title={title} />
				<div className="channel-list vscroll" style={{ padding: "0 20px 20px 20px" }}>
					<div
						className={isMe ? "edit-headshot" : "headshot-wrap"}
						onClick={isMe ? editAvatar : noop}
					>
						<Headshot person={person} size={128} />
						{isMe && <RowIcon name="pencil" title="Edit Profile Photo" onClick={editAvatar} />}
					</div>
					<Row>
						<MetaLabel>Username</MetaLabel>
						<Value>@{person.username}</Value>
						{isMe && <RowIcon name="pencil" title="Edit Username" onClick={editUsername} />}
					</Row>
					<Row>
						<MetaLabel>Email address</MetaLabel>
						<Value>
							<a href={`mailto:${person.email}`}>{person.email}</a>
						</Value>
						<RowIcon name="copy" title="Copy Email" onClick={copyEmail} />
						<textarea
							ref={emailRef}
							value={person.email}
							style={{ position: "absolute", left: "-9999px" }}
						/>
						{isMe && <RowIcon name="pencil" title="Edit Email" onClick={editEmail} />}
					</Row>
					<Row>
						<MetaLabel>Timezone</MetaLabel>
						<Value>{person.timeZone}</Value>
						{isMe && (
							<RowIcon
								name="pencil"
								title="Edit Timezone"
								onClick={e => setEditingTimeZone(e.target)}
							/>
						)}
						{editingTimeZone && (
							<Menu
								align="dropdownLeft"
								items={timeZoneItems}
								target={editingTimeZone}
								title="Timezone"
								action={() => setEditingTimeZone(undefined)}
							/>
						)}
					</Row>
					{(isMe || person.phoneNumber) && (
						<Row>
							<MetaLabel>Phone Number</MetaLabel>
							<Value>{person.phoneNumber || "-not set-"}</Value>
							{isMe && <RowIcon name="pencil" title="Edit Phone" onClick={editPhoneNumber} />}
						</Row>
					)}
					{(isMe || person.iWorkOn) && (
						<Row>
							<MetaLabel>Works On</MetaLabel>
							<Value>{person.iWorkOn || "-not set-"}</Value>
							{isMe && <RowIcon name="pencil" title="Edit Works On" onClick={editWorksOn} />}
						</Row>
					)}
					{person.lastLogin && (
						<Row>
							<MetaLabel
								style={derivedState.isInternalUser ? { cursor: "pointer" } : undefined}
								title={
									derivedState.isInternalUser
										? `Demo Mode: ${derivedState.demoMode ? "ON" : "OFF"}`
										: ""
								}
								onClick={derivedState.isInternalUser ? () => toggleDemoMode() : undefined}
							>
								Last Login
							</MetaLabel>
							<Value>
								<Timestamp className="no-padding" time={person.lastLogin} relative />
							</Value>
						</Row>
					)}
					{false && (
						<Row>
							<MetaLabel>Presence</MetaLabel>
							<Value></Value>
						</Row>
					)}
					{person.status && person.status.label && (
						<Row>
							<MetaLabel>Currently Working On</MetaLabel>
							<StyledUserStatus user={person} />
						</Row>
					)}
					{isMe && (
						<div style={{ marginTop: "75px" }}>
							<Button variant="destructive" onClick={cancelAccount}>
								Delete your account
							</Button>
						</div>
					)}
				</div>
			</Root>
		</Dialog>
	);
};

// https://stackoverflow.com/questions/38399465/how-to-get-list-of-all-timezones-in-javascript
const timeZoneList = [
	"Africa/Abidjan",
	"Africa/Accra",
	"Africa/Addis_Ababa",
	"Africa/Algiers",
	"Africa/Asmara",
	"Africa/Asmera",
	"Africa/Bamako",
	"Africa/Bangui",
	"Africa/Banjul",
	"Africa/Bissau",
	"Africa/Blantyre",
	"Africa/Brazzaville",
	"Africa/Bujumbura",
	"Africa/Cairo",
	"Africa/Casablanca",
	"Africa/Ceuta",
	"Africa/Conakry",
	"Africa/Dakar",
	"Africa/Dar_es_Salaam",
	"Africa/Djibouti",
	"Africa/Douala",
	"Africa/El_Aaiun",
	"Africa/Freetown",
	"Africa/Gaborone",
	"Africa/Harare",
	"Africa/Johannesburg",
	"Africa/Juba",
	"Africa/Kampala",
	"Africa/Khartoum",
	"Africa/Kigali",
	"Africa/Kinshasa",
	"Africa/Lagos",
	"Africa/Libreville",
	"Africa/Lome",
	"Africa/Luanda",
	"Africa/Lubumbashi",
	"Africa/Lusaka",
	"Africa/Malabo",
	"Africa/Maputo",
	"Africa/Maseru",
	"Africa/Mbabane",
	"Africa/Mogadishu",
	"Africa/Monrovia",
	"Africa/Nairobi",
	"Africa/Ndjamena",
	"Africa/Niamey",
	"Africa/Nouakchott",
	"Africa/Ouagadougou",
	"Africa/Porto-Novo",
	"Africa/Sao_Tome",
	"Africa/Timbuktu",
	"Africa/Tripoli",
	"Africa/Tunis",
	"Africa/Windhoek",
	"America/Adak",
	"America/Anchorage",
	"America/Anguilla",
	"America/Antigua",
	"America/Araguaina",
	"America/Argentina/Buenos_Aires",
	"America/Argentina/Catamarca",
	"America/Argentina/ComodRivadavia",
	"America/Argentina/Cordoba",
	"America/Argentina/Jujuy",
	"America/Argentina/La_Rioja",
	"America/Argentina/Mendoza",
	"America/Argentina/Rio_Gallegos",
	"America/Argentina/Salta",
	"America/Argentina/San_Juan",
	"America/Argentina/San_Luis",
	"America/Argentina/Tucuman",
	"America/Argentina/Ushuaia",
	"America/Aruba",
	"America/Asuncion",
	"America/Atikokan",
	"America/Atka",
	"America/Bahia",
	"America/Bahia_Banderas",
	"America/Barbados",
	"America/Belem",
	"America/Belize",
	"America/Blanc-Sablon",
	"America/Boa_Vista",
	"America/Bogota",
	"America/Boise",
	"America/Buenos_Aires",
	"America/Cambridge_Bay",
	"America/Campo_Grande",
	"America/Cancun",
	"America/Caracas",
	"America/Catamarca",
	"America/Cayenne",
	"America/Cayman",
	"America/Chicago",
	"America/Chihuahua",
	"America/Coral_Harbour",
	"America/Cordoba",
	"America/Costa_Rica",
	"America/Creston",
	"America/Cuiaba",
	"America/Curacao",
	"America/Danmarkshavn",
	"America/Dawson",
	"America/Dawson_Creek",
	"America/Denver",
	"America/Detroit",
	"America/Dominica",
	"America/Edmonton",
	"America/Eirunepe",
	"America/El_Salvador",
	"America/Ensenada",
	"America/Fort_Nelson",
	"America/Fort_Wayne",
	"America/Fortaleza",
	"America/Glace_Bay",
	"America/Godthab",
	"America/Goose_Bay",
	"America/Grand_Turk",
	"America/Grenada",
	"America/Guadeloupe",
	"America/Guatemala",
	"America/Guayaquil",
	"America/Guyana",
	"America/Halifax",
	"America/Havana",
	"America/Hermosillo",
	"America/Indiana/Indianapolis",
	"America/Indiana/Knox",
	"America/Indiana/Marengo",
	"America/Indiana/Petersburg",
	"America/Indiana/Tell_City",
	"America/Indiana/Vevay",
	"America/Indiana/Vincennes",
	"America/Indiana/Winamac",
	"America/Indianapolis",
	"America/Inuvik",
	"America/Iqaluit",
	"America/Jamaica",
	"America/Jujuy",
	"America/Juneau",
	"America/Kentucky/Louisville",
	"America/Kentucky/Monticello",
	"America/Knox_IN",
	"America/Kralendijk",
	"America/La_Paz",
	"America/Lima",
	"America/Los_Angeles",
	"America/Louisville",
	"America/Lower_Princes",
	"America/Maceio",
	"America/Managua",
	"America/Manaus",
	"America/Marigot",
	"America/Martinique",
	"America/Matamoros",
	"America/Mazatlan",
	"America/Mendoza",
	"America/Menominee",
	"America/Merida",
	"America/Metlakatla",
	"America/Mexico_City",
	"America/Miquelon",
	"America/Moncton",
	"America/Monterrey",
	"America/Montevideo",
	"America/Montreal",
	"America/Montserrat",
	"America/Nassau",
	"America/New_York",
	"America/Nipigon",
	"America/Nome",
	"America/Noronha",
	"America/North_Dakota/Beulah",
	"America/North_Dakota/Center",
	"America/North_Dakota/New_Salem",
	"America/Ojinaga",
	"America/Panama",
	"America/Pangnirtung",
	"America/Paramaribo",
	"America/Phoenix",
	"America/Port-au-Prince",
	"America/Port_of_Spain",
	"America/Porto_Acre",
	"America/Porto_Velho",
	"America/Puerto_Rico",
	"America/Punta_Arenas",
	"America/Rainy_River",
	"America/Rankin_Inlet",
	"America/Recife",
	"America/Regina",
	"America/Resolute",
	"America/Rio_Branco",
	"America/Rosario",
	"America/Santa_Isabel",
	"America/Santarem",
	"America/Santiago",
	"America/Santo_Domingo",
	"America/Sao_Paulo",
	"America/Scoresbysund",
	"America/Shiprock",
	"America/Sitka",
	"America/St_Barthelemy",
	"America/St_Johns",
	"America/St_Kitts",
	"America/St_Lucia",
	"America/St_Thomas",
	"America/St_Vincent",
	"America/Swift_Current",
	"America/Tegucigalpa",
	"America/Thule",
	"America/Thunder_Bay",
	"America/Tijuana",
	"America/Toronto",
	"America/Tortola",
	"America/Vancouver",
	"America/Virgin",
	"America/Whitehorse",
	"America/Winnipeg",
	"America/Yakutat",
	"America/Yellowknife",
	"Antarctica/Casey",
	"Antarctica/Davis",
	"Antarctica/DumontDUrville",
	"Antarctica/Macquarie",
	"Antarctica/Mawson",
	"Antarctica/McMurdo",
	"Antarctica/Palmer",
	"Antarctica/Rothera",
	"Antarctica/South_Pole",
	"Antarctica/Syowa",
	"Antarctica/Troll",
	"Antarctica/Vostok",
	"Arctic/Longyearbyen",
	"Asia/Aden",
	"Asia/Almaty",
	"Asia/Amman",
	"Asia/Anadyr",
	"Asia/Aqtau",
	"Asia/Aqtobe",
	"Asia/Ashgabat",
	"Asia/Ashkhabad",
	"Asia/Atyrau",
	"Asia/Baghdad",
	"Asia/Bahrain",
	"Asia/Baku",
	"Asia/Bangkok",
	"Asia/Barnaul",
	"Asia/Beirut",
	"Asia/Bishkek",
	"Asia/Brunei",
	"Asia/Calcutta",
	"Asia/Chita",
	"Asia/Choibalsan",
	"Asia/Chongqing",
	"Asia/Chungking",
	"Asia/Colombo",
	"Asia/Dacca",
	"Asia/Damascus",
	"Asia/Dhaka",
	"Asia/Dili",
	"Asia/Dubai",
	"Asia/Dushanbe",
	"Asia/Famagusta",
	"Asia/Gaza",
	"Asia/Harbin",
	"Asia/Hebron",
	"Asia/Ho_Chi_Minh",
	"Asia/Hong_Kong",
	"Asia/Hovd",
	"Asia/Irkutsk",
	"Asia/Istanbul",
	"Asia/Jakarta",
	"Asia/Jayapura",
	"Asia/Jerusalem",
	"Asia/Kabul",
	"Asia/Kamchatka",
	"Asia/Karachi",
	"Asia/Kashgar",
	"Asia/Kathmandu",
	"Asia/Katmandu",
	"Asia/Khandyga",
	"Asia/Kolkata",
	"Asia/Krasnoyarsk",
	"Asia/Kuala_Lumpur",
	"Asia/Kuching",
	"Asia/Kuwait",
	"Asia/Macao",
	"Asia/Macau",
	"Asia/Magadan",
	"Asia/Makassar",
	"Asia/Manila",
	"Asia/Muscat",
	"Asia/Nicosia",
	"Asia/Novokuznetsk",
	"Asia/Novosibirsk",
	"Asia/Omsk",
	"Asia/Oral",
	"Asia/Phnom_Penh",
	"Asia/Pontianak",
	"Asia/Pyongyang",
	"Asia/Qatar",
	"Asia/Qostanay",
	"Asia/Qyzylorda",
	"Asia/Rangoon",
	"Asia/Riyadh",
	"Asia/Saigon",
	"Asia/Sakhalin",
	"Asia/Samarkand",
	"Asia/Seoul",
	"Asia/Shanghai",
	"Asia/Singapore",
	"Asia/Srednekolymsk",
	"Asia/Taipei",
	"Asia/Tashkent",
	"Asia/Tbilisi",
	"Asia/Tehran",
	"Asia/Tel_Aviv",
	"Asia/Thimbu",
	"Asia/Thimphu",
	"Asia/Tokyo",
	"Asia/Tomsk",
	"Asia/Ujung_Pandang",
	"Asia/Ulaanbaatar",
	"Asia/Ulan_Bator",
	"Asia/Urumqi",
	"Asia/Ust-Nera",
	"Asia/Vientiane",
	"Asia/Vladivostok",
	"Asia/Yakutsk",
	"Asia/Yangon",
	"Asia/Yekaterinburg",
	"Asia/Yerevan",
	"Atlantic/Azores",
	"Atlantic/Bermuda",
	"Atlantic/Canary",
	"Atlantic/Cape_Verde",
	"Atlantic/Faeroe",
	"Atlantic/Faroe",
	"Atlantic/Jan_Mayen",
	"Atlantic/Madeira",
	"Atlantic/Reykjavik",
	"Atlantic/South_Georgia",
	"Atlantic/St_Helena",
	"Atlantic/Stanley",
	"Australia/ACT",
	"Australia/Adelaide",
	"Australia/Brisbane",
	"Australia/Broken_Hill",
	"Australia/Canberra",
	"Australia/Currie",
	"Australia/Darwin",
	"Australia/Eucla",
	"Australia/Hobart",
	"Australia/LHI",
	"Australia/Lindeman",
	"Australia/Lord_Howe",
	"Australia/Melbourne",
	"Australia/NSW",
	"Australia/North",
	"Australia/Perth",
	"Australia/Queensland",
	"Australia/South",
	"Australia/Sydney",
	"Australia/Tasmania",
	"Australia/Victoria",
	"Australia/West",
	"Australia/Yancowinna",
	"Brazil/Acre",
	"Brazil/DeNoronha",
	"Brazil/East",
	"Brazil/West",
	"CET",
	"CST6CDT",
	"Canada/Atlantic",
	"Canada/Central",
	"Canada/Eastern",
	"Canada/Mountain",
	"Canada/Newfoundland",
	"Canada/Pacific",
	"Canada/Saskatchewan",
	"Canada/Yukon",
	"Chile/Continental",
	"Chile/EasterIsland",
	"Cuba",
	"EET",
	"EST5EDT",
	"Egypt",
	"Eire",
	"Etc/GMT",
	"Etc/GMT+0",
	"Etc/GMT+1",
	"Etc/GMT+10",
	"Etc/GMT+11",
	"Etc/GMT+12",
	"Etc/GMT+2",
	"Etc/GMT+3",
	"Etc/GMT+4",
	"Etc/GMT+5",
	"Etc/GMT+6",
	"Etc/GMT+7",
	"Etc/GMT+8",
	"Etc/GMT+9",
	"Etc/GMT-0",
	"Etc/GMT-1",
	"Etc/GMT-10",
	"Etc/GMT-11",
	"Etc/GMT-12",
	"Etc/GMT-13",
	"Etc/GMT-14",
	"Etc/GMT-2",
	"Etc/GMT-3",
	"Etc/GMT-4",
	"Etc/GMT-5",
	"Etc/GMT-6",
	"Etc/GMT-7",
	"Etc/GMT-8",
	"Etc/GMT-9",
	"Etc/GMT0",
	"Etc/Greenwich",
	"Etc/UCT",
	"Etc/UTC",
	"Etc/Universal",
	"Etc/Zulu",
	"Europe/Amsterdam",
	"Europe/Andorra",
	"Europe/Astrakhan",
	"Europe/Athens",
	"Europe/Belfast",
	"Europe/Belgrade",
	"Europe/Berlin",
	"Europe/Bratislava",
	"Europe/Brussels",
	"Europe/Bucharest",
	"Europe/Budapest",
	"Europe/Busingen",
	"Europe/Chisinau",
	"Europe/Copenhagen",
	"Europe/Dublin",
	"Europe/Gibraltar",
	"Europe/Guernsey",
	"Europe/Helsinki",
	"Europe/Isle_of_Man",
	"Europe/Istanbul",
	"Europe/Jersey",
	"Europe/Kaliningrad",
	"Europe/Kiev",
	"Europe/Kirov",
	"Europe/Lisbon",
	"Europe/Ljubljana",
	"Europe/London",
	"Europe/Luxembourg",
	"Europe/Madrid",
	"Europe/Malta",
	"Europe/Mariehamn",
	"Europe/Minsk",
	"Europe/Monaco",
	"Europe/Moscow",
	"Europe/Nicosia",
	"Europe/Oslo",
	"Europe/Paris",
	"Europe/Podgorica",
	"Europe/Prague",
	"Europe/Riga",
	"Europe/Rome",
	"Europe/Samara",
	"Europe/San_Marino",
	"Europe/Sarajevo",
	"Europe/Saratov",
	"Europe/Simferopol",
	"Europe/Skopje",
	"Europe/Sofia",
	"Europe/Stockholm",
	"Europe/Tallinn",
	"Europe/Tirane",
	"Europe/Tiraspol",
	"Europe/Ulyanovsk",
	"Europe/Uzhgorod",
	"Europe/Vaduz",
	"Europe/Vatican",
	"Europe/Vienna",
	"Europe/Vilnius",
	"Europe/Volgograd",
	"Europe/Warsaw",
	"Europe/Zagreb",
	"Europe/Zaporozhye",
	"Europe/Zurich",
	"GB",
	"GB-Eire",
	"GMT",
	"GMT0",
	"Greenwich",
	"Hongkong",
	"Iceland",
	"Indian/Antananarivo",
	"Indian/Chagos",
	"Indian/Christmas",
	"Indian/Cocos",
	"Indian/Comoro",
	"Indian/Kerguelen",
	"Indian/Mahe",
	"Indian/Maldives",
	"Indian/Mauritius",
	"Indian/Mayotte",
	"Indian/Reunion",
	"Iran",
	"Israel",
	"Jamaica",
	"Japan",
	"Kwajalein",
	"Libya",
	"MET",
	"MST7MDT",
	"Mexico/BajaNorte",
	"Mexico/BajaSur",
	"Mexico/General",
	"NZ",
	"NZ-CHAT",
	"Navajo",
	"PRC",
	"PST8PDT",
	"Pacific/Apia",
	"Pacific/Auckland",
	"Pacific/Bougainville",
	"Pacific/Chatham",
	"Pacific/Chuuk",
	"Pacific/Easter",
	"Pacific/Efate",
	"Pacific/Enderbury",
	"Pacific/Fakaofo",
	"Pacific/Fiji",
	"Pacific/Funafuti",
	"Pacific/Galapagos",
	"Pacific/Gambier",
	"Pacific/Guadalcanal",
	"Pacific/Guam",
	"Pacific/Honolulu",
	"Pacific/Johnston",
	"Pacific/Kiritimati",
	"Pacific/Kosrae",
	"Pacific/Kwajalein",
	"Pacific/Majuro",
	"Pacific/Marquesas",
	"Pacific/Midway",
	"Pacific/Nauru",
	"Pacific/Niue",
	"Pacific/Norfolk",
	"Pacific/Noumea",
	"Pacific/Pago_Pago",
	"Pacific/Palau",
	"Pacific/Pitcairn",
	"Pacific/Pohnpei",
	"Pacific/Ponape",
	"Pacific/Port_Moresby",
	"Pacific/Rarotonga",
	"Pacific/Saipan",
	"Pacific/Samoa",
	"Pacific/Tahiti",
	"Pacific/Tarawa",
	"Pacific/Tongatapu",
	"Pacific/Truk",
	"Pacific/Wake",
	"Pacific/Wallis",
	"Pacific/Yap",
	"Poland",
	"Portugal",
	"ROK",
	"Singapore",
	"SystemV/AST4",
	"SystemV/AST4ADT",
	"SystemV/CST6",
	"SystemV/CST6CDT",
	"SystemV/EST5",
	"SystemV/EST5EDT",
	"SystemV/HST10",
	"SystemV/MST7",
	"SystemV/MST7MDT",
	"SystemV/PST8",
	"SystemV/PST8PDT",
	"SystemV/YST9",
	"SystemV/YST9YDT",
	"Turkey",
	"UCT",
	"US/Alaska",
	"US/Aleutian",
	"US/Arizona",
	"US/Central",
	"US/East-Indiana",
	"US/Eastern",
	"US/Hawaii",
	"US/Indiana-Starke",
	"US/Michigan",
	"US/Mountain",
	"US/Pacific",
	"US/Pacific-New",
	"US/Samoa",
	"UTC",
	"Universal",
	"W-SU",
	"WET",
	"Zulu"
];
