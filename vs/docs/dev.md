# CodeStream for Visual Studio

## Getting the code

```shell
git clone https://github.com/TeamCodeStream/codestream.git
```

## Prerequisites

- Windows 10
- [Visual Studio 2022](https://visualstudio.microsoft.com/downloads/)
  - Various workloads including:
    - Visual Studio extension development
    - .NET Framework 4.8
    - .NET 5+ (to manage local/global tool installs)
    - Desktop Development with C++
- [Git](https://git-scm.com/) >=2.32.0
- [NodeJS](https://nodejs.org/en/) = 18.15.0
- [npm](https://npmjs.com/) = 9.6.2
- [DotNetBrowser](https://www.teamdev.com/dotnetbrowser) license. (it must be put into the git-ignored folder `\licenses\{Configuration}` where `{Configuration}` is Debug (dev license) or Release (runtime license)). It will be picked up by msbuild and put into the correct location at build time. These licenses should _not_ be commited to source control.

## Building (local)

The webview (shared/ui) and the agent (shared/agent) are js/node dependencies that must be built before running CodeStream for Visual Studio.

1. From a terminal, where you have cloned the `codestream` repository, cd to `shared/agent` and execute the following command to build the agent from scratch:

   ```shell
   npm run build
   ```

2. From a terminal, where you have cloned the `codestream` repository, cd to `vs` and execute the following command to rebuild shared/webview from scratch:

   ```shell
   npm run build
   ```

## Watching

During development you can use a watcher to make builds on changes quick and easy. You will need two watchers.

From a terminal, where you have cloned the `codestream` repository, cd to `shared/agent` execute the following command:

```shell
npm run watch
```

From a terminal, where you have cloned the `codestream` repository, cd to `vs` execute the following command:

```shell
npm run watch
```

It will do an initial full build of the webview and then watch for file changes, compiling those changes incrementally, enabling a fast, iterative coding experience.

## Debugging

### Visual Studio

1. Ensure that the agent and webview have been built or that the watcher is running for both (see the sections above)
1. Open the Visual Studio solution (`vs/src/CodeStream.VisualStudio.sln`),
1. Press `F5` to build and run the solution. This will open a new "experimental" version of Visual Studio.

>NOTE: you cannot have the CodeStream for VS extension installed from the marketplace AND run an experimental debugging instance of VS (you have to uninstall the version from the marketplace first)

All of the C# code is formatted with [CSharpier (an OSS, opinionated code formatter)](https://csharpier.com/), and is triggered using a pre-commit git hook. To ensure this works correctly, you must -

From a terminal, where you have cloned the `codestream` repository, cd to `vs/src` execute the following command:

```shell
dotnet tool install
```

You can also follow the instructions on the [CSharpier website to install an extension into your IDE](https://csharpier.com/docs/Editors) and set up CSharpier to automatically format each file on save (recommended).

At any time, you can re-format any code you've made changes to by opening a terminal to where you cloned the `codestream` repository, cd to `vs/src` and execute the following command:

```shell
dotnet csharpier .
```

### CodeStream LSP Agent

To debug the CodeStream LSP agent you will need both Visual Studio and VS Code.

- Ensure your shared/agent artifact is recently built.
- Once you have started debugging CodeStream in Visual Studio, leave it running, and in VS Code with the `codestream` repo open, choose `Attach to Agent (VS/JB) (agent)` from the launcher dropdown. This is allow you to attach to the running shared/agent process that Visual Studio spawned.
- From there, you can add breakpoints to the shared/agent code in VS Code. As requests and notifications to the agent happen, your breakpoints will be triggered.

## Builds

In Visual Studio, certain Solution/Project Configurations and Platforms have been configured.

Using 'Debug' and 'x64' will produce a Visual Studio 2022 compatible artifact at `.\vs\src\CodeStream.VisualStudio.Vsix.x64/bin/x64/Debug/codestream-vs-22.vsix` and can be debugged directly using the Visual Studio 2022 experimental instance.

The 'Release' configuration does the same thing, but does not produce any debugging symbols.

Our CI builds are processed via a private / internal Team City build server.

The steps are as follows:

```shell
.\vs\build\Pre-Build.ps1
.\vs\build\Build.ps1 -CI
.\vs\build\Post-Build.ps1
```

## Releasing

All releases are processed through the same internal / private Team City build server, with similar steps to a DEV build mentioned above, however, the final step pushes the artifacts to the proper VS Marketplace entries.

## Notes

### Language Server

CodeStream for Visual Studio uses an LSP client library from Microsoft. There are some caveats to using it -- as it is only allowed to be instantiated after a certain file (content) type is opened in the editor.

This sample creates a mock language server using the [common language server protocol](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md) and a mock language client extension in Visual Studio.

For more information on how to create language server extensions in Visual Studio, please see [here](https://docs.microsoft.com/en-us/visualstudio/extensibility/adding-an-lsp-extension) or [here](https://docs.microsoft.com/en-us/visualstudio/extensibility/language-server-protocol)

### Advanced Building

`vs` dependencies can be rebuilt using the `npm run rebuild` command from the `vs` folder. This assumes that an initial `build` has already been run.

### Menu and Commands

Menus are attached to the VisualStudio shell with a `.vsct` file. Here, they are contained in the `CodeStreamPackage.vsct` file. It is a _very_ fragile file: there is no intellisense, and any issues won't be known until runtime -- there will be no errors, just that the menus won't show up! It's highly recommend to install Mads Kristensen's ExtensibilityTools (see Tools). It will give intellisense, as well as a way to synchronize all the names/guids with a .cs file (ours is `CodeStreamPackageVSCT.cs`)

### Issues

- Occassionaly, VisualStudio will alert an error message with a path to a log file ending with ActivityLog.xml. This is usually a result of a MEF component not importing correctly. The path to the log file will be something like `C:\Users\{user}\AppData\Roaming\Microsoft\VisualStudio\{VisualStudioVersion}\ActivityLog.xml`. Be sure to open that file with Internet Explorer, as it will format it nicely as html.
- Related, MEF can get into a bad state and clearing the MEF cache can sometimes resolve issues where `Export`ed/`Import`ed components are failing. See Tools.

### Tools

#### Scripts

- `vs/tools/log-watcher-agent.ps1` and `vs/tools/log-watcher-extension.ps1` can be run to tail the two logs.

#### Extensions

- [Extensibility Tools (Clearing MEF cache, VSCT support)](https://marketplace.visualstudio.com/items?itemName=MadsKristensen.ExtensibilityTools)
- [Settings Store Explorer (Browse all VS settings in treeview format)](https://marketplace.visualstudio.com/items?itemName=PaulHarrington.SettingsStoreExplorer)

## Related Topics / Documentation

- [Visual Studio SDK Documentation](https://docs.microsoft.com/en-us/visualstudio/extensibility/visual-studio-sdk)
