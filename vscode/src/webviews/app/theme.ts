"use strict";
const cssColorRegEx = /^(?:(#?)([0-9a-f]{3}|[0-9a-f]{6})|((?:rgb|hsl)a?)\((-?\d+%?)[,\s]+(-?\d+%?)[,\s]+(-?\d+%?)[,\s]*(-?[\d\.]+%?)?\))$/i;

function adjustLight(color: number, amount: number) {
	const cc = color + amount;
	const c = amount < 0 ? (cc < 0 ? 0 : cc) : cc > 255 ? 255 : cc;

	return Math.round(c);
}

function darken(color: string, percentage: number) {
	return lighten(color, -percentage);
}

function lighten(color: string, percentage: number) {
	const rgba = toRgba(color);
	if (rgba == null) return color;

	const [r, g, b, a] = rgba;
	const amount = (255 * percentage) / 100;
	return `rgba(${adjustLight(r, amount)}, ${adjustLight(g, amount)}, ${adjustLight(
		b,
		amount
	)}, ${a})`;
}

function opacity(color: string, percentage: number) {
	const rgba = toRgba(color);
	if (rgba == null) return color;

	const [r, g, b, a] = rgba;
	return `rgba(${r}, ${g}, ${b}, ${a * (percentage / 100)})`;
}

function toRgba(color: string) {
	color = color.trim();

	const result = cssColorRegEx.exec(color);
	if (result == null) return null;

	if (result[1] === "#") {
		const hex = result[2];
		switch (hex.length) {
			case 3:
				return [
					parseInt(hex[0] + hex[0], 16),
					parseInt(hex[1] + hex[1], 16),
					parseInt(hex[2] + hex[2], 16),
					1
				];
			case 6:
				return [
					parseInt(hex.substring(0, 2), 16),
					parseInt(hex.substring(2, 4), 16),
					parseInt(hex.substring(4, 6), 16),
					1
				];
		}

		return null;
	}

	switch (result[3]) {
		case "rgb":
			return [parseInt(result[4], 10), parseInt(result[5], 10), parseInt(result[6], 10), 1];
		case "rgba":
			return [
				parseInt(result[4], 10),
				parseInt(result[5], 10),
				parseInt(result[6], 10),
				parseFloat(result[7])
			];
		default:
			return null;
	}
}

let theme;

export function initializeColorPalette() {
	const onColorThemeChanged = () => {
		const body = document.body;
		const computedStyle = getComputedStyle(body);

		const bodyStyle = body.style;

		const font = computedStyle.getPropertyValue("--vscode-font-family").trim();
		if (font) {
			bodyStyle.setProperty("--font-family", font);
			bodyStyle.setProperty(
				"--font-size",
				computedStyle.getPropertyValue("--vscode-font-size").trim()
			);
			bodyStyle.setProperty(
				"--font-weight",
				computedStyle.getPropertyValue("--vscode-font-weight").trim()
			);
		} else {
			bodyStyle.setProperty(
				"--font-family",
				computedStyle.getPropertyValue("--vscode-editor-font-family").trim()
			);
			bodyStyle.setProperty(
				"--font-size",
				computedStyle.getPropertyValue("--vscode-editor-font-size").trim()
			);
			bodyStyle.setProperty(
				"--font-weight",
				computedStyle.getPropertyValue("--vscode-editor-font-weight").trim()
			);
		}

		theme = "dark";
		if (body.classList.contains("vscode-light")) {
			theme = "light";
		} else if (body.classList.contains("vscode-highcontrast")) {
			// TODO
			// theme = 'highcontrast';
		}

		let color = computedStyle.getPropertyValue("--vscode-editor-foreground").trim();
		if (!color) {
			color = computedStyle.getPropertyValue("--vscode-foreground").trim();
		}
		bodyStyle.setProperty("--text-color", opacity(color, 80));
		bodyStyle.setProperty("--text-color-highlight", color);
		bodyStyle.setProperty("--text-color-subtle", opacity(color, 60));
		switch (theme) {
			case "dark":
				bodyStyle.setProperty("--text-color-subtle-extra", lighten(opacity(color, 60), 50));
				break;

			case "light":
				bodyStyle.setProperty("--text-color-subtle-extra", darken(opacity(color, 60), 50));
				break;
		}

		color = computedStyle.getPropertyValue("--vscode-textLink-foreground").trim();
		bodyStyle.setProperty("--text-color-info", color);
		switch (theme) {
			case "dark":
				bodyStyle.setProperty("--text-color-info-muted", darken(color, 10));
				bodyStyle.setProperty("--text-focus-border-color", opacity(darken(color, 10), 60));
				break;
			case "light":
				bodyStyle.setProperty("--text-color-info-muted", color);
				bodyStyle.setProperty("--text-focus-border-color", opacity(color, 60));
				break;
		}

		color = computedStyle.getPropertyValue("--vscode-editor-background").trim();
		bodyStyle.setProperty("--app-background-color", color);
		switch (theme) {
			case "dark":
				bodyStyle.setProperty("--app-background-color-darker", darken(color, 4));
				bodyStyle.setProperty("--app-background-color-hover", lighten(color, 5));

				bodyStyle.setProperty("--base-background-color", lighten(color, 4));
				bodyStyle.setProperty("--base-border-color", lighten(color, 10));
				bodyStyle.setProperty("--panel-tool-background-color", lighten(color, 10));
				break;

			case "light":
				bodyStyle.setProperty("--app-background-color-darker", lighten(color, 4));
				bodyStyle.setProperty("--app-background-color-hover", darken(color, 1.5));

				bodyStyle.setProperty("--base-background-color", darken(color, 3));
				bodyStyle.setProperty("--base-border-color", darken(color, 10));
				bodyStyle.setProperty("--panel-tool-background-color", darken(color, 10));
				break;
		}

		color = computedStyle.getPropertyValue("--vscode-sideBar-foreground").trim();
		bodyStyle.setProperty("--panel-section-foreground-color", color);

		color = computedStyle.getPropertyValue("--vscode-sideBarSectionHeader-background").trim();
		bodyStyle.setProperty("--panel-section-header-background-color", color);

		color = computedStyle.getPropertyValue("--vscode-sideBarSectionHeader-foreground").trim();
		bodyStyle.setProperty("--panel-section-header-foreground-color", color);

		color = computedStyle.getPropertyValue("--vscode-editorLineNumber-foreground").trim();
		bodyStyle.setProperty("--line-numbers-foreground-color", color);

		color = computedStyle.getPropertyValue("--vscode-button-foreground").trim();
		bodyStyle.setProperty("--button-foreground-color", color);

		color = computedStyle.getPropertyValue("--vscode-button-background").trim();
		bodyStyle.setProperty("--button-background-color", color);

		color = computedStyle.getPropertyValue("--vscode-button-hoverBackground").trim();
		bodyStyle.setProperty("--button-background-color-hover", color);

		color = computedStyle.getPropertyValue("--vscode-sideBar-background").trim();
		bodyStyle.setProperty("--sidebar-background", color);
		color = computedStyle.getPropertyValue("--vscode-sideBar-foreground").trim();
		bodyStyle.setProperty("--sidebar-foreground", color);
		color = computedStyle.getPropertyValue("--vscode-sideBar-border").trim();
		bodyStyle.setProperty("--sidebar-border", color);
		color = computedStyle.getPropertyValue("--vscode-sideBarSectionHeader-background").trim();
		bodyStyle.setProperty("--sidebar-header-background", color);
		color = computedStyle.getPropertyValue("--vscode-sideBarSectionHeader-foreground").trim();
		bodyStyle.setProperty("--sidebar-header-foreground", color);
		color = computedStyle.getPropertyValue("--vscode-sideBarSectionHeader-border").trim();
		bodyStyle.setProperty("--sidebar-header-border", color);
	};

	const observer = new MutationObserver(onColorThemeChanged);
	observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

	onColorThemeChanged();
	return observer;
}
