using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Reflection;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Text.Editor;
using Serilog;
using EnvironmentColors = Microsoft.VisualStudio.PlatformUI.EnvironmentColors;
using FontFamily = System.Windows.Media.FontFamily;
// ReSharper disable RedundantArgumentDefaultValue

namespace CodeStream.VisualStudio.Core.Managers {
	public class ThemeColorMetadata {
		/// <summary>
		/// Key that will be mapped to a CSS property name
		/// </summary>
		public string Key { get; set; }

		/// <summary>
		/// Color
		/// </summary>
		public System.Drawing.Color Color { get; set; }

		/// <summary>
		/// Optional function to alter the color
		/// </summary>
		public Func<System.Drawing.Color, System.Drawing.Color> DarkModifier { get; set; }
		public Func<System.Drawing.Color, System.Drawing.Color> LightModifier { get; set; }
	}

	public class ThemeResourceMetadata {
		/// <summary>
		/// Key that will be mapped to a CSS property name
		/// </summary>
		public string Key { get; set; }

		/// <summary>
		/// CSS Value
		/// </summary>
		public string Value { get; set; }
	}

	public class ThemeInfo {
		public List<ThemeColorMetadata> ThemeColors { get; set; }
		public List<ThemeResourceMetadata> ThemeResources { get; set; }
		public bool IsDark { get; set; }
	}

	public class ThemeManagerDummy { }

	public static class ThemeManager {
		private static readonly ILogger Log = LogManager.ForContext<ThemeManagerDummy>();

		private static int DefaultFontSize = 12;

		private static System.Drawing.Color GetThemedColor(IVsUIShell5 shell, ThemeResourceKey themeResourceKey) {
			return shell.GetThemedGDIColor(themeResourceKey);
		}

