package com.codestream.commands

import com.codestream.codeStream
import com.codestream.extensions.projectPaths
import com.codestream.gson
import com.codestream.protocols.webview.HostNotifications
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.intellij.ide.RecentProjectListActionProvider
import com.intellij.ide.ReopenProjectAction
import com.intellij.ide.impl.ProjectUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.JBProtocolCommand
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.project.ProjectManagerListener
import org.apache.commons.io.FileUtils
import java.io.File
import java.net.URLDecoder
import java.nio.charset.Charset
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Future

class CodeStreamCommand : JBProtocolCommand("codestream") {
    private val logger = Logger.getInstance(CodeStreamCommand::class.java)

    override fun perform(target: String?, parameters: MutableMap<String, String>, fragment: String?): Future<String?> {
        val future = CompletableFuture<String?>()
        WindowFocusWorkaround.bringToFront()

        ApplicationManager.getApplication().invokeLater {
            logger.info("Handling $target $parameters")

            val projectManager = ProjectManager.getInstance()
            val repoId = parameters["repoId"]
            val filePathEncoded = parameters["file"] ?: ""
            val filePath = URLDecoder.decode(filePathEncoded, "UTF-8")
            val repoMapping = repoId?.let {
                val repoMappings = readMappings().repos
                repoMappings[repoId]
            }

            var project: Project? = if (repoMapping != null) {
                logger.info("Found mapping for repo $repoId")
                logger.info("Repo paths: ${repoMapping.paths.joinToString(", ")}")
                logger.info("File path: $filePath")
                findOpenProject(repoMapping, filePath) ?: findRecentProject(repoMapping, filePath)
            } else {
                logger.info("No mapping found for repo $repoId")
                null
            }

            if (project !== null) {
                logger.info("Repo $repoId maps to project ${project.basePath}")
            } else {
                logger.info("Could not find open or recent project based on repo mappings")
                val openProjects = projectManager.openProjects
                if (openProjects.isNotEmpty()) {
                    logger.info("Defaulting to first open project")
                    project = openProjects.firstOrNull()
                } else if (repoMapping != null) {
                    try {
                        logger.info("Attempting to open ${repoMapping.defaultPath}")
                        project = ProjectUtil.openOrImport(repoMapping.defaultPath, null, true)
                    } catch (ex: Exception) {
                        logger.warn(ex)
                    }
                } else {
                    logger.info("No open projects or repo mapping")
                }
            }

            if (project == null) {
                logger.info("Awaiting for open project")
                ApplicationManager.getApplication().messageBus.connect()
                    .subscribe(ProjectManager.TOPIC, object : ProjectManagerListener {
                        var posted = false
                        override fun projectOpened(project: Project) {
                            if (!posted) {
                                project.handleUrlWhenReady(project, target, parameters)
                                posted = true
                                future.complete(null)
                            }
                        }
                    })
            } else {
                project.ensureOpened()
                project.handleUrlWhenReady(project, target, parameters)
                future.complete(null)
            }
        }
        return future
    }

    private fun findOpenProject(repoMapping: RepoMapping, filePath: String): Project? {
        logger.info("Checking open projects")
        val manager = ProjectManager.getInstance()
        return manager.openProjects.find {
            logger.info("Project paths: ${it.projectPaths.commaSeparated}")
            it.intersects(repoMapping.paths, filePath)
        }
    }

    private fun findRecentProject(repoMapping: RepoMapping, filePath: String): Project? {
        logger.info("Checking recent projects")
        val manager = RecentProjectListActionProvider.getInstance()
        val actions = manager.getActions(false, false)
        val recentPaths = actions.filterIsInstance<ReopenProjectAction>().map { it.projectPath }
        logger.info("Recent project paths: ${recentPaths.commaSeparated}")

        for (repoPath in repoMapping.paths) {
            val repoDir = File(repoPath)
            val file = File(repoDir, filePath)
            for (projectPath in recentPaths) {
                if (file.startsWith(projectPath)) {
                    logger.info("Opening recent project $projectPath")
                    return ProjectUtil.openOrImport(projectPath, null, true)
                }
            }
        }

        return null
    }

    private fun readMappings(): CodeStreamMappings {
        return try {
            val userHomeDir = File(System.getProperty("user.home"))
            val mappingsFile = userHomeDir.resolve(".codestream").resolve("mappings.json")
            val mappingsJson = FileUtils.readFileToString(mappingsFile, Charset.defaultCharset())
            gson.fromJson(mappingsJson)
        } catch (e: Exception) {
            logger.warn(e)
            CodeStreamMappings()
        }
    }

    private fun Project.handleUrlWhenReady(
        project: Project,
        target: String?,
        parameters: MutableMap<String, String>
    ) {
        if (isDisposed) {
            logger.info("Project already disposed")
            return
        }

        val url = "codestream://codestream/$target?" +
            parameters.map { entry -> entry.key + "=" + entry.value }.joinToString("&")
        logger.info("Will open $url in project $basePath")
        webViewService?.onDidInitialize {
            project.codeStream?.show {
                webViewService?.postNotification(HostNotifications.DidReceiveRequest(url), true)
            }
        }
    }
}

private fun Project.ensureOpened() {
    if (!isOpen && projectFilePath != null) {
        ProjectManager.getInstance().loadAndOpenProject(projectFilePath!!)
    }
}

private fun Project.intersects(repoPaths: Array<String>, filePath: String): Boolean {
    val projectDirs = projectPaths.map { File(it) }
    val repoDirs = repoPaths.map { File(it) }

    for (projectDir in projectDirs) {
        for (repoDir in repoDirs) {
            val file = repoDir.resolve(filePath)
            if (file.startsWith(projectDir) || repoDir.startsWith(projectDir)) {
                return true
            }
        }
    }

    return false
}

private val Collection<String>.commaSeparated: String
    get() = this.joinToString(", ")

class CodeStreamMappings(
    val repos: Map<String, RepoMapping> = mapOf(),
    val version: String = ""
)

class RepoMapping(
    val paths: Array<String>,
    val defaultPath: String
)
