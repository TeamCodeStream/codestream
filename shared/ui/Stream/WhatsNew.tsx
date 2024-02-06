import React from "react";
import { PanelHeader } from "../src/components/PanelHeader";

export const WhatsNewPanel = (props: {}) => {
	return (
		<>
			<PanelHeader title="What's New"></PanelHeader>

			<div className="whats-new-container">
				<div className="version-container">
					<div className="version">15.2.0</div>
					<div className="item">
						<span className="title">Unread messages on mobile</span>
						<span className="body">
							Catch up on all of your unread conversations at once, right from your mobile device.
						</span>
					</div>
					<div className="item">
						<span className="title">Theme customization is back!</span>
						<span className="body">
							Change the look of your workspace with the option to choose colors for different
							elements of your Slack theme.
						</span>
					</div>
					<div className="item">
						<span className="title">Other Updates</span>
						<span className="body">
							<ul>
								<li>
									Screen reader users can now use keyboard shortcuts to hear a summary of unread
									activity in all of their logged in workspaces.
								</li>
								<li>
									Admins on the Enterprise Grid plan can adjust the banners that appear in Slack
									Connect conversations to make them more visible.
								</li>
								<li>
									Show or hide your list of workspaces by clicking the workspace switcher icon in
									the top bar of the desktop app.
								</li>
							</ul>
						</span>
					</div>
				</div>
			</div>
		</>
	);
};
