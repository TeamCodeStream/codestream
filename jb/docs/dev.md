# CodeStream for Jetbrains

## Getting the code

```shell
git clone https://github.com/TeamCodeStream/codestream.git
```

### Prerequisites

- [Git](https://git-scm.com/), >=2.32.0
- [NodeJS](https://nodejs.org/en/), =18.15.0
- [npm](https://npmjs.com/), >=8.13.1

### Before You Begin

The CodeStream clients all live in a single git mono-repo. Each IDE has their own tools for generating builds and Jetbrains is no different!

## Build & Run

### JVM Setup

On macos, due to a strange bug in [byte-buddy or JBR jvm](https://github.com/raphw/byte-buddy/issues/732), you need
to copy the JBR jvm to a directory without spaces. If you do not, you will not be able to run tests.
(symbolic link does no twork) For example:

```shell
cd ~
mkdir jbr
cp -r  /Applications/IntelliJ\ IDEA.app/Contents/jbr/Contents/Home/* jbr/
export JAVA_HOME="$HOME/jbr"
export PATH="$JAVA_HOME/bin:$PATH"
```

> 👉 **NOTE!**
>
> If you utilize JetBrains Toolbox for managing the installation of their IDEs / utilities, then your installation path will be available by clicking 'Settings' next to the application in JetBrains Toolbox. By default, it will look similar to:
>
> `/Users/<your home dir>/Library/Application Support/JetBrains/Toolbox/apps/IDEA-U/ch-0/231.8109.175`

The Jetbrains JVM is required to run tests and build the plugin. The project is preconfigured to use a
JVM Runtime called jbr-17. You need to setup this JMV yourself by going to 
`File -> Project Structure` and then click on `SDK` and in the dropdown choose `Add Sdk`. 
Choose `Add JDK` and browse to `/Users/<your home dir>/jbr`
(or where ever you have copied IntelliJ java runtime) and click OK. It should have defaulted to the name `jbr-17` or `jbr-17 (2)`.

After that:

- run gradle task `buildDependencies` once (it will `run npm install`, etc for dependencies)
- run gradle task `buildDebugDependencies`
- ensure the `jb [runIde]` configuration is selected and run in debug mode (click the :bug: icon to start)

> if you want a quick way to test changes in the agent/webview, then run the npm agent:watch and watch tasks and uncomment and edit those 2 lines in build.gradle

### webview

to debug the webview:

with JCEF you can right-click the webview and select open dev tools

with JxBrowser, you can attach a chrome inspector to port 9222

in both cases, runIde must be ran in debug mode

## Build

You can build some of the shared dependencies from a terminal. From where you have cloned the repository, execute the following command to build the agent and CodeStream for Jetbrains extension from scratch:

```shell
cd jb
npm run rebuild
```

> 👉 **NOTE!**
>
> This will run a complete rebuild of the extension, webview, and agent.

To just run a quick build of the extension, use:

```shell
cd jb
npm run build
```

To just run a quick build of the agent, use:

```shell
cd shared/agent
npm run build
```

### In Short

`npm install --no-save`... needs to be run for shared/ui, shared/agent, jb

`npm run build`... needs to be run for shared/agent _then_ jb

## Testing

To run the agent unit tests run the following from a terminal:

```shell
cd shared/agent
npm run test-acceptance
```

or

```shell
cd shared/agent
npm run test-unit
```

To run the webview unit tests run the following from a terminal:

```shell
cd shared/ui
npm run test
```

## Possible Issues

### Ubuntu 18.04: 'pushd not found'

If you get a 'pushd not found' error on npm run rebuild, it's because Ubuntu uses sh for the default shell. Tell npm to use bash instead:

Create a file in the vscode folder called

```shell
.npmrc
```

with content

```shell
script-shell=/bin/bash
```
