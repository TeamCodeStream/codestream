import React, { PureComponent } from "react";
import { connect } from "react-redux";
import { FormattedMessage } from "react-intl";

class OfflineBanner extends PureComponent {
	render() {
		if (this.props.isOffline) {
			const errorMsg =
				this.props.offlineCode && this.props.offlineCode !== "BCOM-1001"
					? `Error code: ${this.props.offlineCode}`
					: null;
			return (
				<div className="banner full-banner">
					<div className="error-banner full-error-banner">
						<div className="content">
							<FormattedMessage
								id="offlineBanner.offline.main"
								defaultMessage="We’re having problems connecting to CodeStream. Hold tight, we’ll keep trying..."
							/>
							{this.props.isOnPrem && (
								<>
									<br/>
									<FormattedMessage
										id="offlineBanner.offline.isOnPrem"
										defaultMessage="If your CodeStream server is behind a firewall, make sure you're connected to your VPN."
									/>
								</>
							)}
						</div>
						{errorMsg && (
							<div className="content">
								<br />
								<FormattedMessage id="offlineBanner.offline.main" defaultMessage={errorMsg} />
							</div>
						)}
					</div>
				</div>
			);
		} else return null;
	}
}

const mapStateToProps = ({ connectivity, configs }) => {
	return {
		isOffline: connectivity.offline,
		offlineCode: connectivity.code,
		isOnPrem: configs.isOnPrem
	};
};
export default connect(mapStateToProps)(OfflineBanner);
