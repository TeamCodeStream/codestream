package com.codestream.review

import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.protocols.agent.GetLocalReviewContentsParams
import com.codestream.protocols.agent.GetReviewContentsResult
import com.codestream.protocols.webview.ReviewNotifications
import com.codestream.sessionService
import com.codestream.webViewService
import com.intellij.diff.chains.DiffRequestChain
import com.intellij.diff.editor.ChainDiffVirtualFile
import com.intellij.diff.editor.DiffRequestProcessorEditor
import com.intellij.diff.editor.SimpleDiffVirtualFile
import com.intellij.diff.impl.CacheDiffRequestChainProcessor
import com.intellij.diff.requests.SimpleDiffRequest
import com.intellij.diff.tools.simple.SimpleDiffTool
import com.intellij.diff.util.DiffUserDataKeysEx
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.util.KeyWithDefaultValue
import com.intellij.openapi.vfs.VirtualFile
import org.eclipse.lsp4j.Range
import java.lang.reflect.Field
import java.lang.reflect.Method

enum class ReviewDiffSide(val path: String) {
    LEFT("left"),
    RIGHT("right")
}

val REVIEW_DIFF = KeyWithDefaultValue.create("REVIEW_DIFF", false)
val REPO_ID = Key<String>("REPO_ID")
val PATH = Key<String>("PATH")

class ReviewService(private val project: Project) {

    var lastReviewFile: VirtualFile? = null
    private val processorField: Field =
        DiffRequestProcessorEditor::class.java.getDeclaredField("processor").also { it.isAccessible = true }
    private val goToPrevChangeMethod: Method =
        CacheDiffRequestChainProcessor::class.java.getDeclaredMethod("goToPrevChange", Boolean::class.java)
            .also { it.isAccessible = true }
    private val goToNextChangeMethod: Method =
        CacheDiffRequestChainProcessor::class.java.getDeclaredMethod("goToNextChange", Boolean::class.java)
            .also { it.isAccessible = true }
    private var diffChain: DiffRequestChain? = null
    private var currentKey: String? = null

    suspend fun showDiff(reviewId: String, repoId: String, checkpoint: Int?, path: String) {
        val agent = project.agentService ?: return
        val key = "$reviewId|$repoId|$checkpoint"

        if (reviewDiffEditor == null || diffChain == null || key != currentKey) {
            closeDiff()
            val review = agent.getReview(reviewId)
            currentKey = key

            val changeset = review.reviewChangesets.findLast {
                it.repoId == repoId && (checkpoint == null || it.checkpoint == checkpoint)
            } ?: return

            val files = if (checkpoint == null) changeset.modifiedFiles else changeset.modifiedFilesInCheckpoint
            val producers = files.map { it.file }.map {
                ReviewDiffRequestProducer(project, review, repoId, it, checkpoint)
            }

            val myDiffChain = ReviewDiffRequestChain(producers).also { chain ->
                chain.putUserData(REVIEW_DIFF, true)
                chain.index = producers.indexOfFirst {
                    it.repoId == repoId && it.path == path
                }
            }.also {
                it.putUserData(DiffUserDataKeysEx.FORCE_DIFF_TOOL, SimpleDiffTool.INSTANCE)
            }
            diffChain = myDiffChain

            ApplicationManager.getApplication().invokeLater {
                val diffFile = ChainDiffVirtualFile(myDiffChain, "Feedback Request")
                FileEditorManager.getInstance(project).openFile(diffFile, true)
            }
        }

        val index = (diffChain!!.requests as List<ReviewDiffRequestProducer>).indexOfFirst {
            it.repoId == repoId && it.path == path
        }
        ApplicationManager.getApplication().invokeLater {
            val processor = reviewDiffEditor?.let { processorField.get(it) as CacheDiffRequestChainProcessor }
            processor?.setCurrentRequest(index)
        }
    }

    suspend fun showLocalDiff(
        repoId: String,
        path: String,
        oldPath: String?,
        includeSaved: Boolean,
        includeStaged: Boolean,
        editingReviewId: String?,
        baseSha: String
    ) {
        val agent = project.agentService ?: return

        val rightVersion = when {
            includeSaved -> "saved"
            includeStaged -> "staged"
            else -> "head"
        }
        val contents = agent.getLocalReviewContents(
            GetLocalReviewContentsParams(
                repoId,
                path,
                oldPath,
                editingReviewId,
                baseSha,
                rightVersion
            )
        )
        showDiffContent("local", null, repoId, path, oldPath, contents, "New Review")
    }