		/// <summary>
		/// Requires the UI Thread
		/// </summary>
		/// <returns></returns>
		public static ThemeInfo Generate() {
			try {
				ThreadHelper.ThrowIfNotOnUIThread();
				var shell = Package.GetGlobalService(typeof(SVsUIShell)) as IVsUIShell5;

				var backgroundColor = GetThemedColor(shell, EnvironmentColors.ToolWindowBackgroundColorKey);
				var textColor = GetThemedColor(shell, EnvironmentColors.ToolWindowTextColorKey);

				// assume this theme is 'dark' if the ToolWindow background is dark
				var backgroundIsDark = backgroundColor.IsDark();

				var colors = new List<ThemeColorMetadata>
				{
					new ThemeColorMetadata { Key = "app-background-color", Color = backgroundColor },
					new ThemeColorMetadata { Key = "sidebar-background", Color = backgroundColor },
					new ThemeColorMetadata { Key = "app-background-color-darker", Color = backgroundColor, DarkModifier = c => c.Darken(0.04f), LightModifier = c => c.Lighten(0.04f) },
					new ThemeColorMetadata { Key = "app-background-color-hover", Color = backgroundColor, DarkModifier = c => c.Lighten(0.03f), LightModifier = c => c.Darken(0.015f) },

					new ThemeColorMetadata { Key = "base-background-color", Color = backgroundColor, DarkModifier = c => c.Lighten(0.04f), LightModifier = c => c.Darken(0.03f) },
					new ThemeColorMetadata { Key = "base-border-color", Color = GetThemedColor(shell, EnvironmentColors.ToolWindowBorderColorKey), DarkModifier = c => c.Lighten(0.1f), LightModifier = c => c.Darken(0.1f) },

					new ThemeColorMetadata { Key = "panel-tool-background-color", Color = backgroundColor, DarkModifier = c => c.Lighten(0.1f), LightModifier = c => c.Darken(0.1f) },
					new ThemeColorMetadata { Key = "panel-section-foreground-color", Color = textColor, DarkModifier = c => c.Opacity(80), LightModifier = c => c.Opacity(80) },
					new ThemeColorMetadata { Key = "panel-section-header-background-color", Color = backgroundColor },
					new ThemeColorMetadata { Key = "panel-section-header-foreground-color", Color = textColor, DarkModifier = c => c.Opacity(80), LightModifier = c => c.Opacity(80) },

					new ThemeColorMetadata { Key = "text-color", Color = textColor, DarkModifier = c => c.Opacity(80), LightModifier = c => c.Opacity(80) },
					new ThemeColorMetadata { Key = "text-color-highlight", Color = textColor },
					new ThemeColorMetadata { Key = "text-color-subtle", Color = textColor, DarkModifier = c => c.Opacity(60), LightModifier = c => c.Opacity(60) },
					new ThemeColorMetadata { Key = "text-color-subtle-extra", Color = textColor, DarkModifier = c => c.Lighten(0.5f).Opacity(60), LightModifier = c => c.Darken(0.5f).Opacity(60) },

					new ThemeColorMetadata { Key = "text-color-info", Color = GetThemedColor(shell, EnvironmentColors.StartPageTextControlLinkSelectedColorKey) },
					new ThemeColorMetadata { Key = "text-color-info-muted", Color = GetThemedColor(shell, EnvironmentColors.StartPageTextControlLinkSelectedColorKey), DarkModifier = c => c.Darken(0.1f) },

					new ThemeColorMetadata { Key = "text-focus-border-color", Color = GetThemedColor(shell, EnvironmentColors.StartPageTextControlLinkSelectedColorKey), DarkModifier = c => c.Darken(0.1f).Opacity(60), LightModifier = c => c.Opacity(60) },

					new ThemeColorMetadata { Key = "button-foreground-color", Color = backgroundIsDark ? textColor : GetThemedColor(shell, EnvironmentColors.ToolWindowButtonDownColorKey), LightModifier = c => c.Darken(0.1f) },
					new ThemeColorMetadata { Key = "button-background-color", Color = GetThemedColor(shell, backgroundIsDark ? EnvironmentColors.ToolWindowButtonDownColorKey : EnvironmentColors.ToolWindowBorderColorKey), LightModifier = c => c.Darken(0.3f) },
					new ThemeColorMetadata { Key = "button-background-color-hover", Color = GetThemedColor(shell, backgroundIsDark ? EnvironmentColors.ToolWindowButtonDownColorKey : EnvironmentColors.ToolWindowBorderColorKey), DarkModifier = c => c.Lighten(0.1f), LightModifier = c => c.Darken(0.2f) },

					new ThemeColorMetadata { Key = "line-numbers-foreground-color", Color = textColor, DarkModifier = c => c.Opacity(40), LightModifier = c => c.Opacity(40) },

					new ThemeColorMetadata { Key = "scrollbar-color", Color = GetThemedColor(shell, EnvironmentColors.SystemScrollBarColorKey) },
					new ThemeColorMetadata { Key = "scrollbar-color-hover", Color = GetThemedColor(shell, EnvironmentColors.ScrollBarThumbMouseOverBackgroundColorKey) },

					new ThemeColorMetadata { Key = "list-active-background", Color = GetThemedColor(shell, backgroundIsDark ? EnvironmentColors.ToolWindowButtonDownColorKey : EnvironmentColors.ToolWindowBorderColorKey), DarkModifier = c => c.Lighten(0.1f), LightModifier = c => c.Darken(0.2f) },
					new ThemeColorMetadata { Key = "list-active-foreground", Color = textColor, DarkModifier = c => c.Opacity(80), LightModifier = c => c.Opacity(80) },
					new ThemeColorMetadata { Key = "list-active-outline", Color = GetThemedColor(shell, backgroundIsDark ? EnvironmentColors.ToolWindowButtonDownColorKey : EnvironmentColors.ToolWindowBorderColorKey), LightModifier = c => c.Darken(0.3f) },
					new ThemeColorMetadata { Key = "list-inactive-background", Color = backgroundColor, DarkModifier = c => c.Lighten(0.04f), LightModifier = c => c.Darken(0.03f) },
					new ThemeColorMetadata { Key = "list-inactive-foreground", Color = textColor, DarkModifier = c => c.Opacity(80), LightModifier = c => c.Opacity(80) }
				};

				if (Log.IsDebugEnabled()) {
					Log.Debug($"BackgroundIsDark={backgroundIsDark}, BackgroundColor={backgroundColor.ToRgba()}, TextColor={textColor.ToRgba()}");
#if DEBUG
					//GenerateVisualStudioColorTheme();
#endif
				}

				// if (isDark && textColor.IsDark())
				// {
				// 	// in this case, there's a dark on dark issue -- default texts to something reasonable
				// 	var color = Color.FromArgb(228, 227, 227);
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color", Color = color.Opacity(80) });
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color-highlight", Color = color });
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color-subtle", Color = color.Opacity(60) });
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color-subtle-extra", Color = color.Lighten(0.5f).Opacity(60) });

				// 	colors.Add(new ThemeColorMetadata { Key = "vscode-sideBarSectionHeader-foreground", Color = color.Opacity(80) });

				// 	if (Log.IsEnabled(Serilog.Events.LogEventLevel.Debug))
				// 	{
				// 		Log.Debug($"Dark on Dark, TextColor={textColor},{textColor.ToRgba()} BackgroundColor={backgroundColor}, {backgroundColor.ToRgba()}");
				// 	}
				// }
				// else if (!isDark && !textColor.IsDark())
				// {
				// 	// in this case, there's a light on light issue -- default texts to something reasonable
				// 	var color = Color.FromArgb(17, 17, 17);
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color", Color = color.Opacity(80) });
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color-highlight", Color = color });
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color-subtle", Color = color.Opacity(60) });
				// 	colors.Add(new ThemeColorMetadata { Key = "text-color-subtle-extra", Color = color.Darken(0.5f).Opacity(60) });

				// 	colors.Add(new ThemeColorMetadata { Key = "vscode-sideBarSectionHeader-foreground", Color = color.Opacity(80) });

				// 	if (Log.IsEnabled(Serilog.Events.LogEventLevel.Debug))
				// 	{
				// 		Log.Debug($"Light on Light, TextColor={textColor},{textColor.ToRgba()} BackgroundColor={backgroundColor}, {backgroundColor.ToRgba()}");
				// 	}
				// }

				string fontFamilyString;
				var fontFamily = System.Windows.Application.Current.FindResource(VsFonts.EnvironmentFontFamilyKey) as FontFamily;
				if (fontFamily != null) {
					fontFamilyString = fontFamily.ToString();
					if (fontFamilyString.Contains(" ")) {
						fontFamilyString = $"\"{fontFamilyString}\"";
					}
				}
				else {
					fontFamilyString = "\"Segoe WPC\", \"Segoe UI\", HelveticaNeue-Light, Ubuntu, \"Droid Sans\", Arial, Consolas, sans-serif";
				}

				var metrics = CreateEditorMetrics(null);
				var fontSize = metrics == null ?
					DefaultFontSize.ToString() :
					metrics.FontSize.ToIntSafe(DefaultFontSize).ToString();

				var resources = new List<ThemeResourceMetadata>
				{
					new ThemeResourceMetadata { Key = "font-family", Value = fontFamilyString },
					new ThemeResourceMetadata { Key = "font-size", Value = fontSize }
				};

				return new ThemeInfo {
					ThemeColors = colors,
					ThemeResources = resources,
					IsDark = backgroundIsDark
				};
			}
			catch (Exception ex) {
				Log.Error(ex, nameof(Generate));

				return new ThemeInfo();
			}
		}

