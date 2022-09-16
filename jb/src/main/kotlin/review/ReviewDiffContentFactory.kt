package com.codestream.review

import com.codestream.extensions.file
import com.codestream.protocols.agent.Review
import com.codestream.protocols.agent.ScmSha1RangesResultLinesChanged
import com.intellij.codeInsight.daemon.OutsidersPsiFileSupport
import com.intellij.diff.contents.DocumentContent
import com.intellij.diff.contents.DocumentContentImpl
import com.intellij.diff.util.DiffUserDataKeysEx
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileTypes.FileTypes
import com.intellij.openapi.fileTypes.PlainTextFileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.text.StringUtil
import com.intellij.openapi.vcs.RemoteFilePath
import com.intellij.psi.PsiDocumentManager
import java.io.File

fun createReviewDiffContent(
    project: Project,
    repoRoot: String?,
    review: Review?,
    checkpoint: Int?,
    repoId: String,
    side: ReviewDiffSide,
    path: String,
    text: String
): DocumentContent {
    val checkpointStr = checkpoint?.toString() ?: "undefined"
    val reviewId = review?.id ?: "local"
    val fullPath = "$reviewId/$checkpointStr/$repoId/${side.path}/$path"

    return createDiffContent(project, repoRoot, review?.postId, null, fullPath, side, path, text, reviewId != "local", null)
}

fun createRevisionDiffContent(
    project: Project,
    repoRoot: String,
    data: CodeStreamDiffUriData,
    side: ReviewDiffSide,
    text: String,
    diffRanges: List<ScmSha1RangesResultLinesChanged>
): DocumentContent {
    return createDiffContent(project, repoRoot, null, data.context, data.toEncodedPath(), side, data.path, text, true, diffRanges)
}

fun createDiffContent(
    project: Project,
    repoRoot: String?,
    parentPostId: String?,
    context: CodeStreamDiffUriContext?,
    fullPath: String,
    side: ReviewDiffSide,
    path: String,
    text: String,
    canCreateMarker: Boolean,
    diffRanges: List<ScmSha1RangesResultLinesChanged>?
): DocumentContent {
    val filePath = RemoteFilePath(fullPath, false)

    val fileType = when (filePath.fileType) {
        FileTypes.UNKNOWN -> PlainTextFileType.INSTANCE
        else -> filePath.fileType
    }
    val separator = StringUtil.detectSeparators(text)
    val correctedText = StringUtil.convertLineSeparators(text)

    // Borrowed from com.intellij.diff.DiffContentFactoryImpl
    val document = ReadAction.compute<Document, RuntimeException> {
        val file = ReviewDiffVirtualFile.create(fullPath, side, path, correctedText, fileType, canCreateMarker)
        file.isWritable = false
        OutsidersPsiFileSupport.markFile(file, repoRoot?.let{ File(it).resolve(path).path })
        val document = FileDocumentManager.getInstance().getDocument(file) ?: return@compute null
        PsiDocumentManager.getInstance(project).getPsiFile(document)
        document
    } ?: EditorFactory.getInstance().createDocument(correctedText).also { it.setReadOnly(true) }
    document.putUserData(PARENT_POST_ID, parentPostId)
    document.putUserData(PULL_REQUEST, context?.pullRequest)
    document.putUserData(DIFF_RANGES, diffRanges)
    document.putUserData(DiffUserDataKeysEx.FILE_NAME, filePath.name)
    document.putUserData(LOCAL_PATH, repoRoot?.let{ File(it).resolve(path).path })

    val content: DocumentContent =
        DocumentContentImpl(project, document, fileType, document.file, separator, null, null)
    content.putUserData(DiffUserDataKeysEx.FILE_NAME, filePath.name)

    return content
}