    private fun showDiffContent(
        reviewId: String,
        checkpoint: Int?,
        repoId: String,
        path: String,
        oldPath: String?,
        contents: GetReviewContentsResult,
        title: String
    ) {
        val leftContent =
            createReviewDiffContent(
                project,
                contents.repoRoot,
                reviewId,
                checkpoint,
                repoId,
                ReviewDiffSide.LEFT,
                oldPath ?: path,
                contents.left ?: ""
            )
        val rightContent =
            createReviewDiffContent(
                project,
                contents.repoRoot,
                reviewId,
                checkpoint,
                repoId,
                ReviewDiffSide.RIGHT,
                path,
                contents.right ?: ""
            )
        val diffRequest = SimpleDiffRequest(title, leftContent, rightContent, oldPath ?: path, path)
        diffRequest.putUserData(REVIEW_DIFF, true)
        val file = SimpleDiffVirtualFile(diffRequest)
        ApplicationManager.getApplication().invokeLater {
            val manager = FileEditorManager.getInstance(project)
            lastReviewFile?.let { manager.closeFile(it) }
            lastReviewFile = file
            manager.openFile(file, true)
        }
    }

    suspend fun showRevisionsDiff(
        repoId: String,
        filePath: String,
        previousFilePath: String?,
        headSha: String,
        headBranch: String,
        baseSha: String,
        baseBranch: String,
        context: CodeStreamDiffUriContext?
    ) {
        val agent = project.agentService ?: return
        val key = "$filePath|$repoId"

        if (reviewDiffEditor == null || diffChain == null || key != currentKey) {
            closeDiff()
            val filesPath: List<Pair<String, String?>> // filename / previous filename (optional)
            if (context?.pullRequest != null) {
                val prFiles = agent.getPullRequestFiles(context.pullRequest.id, context.pullRequest.providerId)
                filesPath = prFiles.map { Pair(it.filename, it.previousFilename) }
            } else {
                filesPath = listOf(Pair(filePath, previousFilePath))
            }

            currentKey = key

            val producers = filesPath.map {
                PullRequestProducer(project, repoId, it.first, it.second, headSha, headBranch, baseSha, baseBranch, context)
            }

            val myDiffChain = PullRequestChain(producers).also { chain ->
                chain.putUserData(REVIEW_DIFF, true)
                chain.index = producers.indexOfFirst {
                    it.filePath == filePath
                }
            }.also {
                it.putUserData(DiffUserDataKeysEx.FORCE_DIFF_TOOL, SimpleDiffTool.INSTANCE)
            }
            diffChain = myDiffChain

            val providerId = context?.pullRequest?.providerId ?: ""
            val tabName = when {
                providerId.contains("github", true) -> "Pull Request"
                providerId.contains("gitlab", true) -> "Merge Request"
                else -> "Diff"
            }

            ApplicationManager.getApplication().invokeLater {
                val diffFile = ChainDiffVirtualFile(myDiffChain, tabName)
                FileEditorManager.getInstance(project).openFile(diffFile, true)
            }
        }

        val index = (diffChain!!.requests as List<PullRequestProducer>).indexOfFirst {
            it.repoId == repoId && it.filePath == filePath
        }
        ApplicationManager.getApplication().invokeLater {
            val processor = reviewDiffEditor?.let { processorField.get(it) as CacheDiffRequestChainProcessor }
            processor?.setCurrentRequest(index)
        }
    }

    fun closeDiff() {
        reviewDiffEditor?.let {
            ApplicationManager.getApplication().invokeLater {
                FileEditorManager.getInstance(project).closeFile(it.file)
            }
        }
    }

    fun nextDiff() {
        ApplicationManager.getApplication().invokeLater {
            reviewDiffEditor?.processor?.let { goToNextChangeMethod.invoke(it, true) }
        }
    }

    fun previousDiff() {
        ApplicationManager.getApplication().invokeLater {
            reviewDiffEditor?.processor?.let { goToPrevChangeMethod.invoke(it, true) }
        }
    }

    fun createReviewFromExternalCommit() {
        if (project.sessionService?.userLoggedIn?.user?.preferences?.reviewCreateOnCommit == false) return

        ApplicationManager.getApplication().invokeLater {
            project.codeStream?.show {
                project.webViewService?.postNotification(
                    ReviewNotifications.New(
                        null,
                        Range(),
                        "JB Commit Detected",
                        true
                    )
                )
            }
        }
    }

    private val reviewDiffEditor
        get() = FileEditorManager.getInstance(project).allEditors.find {
            it is DiffRequestProcessorEditor
                && (processorField.get(it) as? CacheDiffRequestChainProcessor)?.requestChain?.getUserData(REVIEW_DIFF) == true
        } as DiffRequestProcessorEditor?

    private val DiffRequestProcessorEditor.processor
        get() = processorField.get(this) as CacheDiffRequestChainProcessor
}
