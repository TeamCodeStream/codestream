package com.codestream.webview

import com.teamdev.jxbrowser.os.Environment

const val VERSION = "7.18"

enum class JxBrowserJarName(private val value: String) {
    SHARED("jxbrowser-${VERSION}.jar"),
    WIN64("jxbrowser-win64-${VERSION}.jar"),
    MAC("jxbrowser-mac-${VERSION}.jar"),
    MAC_ARM64("jxbrowser-mac-arm-${VERSION}.jar"),
    LINUX("jxbrowser-linux64-${VERSION}.jar"),
    LINUX_ARM64("jxbrowser-linux64-arm-${VERSION}.jar");

    fun value(): String {
        return value
    }

    override fun toString(): String {
        return value
    }

    companion object {
        fun list(): List<JxBrowserJarName> {
            val result = mutableListOf<JxBrowserJarName>(SHARED)
            if (Environment.isWindows()) {
                result.add(WIN64)
            }
            if (Environment.isMac()) {
                if (Environment.isArm()) {
                    result.add(MAC_ARM64)
                } else {
                    result.add(MAC)
                }
            }
            if (Environment.isLinux() && Environment.is64Bit()) {
                if (Environment.isArm()) {
                    result.add(LINUX_ARM64)
                } else {
                    result.add(LINUX)
                }
            }
            return result
        }
    }
}