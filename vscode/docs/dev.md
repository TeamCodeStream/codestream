# CodeStream for Visual Studio Code

New to VSCode/Codestream? Look for a novice debugging examples at the end of this file.

### Getting the code

```
git clone https://github.com/TeamCodeStream/codestream.git
```

Prerequisites

- [Git](https://git-scm.com/), >=2.32.0
- [NodeJS](https://nodejs.org/en/), =16.13.2
- [npm](https://npmjs.com/), >=8.13.1

### Before you begin...

The CodeStream clients all live in a single git mono-repo. Each IDE has their own tools for generating builds and VS Code is no different!

CodeStream for VS Code uses Language Server Protocol (LSP) to communicate with the IDE. Along with the .vsix artifact created from packaging CodeStream for VS Code, there is an _agent_ executable that must also be built and shipped with the CodeStream extension. Therefore, the agent must be built before you can locally build or debug the extension.

### Build

From a terminal, where you have cloned the repository, execute the following command to build the agent and CodeStream for VS Code extension from scratch:

```
cd vscode
npm run rebuild
```

👉 **NOTE!** This will run a complete rebuild of the extension, webview, and agent.

To just run a quick build of the extension, use:

```
cd vscode
npm run build
```

To just run a quick build of the agent, use:

```
cd shared/agent
npm run build
```

### In short...

`npm install --no-save`... needs to be run for shared/ui, shared/agent, vscode

`npm run build`... needs to be run for shared/agent _then_ vscode

##### Ubuntu 18.04: 'pushd not found'

If you get a 'pushd not found' error on npm run rebuild, it's because Ubuntu uses sh for the default shell. Tell npm to use bash instead:

Create a file in the vscode folder called

```
.npmrc
```

with content

```
script-shell=/bin/bash
```

### Watch

During development you can use a watcher to automatically updating your running builds on editor code changes. From a terminal, where you have cloned the repository, execute the following command:

```
cd vscode
npm run watch
```

It will do an initial full build and then watch for file changes, compiling those changes incrementally, enabling a fast, iterative coding experience.

To watch the extension and agent, from a terminal, where you have cloned the repository, use the following in separate terminals :

```
cd vscode
npm run watch
```

```
cd shared/agent
npm run watch
```

👉 **Tip!** You can use terminals built into VSCode to reduce the number of free floating windows

Or use the provided `watch` task in VS Code, execute the following from the command palette (be sure there is no `>` at the start):

```
task watch
```

👉 **Tip!** If you only want to watch for changes in the webview you can execute the following command:

```
cd vscode
npm run webview:watch
```

👉 **Tip!** Open VS Code to the folder where you have cloned the repository and press <kbd>CMD+SHIFT+B</kbd> (<kbd>CTRL+SHIFT+B</kbd> on Windows, Linux) to start the build. To view the build output open the Output stream by pressing <kbd>CMD+SHIFT+U</kbd>. This will run the `watch` task.

👉 **Tip!** You don't need to stop and restart the development version of Code after each change. You can just execute `Reload Window` from the command palette. We like to assign the keyboard shortcut <kbd>CMD+R</kbd> (<kbd>CTRL+R</kbd> on Windows, Linux) to this command.

### Code Formatting

We use [prettier](https://prettier.io/) for formatting our code. You can run prettier across the code by calling `npm run pretty` from a terminal.

To format the code as you make changes you can install the [Prettier - Code formatter](https://marketplace.visualstudio.com/items/esbenp.prettier-vscode) extension.

Add the following to your User Settings to make prettier run as you save changes to files:

`"editor.formatOnSave": true,`

#### Linting

We use [eslint](https://eslint.org/) for linting our code. In most cases, eslint will show errors and warnings directly inline in file open in VSCode.

You can also lint the entire codebase by calling `npm run lint` from a terminal.

To lint the code as you make changes you can install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension, which will enable warnings in the Problems tab of VSCode.

### Testing

To run the agent unit tests run the following from a terminal:

```
cd shared/agent
npm run test-acceptance
```

or

```
cd shared/agent
npm run test-unit
```

To run the webview unit tests run the following from a terminal:

```
cd shared/ui
npm run test
```

### Bundling

Note: In many cases, you can use a pre-built .vsix file (see below)

To generate a production bundle (without packaging) run the following from a terminal:

```
cd vscode
npm run bundle
```

To generate a VSIX (installation package) run the following from a terminal:

```
cd vscode
npm run bundle
npm run pack
```

### Debugging

#### Using VSCode

1. Open the `codestream.code-workspace` workspace file
2. Choose the `Launch CodeStream` launch configuration from the launch dropdown in the Debug dropdown and press `F5`.

#### To set breakpoints

**In the agent code**:

1. need to attach agent (see **Debugging agent startup code**, below)

​ IMPORTANT: The agent will restart on many operations, meaning you will need to manually reattach the debugger before execution reaches your breakpoint code.

**In the webview code**:

1. Choose "Launch Codestream" and start debug instance
2. In the launched Extension Host VSCode debug instance, Ctrl-shift-P to open the VSCode command palette (Because the extension executes in a browser rendering window, we must use browser tools to debug)
3. Start typing: "> Developer: Open Webview Developer Tools" and choose that option
4. Ctrl-P and use the search box to select the webview file you want to set a breakpoint in
5. Set breakpoint
6. Note that F8 is debug-run, not F5.

### Downloading Built VSIXs (common)

Here are the download links for pre-built vsix bundles:

- [TeamCity builds](http://teamcity.codestream.us/project.html?projectId=VisualStudioCode&tab=projectOverview)

### Connecting to a CodeStream backend environment (common)

You'll find a number of preconfigured workspace files in the codestream base folder.

Most likely, you can start with [pd.code-workspace](https://pd-api.codestream.us/c/XeVt1z0FRWDASwNz/oKXkL03ESYi1xHxRM8akig) for most work. The "pd" prefix stands for "Persistent Development" and is for most on-going product development. This only applies to CodeStream employees and contractors.

### Writing your own workspace files (less common)

When you need to switch between environments not covered by one of the existing workspace files, you can create workspace files for each using the example workspace files below.

#### Connects to the PD environment

Use the following settings:

```json
"codestream.serverUrl": "https://codestream-us1.service.newrelic.com",
"codestream.email": "<email>",
"codestream.team": "<team>", // Shouldn't really be needed unless there are issues and you belong to more than 1 team
```

Example workspace file &mdash; save as pd.code-workspace

```json
{
	"folders": [
		{
			"path": "<absolute or relative folder path here>"
		}
	],
	"settings": {
		"codestream.serverUrl": "https://codestream-us1.service.newrelic.com",
		"codestream.email": "<email>",
		"codestream.team": "<team>" // Shouldn't really be needed unless there are issues and you belong to more than 1 team
	}
}
```

#### Connects to the QA environment (CodeStream employees & contractors)

Use the following settings:

```json
"codestream.serverUrl": "https://qa-api.codestream.us",
"codestream.email": "<email>",
"codestream.team": "<team>", // Shouldn't really be needed unless there are issues and you belong to more than 1 team
```

Example workspace file &mdash; save as qa.code-workspace

```json
{
	"folders": [
		{
			"path": "<absolute or relative folder path here>"
		}
	],
	"settings": {
		"codestream.serverUrl": "https://qa-api.codestream.us",
		"codestream.email": "<email>",
		"codestream.team": "<team>" // Shouldn't really be needed unless there are issues and you belong to more than 1 team
	}
}
```

#### Connects to the Production environment

Use the following settings:

```json
"codestream.email": "<email>",
"codestream.team": "<team>", // Shouldn't really be needed unless there are issues and you belong to more than 1 team
```

Example workspace file &mdash; save as prod.code-workspace

```json
{
	"folders": [
		{
			"path": "<absolute or relative folder path here>"
		}
	],
	"settings": {
		"codestream.email": "<email>",
		"codestream.team": "<team>" // Shouldn't really be needed unless there are issues and you belong to more than 1 team
	}
}
```

#### Best Practices (according to Eric)

Here's what I do --

1. Install the latest approved vsix in the insiders version of vscode (which is what I use for development/debugging) and I open the `codestream.code-workspace` running in prod (As of Dec 2019, normally do not use prod)
2. Install the latest approved vsix running in qa or pd or prod (currently qa) by using `qa.code-workspace` or `pd.code-workspace` or just opening a folder (or nothing) for prod (as of Dec 2019, normally do not use prod)

Typically I develop/debug against prod (so I open a folder or something other than the workspace files), but if I want to debug against qa or pd, I'd open the corresponding workspace file in the debug host vscode window

#### Debug logs

https://docs.newrelic.com/docs/codestream/troubleshooting/client-logs/

### Learning the codebase

Helpful: https://github.com/microsoft/vscode-extension-samples

Looking at the database

1. Get MongoDB Compass: https://www.mongodb.com/products/compass
2. Point it to pd-api.codestream.us:27017
3. To see the most recent database entries: OPTIONS -> Sort, enter `{createdAt : -1}`

### New to VSCode example: debugging agent startup code (Novice)

The agent startup code is run only when the agent first starts, and there is no restart mechanism that does not kill and restart the process. We use a feature in VSCode that allows us to wait for a process to spawn, and then automatically attaches to it.

1. Start VSCode

2. Open a workspace in the VSCode folder vscode-codestream/pd-slack.code-workspace

3. Create two terminal windows in VSCode, and then 'npm run watch' for each VSCode and agent source.

   VSCode, View > Terminal, then toward the bottom right there is a :heavy_plus_sign: button to add additional terminals (you can choose the shell as well)

4. Set a breakpoint in [container.ts before the agent starts](https://github.com/teamcodestream/vscode-codestream/blob/877568f625f3e6b70bc2c4bad8706c558b918260/src/container.ts#L31-L32)

5. Choose the bug symbol on the left VSCode pane

6. On the Debug dropdown, choose "Launch Codestream"

7. Press the green triangle or F5 to start debugging instance

8. If this is the first time starting debug instance, open a folder with a git repo in the launched debug VSCode app (Otherwise will not hit the breakpoint you just set) Stop the debug instance and restart as in steps 6 and 7.

9. Debugger should stop at breakpoint in container.ts

10. Set a breakpoint in the startup agent code, such as [here](https://pd-api.codestream.us/c/W7URAFha2ilAHunF/MmiwpTChSm6lG1n_oHI2BQ)

11. On the Debug dropdown, choose "Attach to Agent"

12. Press the green triangle AND within 10 seconds:

13. Press the blue run button on the debug tool bar to the right

14. If you have no other breakpoints set, debugger should stop at the breakpoint [here](ttps://pd-api.codestream.us/c/W7URAFha2ilAHunF/MmiwpTChSm6lG1n_oHI2BQ)
