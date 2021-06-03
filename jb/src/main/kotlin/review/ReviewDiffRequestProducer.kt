package com.codestream.review

import com.codestream.agentService
import com.codestream.protocols.agent.GetReviewContentsParams
import com.codestream.protocols.agent.Review
import com.intellij.diff.chains.DiffRequestProducer
import com.intellij.diff.requests.DiffRequest
import com.intellij.diff.requests.ErrorDiffRequest
import com.intellij.diff.requests.SimpleDiffRequest
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolder
import kotlinx.coroutines.runBlocking

class ReviewDiffRequestProducer(
    val project: Project,
    val review: Review,
    val repoId: String,
    val path: String,
    val checkpoint: Int?
) : DiffRequestProducer {
    override fun getName(): String = "CodeStream Review"

    override fun process(context: UserDataHolder, indicator: ProgressIndicator): DiffRequest {
        var request: DiffRequest? = null

        val agent = project.agentService
            ?: return ErrorDiffRequest("Project already disposed")

        runBlocking {
            val response = agent.getReviewContents(GetReviewContentsParams(review.id, repoId, path, checkpoint))
            val leftContent = createReviewDiffContent(
                project,
                response.repoRoot,
                review.id,
                checkpoint,
                repoId,
                ReviewDiffSide.LEFT,
                path, // response.leftPath,
                response.left ?: ""
            )
            val rightContent = createReviewDiffContent(
                project,
                response.repoRoot,
                review.id,
                checkpoint,
                repoId,
                ReviewDiffSide.RIGHT,
                path, // response.rightPath,
                response.right ?: ""
            )
            request =
                SimpleDiffRequest(review.title, leftContent, rightContent, response.leftPath, response.rightPath).also {
                    it.putUserData(REPO_ID, repoId)
                    it.putUserData(PATH, path)
                    it.putUserData(REVIEW_DIFF, true)
                }
        }

        return request ?: ErrorDiffRequest("Something went wrong")
    }
}
