package com.codestream.actions

import com.codestream.DEBUG
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class TestUrlHandler : DumbAwareAction() {

    override fun update(e: AnActionEvent) {
        e.presentation.isVisible = DEBUG
    }

    override fun actionPerformed(e: AnActionEvent) {
        // JetBrainsProtocolHandler.processJetBrainsLauncherParameters("jetbrains://idea/codestream/newrelic/errorsinbox?1=1&errorGroupGuid=MXxFUlR8RVJSX0dST1VQfDMxMThlMjRkLTc3ZDMtMzJlNy05MWQyLTkyMmFjNjBiN2M0OA&traceId=efd0994d-9e45-11ec-b751-0242ac110010_8474_10911&src=NR-errorsinbox&entityId=MXxBUE18QVBQTElDQVRJT058Mjc5NzAwMw&timestamp=1646678371959&commit=null&remote=ssh://git@source.datanerd.us/distributed-tracing/distributed_tracing_service.git&tag=null&anonymousId=rb50ytx458bl0gz7ivmo2oy4ho6ha&controller=newrelic&action=errorsinbox");
        // JetBrainsProtocolHandler.processJetBrainsLauncherParameters("jetbrains://idea/codestream/newrelic/errorsinbox?1=1&errorGroupGuid=MXxFUlR8RVJSX0dST1VQfDMxMThlMjRkLTc3ZDMtMzJlNy05MWQyLTkyMmFjNjBiN2M0OA&traceId=7febfd9d-29ed-11ec-9f5b-0242ac11000f_1030_3622&src=NR-errorsinbox&entityId=MXxBUE18QVBQTElDQVRJT058Mjc5NzAwMw&commit=null&remote=https://source.datanerd.us/distributed-tracing/distributed_tracing_service.git&tag=null&controller=newrelic&action=errorsinbox");
        // JetBrainsProtocolHandler.processJetBrainsLauncherParameters("jetbrains://idea/codestream/newrelic/errorsinbox?1=1&errorGroupGuid=MXxFUlR8RVJSX0dST1VQfDMxMThlMjRkLTc3ZDMtMzJlNy05MWQyLTkyMmFjNjBiN2M0OA&traceId=7febfd9d-29ed-11ec-9f5b-0242ac11000f_1030_3622&src=NR-errorsinbox&entityId=MXxBUE18QVBQTElDQVRJT058Mjc5NzAwMw&commit=123c8092393aa8085320fbea2315cfe1b8d076d5&remote=https://source.datanerd.us/distributed-tracing/distributed_tracing_service.git&tag=null&controller=newrelic&action=errorsinbox");
        // JetBrainsProtocolHandler.processJetBrainsLauncherParameters("jetbrains://idea/codestream/newrelic/errorsinbox?1=1&errorGroupGuid=MXxFUlR8RVJSX0dST1VQfDMxMThlMjRkLTc3ZDMtMzJlNy05MWQyLTkyMmFjNjBiN2M0OA&traceId=954c9592-36ae-11ec-9f5b-0242ac11000f_0_2443&src=NR-errorsinbox&entityId=MXxBUE18QVBQTElDQVRJT058Mjc5NzAwMw&timestamp=1635288399867&remote=git@source.datanerd.us:distributed-tracing/distributed_tracing_service.git&controller=newrelic&action=errorsinbox")
        // JetBrainsProtocolHandler.processJetBrainsLauncherParameters("jetbrains://idea/codestream/newrelic/errorsinbox?1=1&errorGroupGuid=MXxFUlR8RVJSX0dST1VQfDMxMThlMjRkLTc3ZDMtMzJlNy05MWQyLTkyMmFjNjBiN2M0OA&traceId=954c9592-36ae-11ec-9f5b-0242ac11000f_0_2443&src=NR-errorsinbox&entityId=MXxBUE18QVBQTElDQVRJT058Mjc5NzAwMw&commit=123c8092393aa8085320fbea2315cfe1b8d076d5&timestamp=1635288399867&remote=git@source.datanerd.us:distributed-tracing/distributed_tracing_service.git&controller=newrelic&action=errorsinbox")
        // JBProtocolCommand.handleCurrentCommand()

        // 2021.3+
        // JBProtocolCommand.execute()
        // CommandLineProcessor.processProtocolCommand
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}
