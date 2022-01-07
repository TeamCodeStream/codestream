import React from "react";
import { useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { Login } from "./Login";
import { ProviderAuth } from "./ProviderAuth";
import { Signup } from "./Signup";
import { JoinTeam } from "./JoinTeam";
import { EmailConfirmation } from "./EmailConfirmation";
import { TeamCreation } from "./TeamCreation";
import { Route } from "../store/context/types";
import { ForgotPassword } from "./ForgotPassword";
import { MustSetPassword } from "./MustSetPassword";
import { OktaConfig } from "./OktaConfig";
import { CompanyCreation } from "./CompanyCreation";
import { SignupNewRelic } from "../Stream/SignUpNewRelic";

export const UnauthenticatedRoutes = () => {
	const props = useSelector((state: CodeStreamState) => state.context.route);

	switch (props.name) {
		case Route.Signup:
		case Route.NewUser:
			return <Signup {...props.params} />;
		case Route.NewRelicSignup:
			return <SignupNewRelic {...props.params} />;
		case Route.ProviderAuth:
			return <ProviderAuth {...props.params} />;
		case Route.CompanyCreation:
			return <CompanyCreation {...props.params} />;
		case Route.Login:
			return <Login {...props.params} />;
		case Route.JoinTeam:
			return <JoinTeam {...props.params} />;
		case Route.EmailConfirmation:
			return <EmailConfirmation {...(props.params as any)} />;
		case Route.TeamCreation:
			return <TeamCreation {...props.params} />;
		case Route.ForgotPassword:
			return <ForgotPassword {...props.params} />;
		case Route.MustSetPassword:
			return <MustSetPassword {...(props.params as any)} />;
		case Route.OktaConfig:
			return <OktaConfig {...props.params} />;
		default:
			return <Login {...props.params} />;
	}
};