		public static EditorMetrics CreateEditorMetrics(IWpfTextView wpfTextView = null) {
			return new EditorMetrics {
				LineHeight = wpfTextView == null ? 16 : wpfTextView?.LineHeight.ToInt(),
				FontSize = System.Windows.Application.Current.FindResource(VsFonts.EnvironmentFontSizeKey).ToIntSafe(DefaultFontSize),
				EditorMargins = new EditorMargins {
					//TODO figure out the real value here...
					Top = 21
				},
				ScrollMode = EditorScrollMode.Pixels,
				ScrollRatio = 0.25
			};
		}

		/// <summary>
		/// The default color is blue-ish
		/// </summary>
		private static Color DefaultColor = Color.FromArgb(0, 110, 183);

		/// <summary>
		/// if color is missing (might be externalContent instead of Codemark) -- use default
		/// </summary>
		/// <param name="colorName"></param>
		/// <returns></returns>
		public static System.Drawing.Color GetCodemarkColorSafe(string colorName) {
			if (colorName.IsNullOrWhiteSpace()) return DefaultColor;

			if (ColorMap.TryGetValue(colorName, out Color value)) {
				return value;
			}

			return DefaultColor;
		}

		public static Dictionary<string, System.Drawing.Color> ColorMap = new Dictionary<string, System.Drawing.Color>
		{
			{ "blue", DefaultColor},
			{ "green", Color.FromArgb(88, 181, 71)},
			{ "yellow", Color.FromArgb(240, 208, 5)},
			{ "orange", Color.FromArgb(255, 147, 25)},
			{ "red",  Color.FromArgb(232, 78, 62)},
			{ "purple", Color.FromArgb(187, 108, 220)},
			{ "aqua", Color.FromArgb(0, 186, 220)},
			{ "gray", Color.FromArgb(127, 127, 127)}
		};


		/// <summary>
		/// this is some helper code to generate a theme color palette from the current VS theme
		/// </summary>
		/// <returns></returns>
		private static string GenerateVisualStudioColorTheme() {
			var d = new System.Collections.Generic.Dictionary<string, string>();
			Type type = typeof(EnvironmentColors); // MyClass is static class with static properties
			foreach (var p in type.GetProperties().Where(_ => _.Name.StartsWith("ToolWindow"))) {
				var val = typeof(EnvironmentColors).GetProperty(p.Name, BindingFlags.Public | BindingFlags.Static);
				var v = val.GetValue(null);
				var trk = v as ThemeResourceKey;
				if (trk != null) {
					var color = VSColorTheme.GetThemedColor(trk);
					d.Add(p.Name, color.ToRgba());
				}

				// d.Add(p.Name, ((System.Drawing.Color)val).ToHex());
			}

			string s = "";
			foreach (var kvp in d) {
				s += $@"<div>";
				s += $@"<span style='display:inline-block; height:50ps; width: 50px; background:{kvp.Value}; padding-right:5px; margin-right:5px;'>&nbsp;</span>";
				s += $@"<span>{kvp.Value} - {kvp.Key}</span>";
				s += "</div>";
			}

			return null;
		}

	}

}
