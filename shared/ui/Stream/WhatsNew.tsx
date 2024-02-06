import React from "react";

export const WhatsNewPanel = () => {
	return (
		<>
			<div style={{ padding: "20px" }}>
				<h1>What's New</h1>
				<div>
					<h2>15.2.0</h2>
					<div>
						<h3>Unread messages on mobile</h3>
						<span>
							Catch up on all of your unread conversations at once, right from your mobile device.
						</span>
					</div>
					<div>
						<h3>Theme customization is back!</h3>
						<span>
							Change the look of your workspace with the option to choose colors for different
							elements of your Slack theme.
						</span>
					</div>
					<div>
						<h3>Other Updates</h3>
						<span>
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
