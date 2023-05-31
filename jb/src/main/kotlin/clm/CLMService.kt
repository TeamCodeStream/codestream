package com.codestream.clm

import com.codestream.appDispatcher
import com.intellij.openapi.project.DumbService
import com.intellij.openapi.project.Project
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import java.util.concurrent.CompletableFuture

class CLMService(val project: Project) {

    private val _languageComponents = mutableListOf<CLMLanguageComponent<*>>()

    fun registerLanguageComponent(component: CLMLanguageComponent<*>) {
        _languageComponents.add(component)
    }

    fun filterNamespaces(namespaces: List<String>): List<String> {
        val filteredNamespaces = mutableListOf<String>()
        _languageComponents.forEach {
            filteredNamespaces.addAll(it.filterNamespaces(namespaces))
        }
        return filteredNamespaces
    }

    suspend fun revealSymbol(className: String?, functionName: String?): Boolean {
        val future = CompletableFuture<Boolean>()
        DumbService.getInstance(project).smartInvokeLater {
            for (component in _languageComponents) {
                val symbol = component.findSymbol(className, functionName)
                symbol?.let {
                    it.navigate(false)
                    future.complete(true)
                }
            }
            future.complete(false)
        }
        return future.await()
    }

    suspend fun copySymbol(uri: String, namespace: String?, functionName: String, ref: String?): FindSymbolInFileResponse? {
        val future = CompletableFuture<FindSymbolInFileResponse?>()
        DumbService.getInstance(project).smartInvokeLater {
            appDispatcher.launch {
                val result = copySymbolInternal(uri, namespace, functionName, ref)
                if (result != null) {
                    future.complete(result)
                } else
                    future.complete(null)

            }
        }
        return future.await()
    }

    private suspend fun copySymbolInternal(uri: String, namespace: String?, functionName: String, ref: String?): FindSymbolInFileResponse? {
        for (component in _languageComponents) {
            val response = component.copySymbolInFile(uri, namespace, functionName, ref)
            if (response != null) {
                return response
            }
        }
        return null
    }
}
