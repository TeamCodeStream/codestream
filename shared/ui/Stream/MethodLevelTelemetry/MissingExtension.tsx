import styled from "styled-components";
import React from "react";
import CancelButton from "../CancelButton";
import { useDispatch } from "react-redux";
import { closePanel } from "../actions";
import { Link } from "../Link";
const Root = styled.div``;

const MissingExtensionBase: React.FC = props => {
	const dispatch = useDispatch();

	return (
		<Root className="full-height-codemark-form">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					width: "100%"
				}}
			>
				<div style={{ marginLeft: "auto", marginRight: "13px", whiteSpace: "nowrap", flexGrow: 0 }}>
					<CancelButton onClick={() => dispatch(closePanel())} />
				</div>
			</div>

			<div className="embedded-panel" style={{ marginLeft: "40px" }}>
				{props.children}
			</div>
		</Root>
	);
};

export function MissingRubyExtension() {
	return (
		<MissingExtensionBase>
			<h3>Code-Level Metrics</h3>
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install one of the following extensions for VS Code
				that allow CodeStream to identify the methods in your Ruby code.
			</p>
			<br />
			<p>
				<Link href={"vscode:extension/rebornix.Ruby"}>Ruby</Link> - Be sure to add{" "}
				<pre>"ruby.useLanguageServer": true</pre> to your settings file.
			</p>
			<p>
				<Link href={"vscode:extension/castwide.solargraph"}>Ruby Solargraph</Link> - Be sure to have
				ruby / gems installed and run <pre>gem install solargraph</pre> (might require sudo
				depending on your setup)
			</p>
		</MissingExtensionBase>
	);
}

export function RubyPluginLanguageServer() {
	return (
		<MissingExtensionBase>
			<h3>Code-Level Metrics</h3>
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to enable the language server in your Ruby extension.
			</p>
			<p style={{ marginTop: 0 }}>
				To do so, add <pre>"ruby.useLanguageServer": true</pre> to your settings file.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingPythonExtension() {
	return (
		<MissingExtensionBase>
			<h3>Code-Level Metrics</h3>
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/ms-python.python"}>Python Extension</Link> for VS Code that
				allows CodeStream to identify the methods in your Python code.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingJavaExtension() {
	return (
		<MissingExtensionBase>
			<h3>Code-Level Metrics</h3>
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/redhat.java"}>Language Support for Java(TM) by Red Hat</Link>{" "}
				for VS Code that allows CodeStream to identify the methods in your Java code.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingCsharpExtension() {
	return (
		<MissingExtensionBase>
			<h3>Code-Level Metrics</h3>
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/ms-dotnettools.csharp"}>C# Extension</Link> for VS Code that
				allows CodeStream to identify the methods in your C# code.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingGoExtension() {
	return (
		<MissingExtensionBase>
			<h3>Code-Level Metrics</h3>
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/golang.go"}>Go Extension</Link> for VS Code that allows
				CodeStream to identify the methods in your Go code.
			</p>
		</MissingExtensionBase>
	);
}
