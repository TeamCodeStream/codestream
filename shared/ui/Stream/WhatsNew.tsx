import React from "react";
import styled from "styled-components";
import Icon from "../Stream/Icon";

const Main = styled.main``;

const TimelineWrapper = styled.div`
	padding: 1rem 3rem;
`;

const TimelineContent = styled.div`
	padding-left: 25.6px;
	border-left: 3px solid var(--base-border-color);

	&:last-child .tl-body {
		border-left: 3px solid transparent;
	}
`;

const TimelineHeader = styled.div`
	position: relative;
	display: grid;
`;

const TimelineTitle = styled.h2`
	font-weight: 600;
	border-bottom: 1px solid var(--base-border-color);
	padding-bottom: 2px;
	margin-bottom: 0.2em;
`;

const TimelineMarker = styled.span`
	display: block;
	position: absolute;
	width: 14px;
	height: 14px;
	border-radius: 50% / 50%;
	background: var(--base-border-color);
	left: -2.56rem;
	top: 50%;
	transform: translate(50%, -50%);
`;

const TimelineDate = styled.div`
	font-size: smaller;
	font-style: italic;
`;

const Update = styled.div``;
const UpdateTitle = styled.h3`
	margin-bottom: 2px;
`;
const UpdateItem = styled.div`
	margin-bottom: 4px;
`;

const ListContainer = styled.ul`
	margin-top: 2px;
	padding-left: 20px;
`;

export const WhatsNewPanel = () => {
	return (
		<TimelineWrapper>
			<h1>
				<Icon
					style={{
						transform: "scale(2)",
						display: "inline-block",
						marginRight: "15px",
						top: "15px",
					}}
					name="newrelic"
				/>
				What's New
			</h1>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.2 - Unread messages on mobile</TimelineTitle>
					<TimelineDate>February 7, 2024</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Theme customization is back!</UpdateTitle>
						<UpdateItem>
							Change the look of your workspace with the option to choose colors for different
							elements of your Slack theme.
						</UpdateItem>
					</Update>
					<Update>
						<UpdateTitle>Other Updates</UpdateTitle>
						<ListContainer>
							<li>
								Screen reader users can now use keyboard shortcuts to hear a summary of unread
								activity in all of their logged in workspaces.
							</li>
							<li>
								Admins on the Enterprise Grid plan can adjust the banners that appear in Slack
								Connect conversations to make them more visible.
							</li>
							<li>
								Show or hide your list of workspaces by clicking the workspace switcher icon in the
								top bar of the desktop app.
							</li>
						</ListContainer>
					</Update>
				</div>
			</TimelineContent>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.1 - Cool Update Dummy Content</TimelineTitle>
					<TimelineDate>December 25, 2023</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Theme customization is back!</UpdateTitle>
						<UpdateItem>
							Change the look of your workspace with the option to choose colors for different
							elements of your Slack theme.
						</UpdateItem>
					</Update>
					<Update>
						<UpdateTitle>Other Updates</UpdateTitle>
						<ListContainer>
							<li>
								Screen reader users can now use keyboard shortcuts to hear a summary of unread
								activity in all of their logged in workspaces.
							</li>
							<li>
								Admins on the Enterprise Grid plan can adjust the banners that appear in Slack
								Connect conversations to make them more visible.
							</li>
							<li>
								Show or hide your list of workspaces by clicking the workspace switcher icon in the
								top bar of the desktop app.
							</li>
						</ListContainer>
					</Update>
				</div>
			</TimelineContent>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.0 - Massive Gamechanging Update</TimelineTitle>
					<TimelineDate>September 20, 2023</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Theme customization is back!</UpdateTitle>
						<UpdateItem>
							Change the look of your workspace with the option to choose colors for different
							elements of your Slack theme.
						</UpdateItem>
					</Update>
					<Update>
						<UpdateTitle>Other Updates</UpdateTitle>
						<ListContainer>
							<li>
								Screen reader users can now use keyboard shortcuts to hear a summary of unread
								activity in all of their logged in workspaces.
							</li>
							<li>
								Admins on the Enterprise Grid plan can adjust the banners that appear in Slack
								Connect conversations to make them more visible.
							</li>
							<li>
								Show or hide your list of workspaces by clicking the workspace switcher icon in the
								top bar of the desktop app.
							</li>
						</ListContainer>
					</Update>
				</div>
			</TimelineContent>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>14.9 - Update Foo Bar Baz</TimelineTitle>
					<TimelineDate>June 20, 2023</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Theme customization is back!</UpdateTitle>
						<UpdateItem>
							Change the look of your workspace with the option to choose colors for different
							elements of your Slack theme.
						</UpdateItem>
					</Update>
					<Update>
						<UpdateTitle>Other Updates</UpdateTitle>
						<ListContainer>
							<li>
								Screen reader users can now use keyboard shortcuts to hear a summary of unread
								activity in all of their logged in workspaces.
							</li>
							<li>
								Admins on the Enterprise Grid plan can adjust the banners that appear in Slack
								Connect conversations to make them more visible.
							</li>
							<li>
								Show or hide your list of workspaces by clicking the workspace switcher icon in the
								top bar of the desktop app.
							</li>
						</ListContainer>
					</Update>
				</div>
			</TimelineContent>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.2 - Fixing Things Here and There</TimelineTitle>
					<TimelineDate>June 10, 2023</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Theme customization is back!</UpdateTitle>
						<UpdateItem>
							Change the look of your workspace with the option to choose colors for different
							elements of your Slack theme.
						</UpdateItem>
					</Update>
					<Update>
						<UpdateTitle>Other Updates</UpdateTitle>
						<ListContainer>
							<li>
								Screen reader users can now use keyboard shortcuts to hear a summary of unread
								activity in all of their logged in workspaces.
							</li>
							<li>
								Admins on the Enterprise Grid plan can adjust the banners that appear in Slack
								Connect conversations to make them more visible.
							</li>
							<li>
								Show or hide your list of workspaces by clicking the workspace switcher icon in the
								top bar of the desktop app.
							</li>
						</ListContainer>
					</Update>
				</div>
			</TimelineContent>
		</TimelineWrapper>
	);
};
