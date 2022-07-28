[CmdletBinding(PositionalBinding = $false)]
Param(
	[Parameter(Mandatory = $false)]
	[switch] $CI = $false,

	[Parameter(Mandatory = $false)]
	[Alias("q")]
	[switch] $Quick = $false,

	[Parameter(Mandatory = $false)]
	[ValidateSet("Debug", "Release")]
	[Alias("m")]
	[System.String] $Mode = "Debug",

	[Parameter(Mandatory = $false)]
	[ValidateSet("quiet", "minimal", "normal", "detailed", "diagnostic")]
	[Alias("v")]
	[System.String] $Verbosity = "quiet",

	[Parameter(Mandatory = $false)]
	[ValidateSet(17.0)]
	[Alias("t")]
	[double] $VSVersion = 17.0,

	# TODO: Get this to work -- i.e. auto install into a vs experiemental instance
	# [Parameter(Mandatory = $false)]
	# [Alias("d")]
	# [switch] $ExperimentalDeploy = $false,

	[Parameter(Mandatory = $false)]
	[Alias("h")]
	[Switch] $Help = $false
)

function Try-Create-Directory([string[]] $path) {
	if (!(Test-Path -Path $path)) {
		New-Item -Force -ItemType Directory -Path $path | Out-Null
		Write-Log "Creating directory $($path)"
	}
}

function Start-Timer {
	return [System.Diagnostics.Stopwatch]::StartNew()
}

function Get-ElapsedTime([System.Diagnostics.Stopwatch] $timer) {
	$timer.Stop()
	return $timer.Elapsed
}

function Write-Log ([string] $message, $messageColor = "DarkGreen") {
	if ($message) {
		Write-Host $message -BackgroundColor $messageColor
	}
}

function Print-Help {
	if (-not $Help) {
		return
	}

	Write-Host -object ""
	Write-Host -object "********* CodeStream Build Script *********"
	Write-Host -object ""
	Write-Host -object "  Help (-h)                    - [Switch] - Prints this help message."
	Write-Host -object ""
	Write-Host -object "  CI (-ci)                     - [Switch] - For CI only."
	Write-Host -object "  Quick (-q                    - [Switch] - Quick build (avoids agent & webview builds)."
	Write-Host -object "  Mode (-m)                    - [String] - Debug or Release."
	Write-Host -object "  Verbosity (-v)               - [String] - Logging verbosity (quiet, minimal, normal, detailed, or diagnostic)."
	Write-Host -object ""
	Write-Host -object "  VSVersion (-t)               - [String] - Currently only 15.0."
	Write-Host -object ""
	exit 0
}

function Build-AgentAndWebview {
	$timer = Start-Timer

	Write-Log "Bundling agent & webview..."

	& npm run bundle
	if ($LastExitCode -ne 0) {
		throw "Bundling webview failed"
	}
	Write-Log "Bundling webview completed"

	Write-Log "Packaging agent..."

	& npm run agent:pkg
	if ($LastExitCode -ne 0) {
		throw "Agent packaging failed"
	}

	if ((Test-Path -Path "../shared/agent/dist/agent-vs-2019.exe") -eq $False) {
		throw "Creating packaged artifacts failed, ensure the agent has been built"
	}

	Copy-Item -Path ..\shared\agent\dist\agent-vs-2019.exe -Destination src\CodeStream.VisualStudio.Vsix.x86\agent\agent.exe -Force
	Copy-Item -Path ..\shared\agent\dist\agent-vs-2022.exe -Destination src\CodeStream.VisualStudio.Vsix.x64\agent\agent.exe -Force

	if ($LastExitCode -ne 0) {
		throw "Copying packaged artifacts failed"
	}

	Write-Log "Packaging agent completed"

	Write-Log "Build-AgentAndWebview completed in {$(Get-ElapsedTime($timer))}"
}

function Build-Extension {
	$timer = Start-Timer

	# validation only allows 17.0 and is defaulted to 17.0, so it can't be anything else anyway
	$msbuild = "C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/MSBuild/Current/Bin/MSBuild.exe"		
	$vstest = "C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/Common7/IDE/CommonExtensions/Microsoft/TestWindow/vstest.console.exe"

	$baseOutputDir = $(Join-Path $root "build/artifacts")
    if ((Test-Path -Path $baseOutputDir) -eq $True) {
	    Write-Log "Cleaning $($baseOutputDir)..."
	    Remove-Item $("$($baseOutputDir)/*") -Recurse -Force
    }

	$x86OutputDir = $(Join-Path $baseOutputDir "$($Mode)/x86")
	$x64OutputDir = $(Join-Path $baseOutputDir "$($Mode)/x64")
	Try-Create-Directory($x86OutputDir)
	Try-Create-Directory($x64OutputDir)

	Write-Log "Running MSBuild (x86)..."
	& $msbuild './src/CodeStream.VisualStudio.Vsix.x86/CodeStream.VisualStudio.Vsix.x86.csproj' /t:restore,$target /p:Configuration=$Mode /p:AllowUnsafeBlocks=true /verbosity:$Verbosity /p:Platform='x86' /p:OutputPath=$x86OutputDir /p:DeployExtension=$DeployExtension

	Write-Log "Running MSBuild (x64)..."
	& $msbuild './src/CodeStream.VisualStudio.Vsix.x64/CodeStream.VisualStudio.Vsix.x64.csproj' /t:restore,$target /p:Configuration=$Mode /p:AllowUnsafeBlocks=true /verbosity:$Verbosity /p:Platform='x64' /p:OutputPath=$x64OutputDir /p:DeployExtension=$DeployExtension

	if ($LastExitCode -ne 0) {
		throw "MSBuild failed"
	}

	# TODO - how should tests be run when targeting two different VS versions?
	#if (!$Quick) {
	#	Write-Log "Running UnitTests..."
	#	if (!(Test-Path -Path $vstest)) {
	#		throw "UnitTest executable not found $($vstest)"
	#	}
	#	& $vstest "$($OutputDir)/CodeStream.VisualStudio.UnitTests.dll" /Platform:$platform
	#
	#	if ($LastExitCode -ne 0) {
	#		throw "UnitTests failed"
	#	}
	#
	#	Write-Log "UnitTests completed"
	#}
	#else {
	#	Write-Log "UnitTests skipped"
	#}

	Write-Log "Build-Extension completed in {$(Get-ElapsedTime($timer))}"
	Write-Log "x86 Artifacts: $($x86OutputDir) at $(Get-Date)"    
	Write-Log "x64 Artifacts: $($x64OutputDir) at $(Get-Date)"    
}

Print-Help

$target = "Rebuild"

if ($CI) {
	$Quick = $false
	$Mode = "Release"
	$Verbosity = "diagnostic"
	# $ExperimentalDeploy = $false

	Write-Log "Running in CI mode..."
}

$root = $(Resolve-Path -path "$PSScriptRoot/..")
Push-Location $root

try {
	if (!$Quick) {
		Build-AgentAndWebview
	}
	else {
		Write-Log "Build-AgentAndWebview skipped"
	}
	Build-Extension
}
finally {
	Pop-Location
}
