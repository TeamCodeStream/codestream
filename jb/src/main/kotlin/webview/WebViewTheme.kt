package com.codestream.webview

import com.codestream.extensions.darken
import com.codestream.extensions.lighten
import com.codestream.extensions.opacity
import com.intellij.ui.ColorUtil
import com.intellij.ui.JBColor
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import java.awt.Color
import javax.swing.UIManager

class WebViewTheme(val name: String, val stylesheet: String) {

    companion object {
        fun build(): WebViewTheme {
            val font = UIUtil.getLabelFont()
            // TODO local(font.family)
            var fontFamily = if (font.family == ".SF NS Text") {
                "-apple-system,  BlinkMacSystemFont"
            } else {
                "\"${font.family}\""
            }

            val bg = JBColor.background()
            val fg = if (ColorUtil.isDark(bg)) {
                UIUtil.getLabelFontColor(UIUtil.FontColor.NORMAL).lighten(20)
            } else {
                UIUtil.getLabelFontColor(UIUtil.FontColor.NORMAL).darken(20)
            }
            val border = JBColor.border()
            val link = JBColor.link()
            val buttonBg = JBColor.namedColor("Button.default.startBackground",
                JBUI.CurrentTheme.Focus.defaultButtonColor())

            val scrollBarBg = UIManager.getColor("ScrollBar.background")
            val scrollBarFg = UIManager.getColor("ScrollBar.foreground")

            val appBgColor = bg
            var appBgColorDarker: Color
            var appBgColorHover: Color
            var baseBgColor: Color
            var baseBorderColor: Color
            var panelToolBgColor: Color
            val panelSectionFgColor = fg.opacity(80)
            val panelSectionHeaderBgColor = bg
            val panelSectionHeaderFgColor = fg.opacity(80)
            val textColor = fg.opacity(80)
            val textColorHighlight = fg
            val textColorSubtle = fg.opacity(60)
            var textColorSubtleExtra: Color
            val textColorInfo = link
            var textColorInfoMuted: Color
            val lineNumbersFgColor = fg.opacity(40)
            val buttonBgColor = buttonBg
            var buttonBgColorHover: Color
            var textFocusBorderColor: Color
            val buttonFgColor = JBColor.namedColor( "Button.default.foreground", textColor)

            if (ColorUtil.isDark(bg)) {
                appBgColorDarker = bg.darken(4)
                appBgColorHover = bg.lighten(3)

                baseBgColor = bg.lighten(4)
                baseBorderColor = border.opacity(50).lighten(20)

                panelToolBgColor = bg.lighten(10)

                textColorSubtleExtra = fg.opacity(60).lighten(50)

                textColorInfoMuted = link.darken(10)

                textFocusBorderColor = textColorInfoMuted.opacity(60)

                buttonBgColorHover = buttonBg.lighten(10)
            } else {
                appBgColorDarker = bg.lighten(4)
                appBgColorHover = bg.darken(1.5F)

                baseBgColor = bg.darken(3)
                baseBorderColor = border.opacity(50).lighten(.3F)

                panelToolBgColor = bg.darken(10)

                textColorSubtleExtra = fg.opacity(60).darken(50)

                textColorInfoMuted = link

                textFocusBorderColor = textColorInfoMuted.opacity(60)

                buttonBgColorHover = buttonBg.darken(10)
            }

            val toolWindowHeaderBackground = JBColor.namedColor("ToolWindow.Header.background", baseBgColor)
            val toolWindowHeaderInactiveBackground = JBColor.namedColor("ToolWindow.Header.inactiveBackground",
                baseBgColor)
            val toolWindowHeaderBorder = JBColor.namedColor("ToolWindow.Header.borderColor",
                JBColor.namedColor("Borders.ContrastBorderColor", baseBorderColor))
            val treeBackground = JBColor.namedColor("Tree.background", baseBgColor)

            val listActiveBackground = UIUtil.getListSelectionBackground(true)
            val listActiveForeground = UIUtil.getListSelectionForeground(true)
            val listActiveOutline = UIUtil.getListSelectionBackground(true)
            val listInactiveBackground = UIUtil.getListSelectionBackground(false)
            val listInactiveForeground = UIUtil.getListSelectionForeground(false)

            val name = if (isDarkTheme()) "vscode-dark" else "vscode-light"
            val stylesheet = """
body {
    --font-family: $fontFamily, "Segoe WPC", "Segoe UI", HelveticaNeue-Light, Ubuntu, "Droid Sans", Arial, Consolas, sans-serif;
    --font-size: ${font.size}px;
    --font-weight: normal;

    --border-color: ${border.rgba};

    --text-color: ${textColor.rgba};
    --text-color-highlight: ${textColorHighlight.rgba};
    --text-color-subtle: ${textColorSubtle.rgba};
    --text-color-subtle-extra: ${textColorSubtleExtra.rgba};

    --text-color-info: ${textColorInfo.rgba};
    --text-color-info-muted: ${textColorInfoMuted.rgba};

    --text-focus-border-color: ${textFocusBorderColor.rgba};

    --app-background-color: ${appBgColor.rgba};
    --app-background-color-darker: ${appBgColorDarker.rgba};
    --app-background-color-hover: ${appBgColorHover.rgba};
    --app-tab-backgound: ${toolWindowHeaderBackground.rgba};

    --base-background-color: ${baseBgColor.rgba};
    --base-border-color: ${baseBorderColor.rgba};

    --panel-tool-background-color: ${panelToolBgColor.rgba};
    --panel-section-foreground-color: ${panelSectionFgColor.rgba};
    --panel-section-header-background-color: ${panelSectionHeaderBgColor.rgba};
    --panel-section-header-foreground-color: ${panelSectionHeaderFgColor.rgba};

    --line-numbers-foreground-color: ${lineNumbersFgColor.rgba};

    --button-foreground-color: ${buttonFgColor.rgba};
    --button-background-color: ${buttonBgColor.rgba};
    --button-background-color-hover: ${buttonBgColorHover.rgba};
    
    --sidebar-background: ${treeBackground.rgba};
    --sidebar-foreground: ${panelSectionFgColor.rgba};
    --sidebar-border: ${toolWindowHeaderBorder.rgba};
    --sidebar-header-background: ${toolWindowHeaderInactiveBackground.rgba};
    --sidebar-header-foreground: ${panelSectionHeaderFgColor.rgba};
    --sidebar-header-border: ${toolWindowHeaderBorder.rgba};    
    
    --list-active-background: ${listActiveBackground.rgba};
    --list-active-foreground: ${listActiveForeground.rgba};
    --list-active-outline: ${listActiveOutline.rgba};
    --list-inactive-background: ${listInactiveBackground.rgba};
    --list-inactive-foreground: ${listInactiveForeground.rgba};

    --scrollbar-thumb: ${scrollBarBg.rgba};
    --scrollbar-thumb-hover: ${scrollBarFg.rgba};
}
        """

            return WebViewTheme(name, stylesheet)
        }
    }
}

fun isDarkTheme() = ColorUtil.isDark(JBColor.background())

private val Color.rgba: String
    get() = "rgba($red, $green, $blue, ${alpha.toFloat() / 255})"
