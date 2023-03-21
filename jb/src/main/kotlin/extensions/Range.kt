package com.codestream.extensions

import org.eclipse.lsp4j.Range

fun Range.prettyRange(): String {
    return "${this.start.line}:${this.start.character}-${this.end.line}:${this.end.character}"
}
