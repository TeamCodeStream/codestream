package com.codestream.review

import com.codestream.agentService
import com.codestream.protocols.agent.GetFileContentsAtRevisionParams
import com.intellij.diff.chains.DiffRequestProducer
import com.intellij.diff.requests.DiffRequest
import com.intellij.diff.requests.ErrorDiffRequest
import com.intellij.diff.requests.SimpleDiffRequest
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolder
import kotlinx.coroutines.runBlocking

class PullRequestProducer(
    val project: Project,
    val repoId: String,
    val filePath: String,
    val previousFilePath: String?,
    val headSha: String,
    val headBranch: String,
    val baseSha: String,
    val baseBranch: String,
    val codeStreamContext: CodeStreamDiffUriContext?
) : DiffRequestProducer {
    override fun getName(): String = "CodeStream Pull Request"

    override fun process(context: UserDataHolder, indicator: ProgressIndicator): DiffRequest {
        var request: DiffRequest? = null

        val agent = project.agentService
            ?: return ErrorDiffRequest("Project already disposed")

        runBlocking {
            val headContents = agent.getFileContentsAtRevision(
                GetFileContentsAtRevisionParams(
                    repoId,
                    path = filePath,
                    sha = headSha
                )
            )

            val baseContents = agent.getFileContentsAtRevision(
                GetFileContentsAtRevisionParams(
                    repoId,
                    path = previousFilePath ?: filePath,
                    sha = baseSha
                )
            )

            val leftData = CodeStreamDiffUriData(
                filePath,
                repoId,
                baseBranch,
                headBranch,
                baseSha,
                headSha,
                "left",
                codeStreamContext
            )

            val rightData = CodeStreamDiffUriData(
                filePath,
                repoId,
                baseBranch,
                headBranch,
                baseSha,
                headSha,
                "right",
                codeStreamContext
            )

            val leftContent =
                createRevisionDiffContent(project, baseContents.repoRoot, leftData, ReviewDiffSide.LEFT, baseContents.content)
            val rightContent =
                createRevisionDiffContent(project, headContents.repoRoot, rightData, ReviewDiffSide.RIGHT, headContents.content)
            val title = "$filePath (${baseSha.take(8)}) ⇔ (${headSha.take(8)})"
            request = SimpleDiffRequest(title, leftContent, rightContent, filePath, filePath).also {
                it.putUserData(REVIEW_DIFF, true)
            }
        }

        return request ?: ErrorDiffRequest("Something went wrong")
    }
}
