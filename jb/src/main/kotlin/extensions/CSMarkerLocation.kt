package com.codestream.extensions

import com.codestream.protocols.agent.CSMarkerLocation
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.Range

// Convert a CSMarkerLocation to an LSP4J Range but using beginning of line (column 0)
fun CSMarkerLocation.toRangeIgnoreColumn(): Range {
    return Range(
        Position(lineStart - 1, 0),
        Position(lineEnd - 1, 0)
    )
}
