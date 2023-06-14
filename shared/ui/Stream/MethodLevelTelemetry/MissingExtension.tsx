import React from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { closePanel } from "../actions";
import CancelButton from "../CancelButton";
import { Link } from "../Link";
const Root = styled.div``;

interface MissingExtensionBaseProps {
	sidebarView?: boolean;
}

const MissingExtensionBase: React.FC<MissingExtensionBaseProps> = props => {
	const dispatch = useDispatch();

	if (props?.sidebarView) {
		return <div>{props.children}</div>;
	}
	return (
		<Root className="full-height-codemark-form">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					width: "100%",
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

export function MissingRubyExtension({ sidebarView = false }) {
	return (
		<MissingExtensionBase sidebarView={sidebarView}>
			{!sidebarView && <h3>Code-Level Metrics</h3>}
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install one of the following extensions for VS Code
				that allow CodeStream to identify the methods in your Ruby code.
			</p>
			<br />
			<p>
				<Link href={"vscode:extension/rebornix.Ruby"}>Ruby</Link> - Be sure to add{" "}
				<pre>"ruby.useLanguageServer": true</pre> and <pre>"ruby.intellisense": "rubyLocate"</pre>{" "}
				to your settings file.
			</p>
			<p>
				<Link href={"vscode:extension/castwide.solargraph"}>Ruby Solargraph</Link> - Be sure to have
				ruby / gems installed and run <pre>gem install solargraph</pre> (might require sudo
				depending on your setup)
			</p>
		</MissingExtensionBase>
	);
}

export function RubyPluginLanguageServer({ sidebarView = false }) {
	return (
		<MissingExtensionBase sidebarView={sidebarView}>
			{!sidebarView && <h3>Code-Level Metrics</h3>}
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to enable the language server in your Ruby extension.
			</p>
			<p style={{ marginTop: 0 }}>
				To do so, add <pre>"ruby.useLanguageServer": true</pre> and{" "}
				<pre>"ruby.intellisense": "rubyLocate"</pre> to your settings file.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingPythonExtension({ sidebarView = false }) {
	return (
		<MissingExtensionBase sidebarView={sidebarView}>
			{!sidebarView && <h3>Code-Level Metrics</h3>}
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/ms-python.python"}>Python Extension</Link> for VS Code that
				allows CodeStream to identify the methods in your Python code.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingJavaExtension({ sidebarView = false }) {
	return (
		<MissingExtensionBase sidebarView={sidebarView}>
			{!sidebarView && <h3>Code-Level Metrics</h3>}
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/redhat.java"}>Language Support for Java(TM) by Red Hat</Link>{" "}
				for VS Code that allows CodeStream to identify the methods in your Java code.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingCsharpExtension({ sidebarView = false }) {
	return (
		<MissingExtensionBase sidebarView={sidebarView}>
			{!sidebarView && <h3>Code-Level Metrics</h3>}
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/ms-dotnettools.csharp"}>C# Extension</Link> for VS Code that
				allows CodeStream to identify the methods in your C# code.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingGoExtension({ sidebarView = false }) {
	return (
		<MissingExtensionBase sidebarView={sidebarView}>
			{!sidebarView && <h3>Code-Level Metrics</h3>}
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/golang.go"}>Go Extension</Link> for VS Code that allows
				CodeStream to identify the methods in your Go code.
			</p>
		</MissingExtensionBase>
	);
}

export function MissingPhpExtension({ sidebarView = false }) {
	return (
		<MissingExtensionBase sidebarView={sidebarView}>
			{!sidebarView && <h3>Code-Level Metrics</h3>}
			<p style={{ marginTop: 0 }}>
				To see code-level metrics you'll need to install the{" "}
				<Link href={"vscode:extension/bmewburn.vscode-intelephense-client"}>PHP Extension</Link> for
				VS Code that allows CodeStream to identify the methods in your PHP code.
			</p>
		</MissingExtensionBase>
	);
}
