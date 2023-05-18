package com.codestream.agent.handlers

import com.codestream.agent.ResolveStackTracePathsRequest
import com.codestream.agent.ResolveStackTracePathsResponse
import com.codestream.gson
import com.github.salomonbrys.kotson.fromJson
import com.github.salomonbrys.kotson.get
import com.google.gson.JsonElement
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.search.FilenameIndex
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.util.concurrency.AppExecutorUtil
import java.util.concurrent.CompletableFuture

private val jsGenericFiles = setOf("main", "index", "app")

class ResolvedPath(
    val path: String,
    val depth: Int,
    val discardedPath: String,
    val discardedDepth: Int
)

class ResolveStackTraceHandler(private val project: Project) {

    /* Support for monorepos with many files with same name like index.js
       Try to find a file that is not a generic file name like index.js and use that as the base
       directory for the stack trace file resolution.
    */
    private fun findNonGenericFile(files: List<String?>, language: String?, projectSearchScope: GlobalSearchScope): String? {
        if (language != "javascript") {
            // only javascript for now
            return null
        }
        for (file in files) {
            if (file == null) {
                continue
            }
            val filePart = file.replace("\\", "/").substringAfterLast("/")
            val fileWithoutExtension = filePart.substringBefore(".")
            if (!jsGenericFiles.contains(fileWithoutExtension)) {
                // Use FilenameIndex to filter out libraries we don't want to even think about
                val virtualFiles = FilenameIndex.getVirtualFilesByName(filePart, projectSearchScope)
                if (virtualFiles.isNotEmpty()) {
                    return file
                }
            }
        }
        return null
    }

    // Attempt to resolve the sub-project of a monorepo that a file belongs to
    // Javascript only for now - future implementations will need to pass in language parameter
    private fun findParentProjectPath(file: VirtualFile): String {
        var myFile = file.parent

        while (myFile != null) {
            if (myFile.findFileByRelativePath("./package.json") != null) {
                return myFile.path
            }
            myFile = myFile.parent
        }
        return file.path.substringBeforeLast("/")
    }

    private fun choiciest(matchingPaths: List<VirtualFile>, stackTracePathIn: String): VirtualFile {
        if (matchingPaths.size == 1) {
            return matchingPaths[0]
        }
        // Root path so choose the shortest path
        if (!stackTracePathIn.startsWith("/")) {
            return matchingPaths.minBy { it.path.length }
        }
        return matchingPaths[0]
    }

    fun resolveStackTracePaths(json: JsonElement): CompletableFuture<ResolveStackTracePathsResponse> {
        val request = gson.fromJson<ResolveStackTracePathsRequest>(json[0])

        val future = CompletableFuture<ResolveStackTracePathsResponse>()
        ReadAction.nonBlocking {
            val resolvedPaths = mutableListOf<ResolvedPath?>()
            val projectSearchScope = GlobalSearchScope.projectScope(project)
            val uniqueFile = findNonGenericFile(request.paths ?: emptyList(), request.language, projectSearchScope)
//            val uniqueFilePath: String? = uniqueFile?.substringBeforeLast("/")
            val uniqueFileFile: String? = uniqueFile?.substringAfterLast("/")
            val uniqueFileVirtualFile = if (uniqueFileFile != null) {
                FilenameIndex.getVirtualFilesByName(uniqueFileFile, projectSearchScope).firstOrNull()
            } else {
                null
            }
            val uniqueFileParentPath = if (uniqueFileVirtualFile != null) {
                findParentProjectPath(uniqueFileVirtualFile)
            } else {
                null
            }
            for (path in request.paths ?: arrayListOf()) {
                if (path == null) {
                    resolvedPaths += null
                    continue
                }
                val parts = path.replace("\\", "/").split("/").toMutableList()
                val discardedParts = mutableListOf<String>()
                var found = false
                val search = parts.last()
                val filenameMatchesResponse = FilenameIndex.getVirtualFilesByName(search, projectSearchScope)
                val filenameMatches = if (uniqueFileParentPath != null)
                    filenameMatchesResponse.filter { it.path.startsWith(uniqueFileParentPath) }
                else
                    filenameMatchesResponse

                while (!found && parts.isNotEmpty() && filenameMatches.isNotEmpty()) {
                    val partial = parts.joinToString("/")
                    val matchingPaths = filenameMatches.filter { it.path.replace("\\", "/").endsWith(partial) }
                    if (matchingPaths.isEmpty()) {
                        discardedParts += parts.removeFirst()
                    } else {
                        found = true
                        val matchingPath = choiciest(matchingPaths, partial)
                        resolvedPaths += ResolvedPath(matchingPath.path, parts.size, discardedParts.joinToString("/"), discardedParts.size)
                    }
                }
                if (!found) {
                    resolvedPaths += null
                }
            }
            var maxDepth = 0
            var discardedPath = ""
            for (resolvedPath in resolvedPaths) {
                if (resolvedPath != null && resolvedPath.depth > maxDepth) {
                    maxDepth = resolvedPath.depth
                    discardedPath = resolvedPath.discardedPath
                }
            }

            val filteredResolvedPaths = resolvedPaths.map { if (it?.discardedPath == discardedPath) it else null }
            future.complete(ResolveStackTracePathsResponse(filteredResolvedPaths.map { it?.path }))
        }.submit(AppExecutorUtil.getAppExecutorService())
        return future
    }
}