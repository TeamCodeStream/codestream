import { WebviewErrorRequestType } from "@codestream/protocols/agent";
import React, { ErrorInfo, MouseEvent } from "react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import { ReloadWebviewRequestType } from "../ipc/webview.protocol";
import { logError } from "../logger";
import { createTheme, CSTheme, darkTheme } from "../src/themes";
import { SearchContextProvider } from "../Stream/SearchContextProvider";
import { HostApi } from "../webview-api";
import { AppDispatch, CodeStreamState } from "@codestream/webview/store";
import { MessageFormatElement } from "intl-messageformat-parser";
import { Root } from "@codestream/webview/Container/Root";
import { EnhancedStore } from "@reduxjs/toolkit";
import { closeAllPanels } from "@codestream/webview/store/context/thunks";

// use this interface to type the properties, replace any
interface ContainerProps {
	store: EnhancedStore<CodeStreamState>;
	i18n: {
		locale: string;
		messages: Record<string, string> | Record<string, MessageFormatElement[]>;
	};
}

interface ContainerState {
	hasError: boolean;
	theme: CSTheme;
}

export default class Container extends React.Component<ContainerProps, ContainerState> {
	private _mutationObserver: MutationObserver | null = null;
	private dispatch = this.props.store.dispatch as AppDispatch;

	state: ContainerState = { hasError: false, theme: darkTheme };

	static getDerivedStateFromError(error: Error) {
		// note, the Error object itself doesn't seem to survive lsp
		HostApi.instance.send(WebviewErrorRequestType, {
			error: {
				message: error.message,
				stack: error.stack,
			},
		});
		return { hasError: true };
	}

	componentDidMount() {
		this.setState({ theme: createTheme() });
		this._mutationObserver = new MutationObserver(() => {
			this.setState({ theme: createTheme() });
		});
		this._mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		logError(`Exception caught in React component tree: ${error.message}`, {
			stacktrace: error.stack,
			info,
		});
	}

	componentWillUnmount() {
		this._mutationObserver?.disconnect();
	}

	handleClickReload = (event: MouseEvent) => {
		event.preventDefault();

		// reset view state in case the error was tied to a piece of bad data
		this.dispatch(closeAllPanels());

		HostApi.instance.send(ReloadWebviewRequestType, void undefined);
	};

	render() {
		const { i18n, store } = this.props;

		// replace any with the correct type for your Root component
		let content: any;
		if (this.state.hasError)
			content = (
				<div id="oops">
					<div className="standard-form">
						<fieldset className="form-body">
							<div className="border-bottom-box">
								<div>
									<h3>An unexpected error has occurred. </h3>
									<br />
									<a onClick={this.handleClickReload}>Click here</a> to reload.
									<br />
									<br />
									If the problem persists please{" "}
									<a href="https://one.newrelic.com/help-xp">contact support.</a>
								</div>
							</div>
						</fieldset>
					</div>
				</div>
			);
		else content = <Root />; // Ensure to have your Root component imported

		return (
			<IntlProvider locale={i18n.locale} messages={i18n.messages}>
				<Provider store={store}>
					<ThemeProvider theme={this.state.theme}>
						<SearchContextProvider>{content}</SearchContextProvider>
					</ThemeProvider>
				</Provider>
			</IntlProvider>
		);
	}
}
