package com.codestream.system

import java.io.File
import java.nio.file.Path
import java.nio.file.Paths

private enum class OS {
    WINDOWS, UNIX
}

private val os: OS by lazy {
    if (System.getProperty("os.name").toLowerCase().contains("win"))
        OS.WINDOWS
    else
        OS.UNIX
}

const val SPACE_ENCODED: String = "%20"
const val COLON_ENCODED: String = "%3A"
const val OPEN_SQUARE_BRACKET_ENCODED: String = "%5B"
const val CLOSE_SQUARE_BRACKET_ENCODED: String = "%5D"
const val HASH_ENCODED: String = "%23"
const val URI_FILE_BEGIN = "file:"
const val WINDOWS_NETWORK_FILE_BEGIN = "file:////"
const val URI_PATH_SEP: Char = '/'
const val URI_VALID_FILE_BEGIN: String = "file:///"
const val VCS_FILE_BEGIN = "vcs:/"
const val WSL_FROM_AGENT_BEGIN = "file://wsl%24"

fun String.replaceReservedUriCharacters(): String = this.replace(" ", SPACE_ENCODED)
    .replace("#", HASH_ENCODED)
    .replace("[", OPEN_SQUARE_BRACKET_ENCODED)
    .replace("]", CLOSE_SQUARE_BRACKET_ENCODED)

fun sanitizeURI(_uri: String?): String? {
    var uri = _uri ?: return null

    if (uri.startsWith(VCS_FILE_BEGIN)) {
        uri = uri.replace(VCS_FILE_BEGIN, URI_VALID_FILE_BEGIN)
    }

    if (uri.startsWith(WSL_FROM_AGENT_BEGIN)) {
        return uri.replace("file://wsl%24", "file://wsl$")
    } else if (uri.startsWith(WINDOWS_NETWORK_FILE_BEGIN)) {
        return uri.replace("file:////", "file://").replace("%24", "$")
    } else if (!uri.startsWith(URI_FILE_BEGIN)) {
        // LOG.warn("Malformed uri : " + uri)
        return uri // Probably not an uri
    } else {
        val reconstructed = StringBuilder()
        var uriCp = uri.replace(" ", SPACE_ENCODED) // Don't trust servers
        uriCp = uriCp.drop(URI_FILE_BEGIN.length).dropWhile { c -> c == URI_PATH_SEP }
        reconstructed.append(URI_VALID_FILE_BEGIN)

        return if (os == OS.UNIX) {
            reconstructed.append(uriCp).toString()
        } else {
            reconstructed.append(uriCp.takeWhile { c -> c != URI_PATH_SEP })
            val driveLetter = reconstructed[URI_VALID_FILE_BEGIN.length]
            if (driveLetter.isLowerCase()) {
                reconstructed.setCharAt(URI_VALID_FILE_BEGIN.length, driveLetter.toUpperCase())
            }
            if (reconstructed.endsWith(COLON_ENCODED)) {
                reconstructed.delete(reconstructed.length - 3, reconstructed.length)
            }
            if (!reconstructed.endsWith(":")) {
                reconstructed.append(":")
            }
            reconstructed.append(uriCp.dropWhile { c -> c != URI_PATH_SEP }).toString()
        }
    }
}

fun String?.isSameUri(uri: String): Boolean {
    if (this == uri) return true
    if (sanitizeURI(this) == uri) return true
    if (this == sanitizeURI(uri)) return true
    if (sanitizeURI(this) == sanitizeURI(uri)) return true
    return false
}

fun String.toFile(): File {
    return if (this.startsWith("file://wsl$/")) {
        val filePathString = this.replace("file:", "")
        val filePath: Path = Paths.get(filePathString)
        filePath.toFile()
    } else {
        File(this)
    }
}
