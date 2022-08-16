package com.codestream.system

import com.intellij.openapi.util.SystemInfo
import com.intellij.util.system.CpuArch

val platform: Platform by lazy {
    when {
        SystemInfo.isLinux -> when {
            CpuArch.isArm64() -> Platform.LINUX_ARM64
            else -> Platform.LINUX_X64
        }
        SystemInfo.isMac -> when {
            CpuArch.isArm64() -> Platform.MAC_ARM64
            else -> Platform.MAC_X64
        }
        SystemInfo.isWindows -> when {
            CpuArch.isArm64() || CpuArch.isIntel64() -> Platform.WIN_X64
            else -> Platform.WIN_32
        }
        else -> throw IllegalStateException("Unable to detect system platform")
    }
}

enum class Platform(val isPosix: Boolean) {
    LINUX_X64(true),
    LINUX_ARM64(true),
    MAC_X64(true),
    MAC_ARM64(true),
    WIN_X64(false),
    WIN_32(false)
}
