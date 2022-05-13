# CodeStream for Visual Studio

### Getting the code

```
git clone https://github.com/TeamCodeStream/codestream.git
```

Prerequisites

- Windows 10
- [Visual Studio 2019](https://visualstudio.microsoft.com/downloads/)
   - Various workloads including:
      - Visual Studio extension development
      - .NET Framework 4.8
- [Git](https://git-scm.com/), >= 2.32.0
- [NodeJS](https://nodejs.org/en/), 16.13.2
- [npm](https://npmjs.com/), 8.1.2

- [DotNetBrowser](https://www.teamdev.com/dotnetbrowser) license. (it must be put into the git-ignored folder `\licenses\{Configuration}` where `{Configuration}` is Debug (dev license) or Release (runtime license)). It will be picked up by msbuild and put into the correct location at build time. These licenses should _not_ be commited to source control.

### Building (local)

The webview (shared/ui) and the agent (shared/agent) are js/node dependencies that must be built before running CodeStream for Visual Studio.

>NOTE: you will need an elevated prompt the first time you run the following commands to create various symlinks.


1. From a terminal, where you have cloned the `codestream` repository, cd to `shared/agent` and execute the following command to build the agent from scratch:

   ```
   npm run build
   ```


2. From a terminal, where you have cloned the `codestream` repository, cd to `vs` and execute the following command to rebuild shared/webview from scratch:

   ```
   npm run build
   ```
### Watching

During development you can use a watcher to make builds on changes quick and easy. You will need two watchers. 

From a terminal, where you have cloned the `codestream` repository, cd to `shared/agent` execute the following command:

```
npm run watch
```

From a terminal, where you have cloned the `codestream` repository, cd to `vs` execute the following command:

```
npm run watch
```

It will do an initial full build of the webview and then watch for file changes, compiling those changes incrementally, enabling a fast, iterative coding experience.

### Debugging

#### Visual Studio

1. Ensure that the agent and webview have been built or that the watcher is running for both (see the sections above)
1. Open the Visual Studio solution (`vs/src/CodeStream.VisualStudio.sln`),
1. Press `F5` to build and run the solution. This will open a new "experimental" version of Visual Studio.

>NOTE: you cannot have the CodeStream for VS extension installed from the marketplace AND run an experimental debugging instance of VS (you have to uninstall the version from the marketplace first)

The `CodeStream.VisualStudio.CodeLens `project runs out of process from the main extension, and must be debugged slightly differently.

1. This project will run under the guise of a `ServiceHub` executable, and figuring out exactly which one is difficult. The easiest path (right now) is to add a `Debugger.Launch();` into the codebase for local development until we can instrument a better solution.
1. The `ServiceHub` / `CodeLens` project will write its own log file to `%HOME%\AppData\Local\Temp\servicehub\logs` with `CodeLens` in the filename. Very useful for debugging.

#### CodeStream LSP Agent

To debug the CodeStream LSP agent you will need both Visual Studio and VS Code. 
- Ensure your shared/agent artifact is recently built. 
- Once you have started debugging CodeStream in Visual Studio, leave it running, and in VS Code with the `codestream` repo open, choose `Attach to Agent (VS/JB) (agent)` from the launcher dropdown. This is allow you to attach to the running shared/agent process that Visual Studio spawned. 
- From there, you can add breakpoints to the shared/agent code in VS Code. As requests and notifications to the agent happen, your breakpoints will be triggered. 

### Build (CI)

Visual Studio builds are attached to an internal Team City build process. 

```
cd build
.\Pre-Build.ps1
.\Bump-Version.ps1 -BuildNumber $env:build_number  -BumpBuild
.\Build.ps1
```

The build portion of the artifact version can be updated using `.\Bump-Version.ps1 -BuildNumber 666 -BumpBuild`. this will convert `0.1.0` to `0.1.0.666`

### Releasing

To create a local release artifact. From PowerShell, run

```
cd vs\build
.\Release.ps1
```

Under the hood this calls `Bump-Version.ps1` and `Build.ps1`. These can be run separately if necessary

By default `Release.ps1` will bump the Minor version of the package (the version lives in three spots: manifest, AssemblyInfo, SolutionInfo).

`Build.ps1` will restore, build, unit test, and generate all output in \build\artifacts\\{Platform}\\{Configuration}. The resulting extension artifact in that directory is called `codestream-vs.vsix`

## Notes

#### Language Server

CodeStream.VisualStudio uses an LSP client library from Microsoft. There are some caveats to using it -- as it is only allowed to be instantiated after a certain file (content) type is opened in the editor.

This sample creates a mock language server using the [common language server protocol](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md) and a mock language client extension in Visual Studio. For more information on how to create language server extensions in Visual Studio, please see [here](https://docs.microsoft.com/en-us/visualstudio/extensibility/adding-an-lsp-extension).

#### Advanced building

`vs` dependencies can be rebuilt using the `npm run rebuild` command from the `vs` folder. This assumes that an initial `build` has already been run.


**Related topics**

- [Language Server Protocol](https://docs.microsoft.com/en-us/visualstudio/extensibility/language-server-protocol)
- [Creating a language server extension in Visual Studio](https://docs.microsoft.com/en-us/visualstudio/extensibility/adding-an-lsp-extension)
- [ Visual Studio SDK Documentation ](https://docs.microsoft.com/en-us/visualstudio/extensibility/visual-studio-sdk)

#### Menu and Commands

Menus are attached to the VisualStudio shell with a `.vsct` file. Here, they are contained in the `CodeStreamPackage.vsct` file. It is a _very_ fragile file: there is no intellisense, and any issues won't be known until runtime -- there will be no errors, just that the menus won't show up! It's highly recommend to install Mads Kristensen's ExtensibilityTools (see Tools). It will give intellisense, as well as a way to synchronize all the names/guids with a .cs file (ours is `CodeStreamPackageVSCT.cs`)

### Issues

- Occassionaly, VisualStudio will alert an error message with a path to a log file ending with ActivityLog.xml. This is usually a result of a MEF component not importing correctly. The path to the log file will be something like `C:\Users\{user}\AppData\Roaming\Microsoft\VisualStudio\{VisualStudioVersion}\ActivityLog.xml`. Be sure to open that file with Internet Explorer, as it will format it nicely as html.
- Related, MEF can get into a bad state and clearing the MEF cache can sometimes resolve issues where `Export`ed/`Import`ed components are failing. See Tools.

### Tools

Scripts:

- `vs/tools/log-watcher-agent.ps1` and `vs/tools/log-watcher-extension.ps1` can be run to tail the two logs.

Extensions: 

- https://marketplace.visualstudio.com/items?itemName=MadsKristensen.ExtensibilityTools (Clearing MEF cache, VSCT support)
