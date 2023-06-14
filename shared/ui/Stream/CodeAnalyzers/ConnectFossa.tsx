import React from "react";
import { Provider, IntegrationButtons } from "../IntegrationsPanel";
import { NoContent } from "../../src/components/Pane";
import Icon from "../Icon";

export const ConnectFossa = () => {
	return (
		<>
			<NoContent>Connect to FOSSA to see vulnerabilities and license dependencies.</NoContent>
			<IntegrationButtons noBorder>
				<Provider appendIcon key="fossa" onClick={() => {}}>
					<Icon name="fossa" />
				</Provider>
			</IntegrationButtons>
		</>
	);
};
