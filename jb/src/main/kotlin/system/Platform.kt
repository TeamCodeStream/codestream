package com.codestream.system

import com.intellij.openapi.util.SystemInfo

val platform: Platform by lazy {
    when {
        SystemInfo.isLinux -> Platform.LINUX
        SystemInfo.isMac -> Platform.MAC
        SystemInfo.isWindows -> Platform.WIN64
        else -> throw IllegalStateException("Unable to detect system platform")
    }
}

enum class Platform {
    LINUX,
    MAC,
    WIN64
}
