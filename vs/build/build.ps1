[CmdletBinding(PositionalBinding = $false)]
Param(
	[Parameter(Mandatory = $false)]
	[switch] $CI = $false,

	[Parameter(Mandatory = $false)]
	[ValidateSet("Debug", "Release")]
	[Alias("m")]
	[System.String] $Mode = "Debug",

	[Parameter(Mandatory = $false)]
	[ValidateSet("quiet", "minimal", "normal", "detailed", "diagnostic")]
	[Alias("v")]
	[System.String] $Verbosity = "quiet",

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
	Write-Host -object "  Mode (-m)                    - [String] - Debug or Release."
	Write-Host -object "  Verbosity (-v)               - [String] - Logging verbosity (quiet, minimal, normal, detailed, or diagnostic)."
	Write-Host -object ""

	exit 0
}

function Build-AgentAndWebview {
	$timer = Start-Timer

	Write-Log "Bundling agent & webview..."

	& npm run bundle
	if ($LastExitCode -ne 0) {
		throw "Bundling agent & webview failed"
	}
	Write-Log "Bundling agent & webview completed"

	Write-Log "Build-AgentAndWebview completed in {$(Get-ElapsedTime($timer))}"
}

function Build-Extension {
	$timer = Start-Timer

	# validation only allows 17.0 and is defaulted to 17.0, so it can't be anything else anyway
	$msbuild = "C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/MSBuild/Current/Bin/MSBuild.exe"
    $xunit = "C:/.nuget/xunit.runner.console/2.4.2/tools/net472/xunit.console.x86.exe"	

	if ($CI) {
		Write-Host "Running UnitTests..."

		& $msbuild './src/CodeStream.VisualStudio.sln' /t:restore,$target /p:Configuration=Debug /p:AllowUnsafeBlocks=true /verbosity:$Verbosity /p:Platform='x86' /p:DeployExtension=False

		if((Test-Path -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out") -eq $True) {
			Remove-Item -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out" -Force -Recurse
		}

		if((Test-Path -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip") -eq $True) {
			Remove-Item -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip" -Force
		}

		Copy-Item -Path "./src/CodeStream.VisualStudio.Vsix.x86/bin/x86/Debug/codestream-vs.vsix" -Destination "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip"
		Expand-Archive -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip" -DestinationPath "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out/"
		Copy-Item -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out/CodeStream.VisualStudio.*.pdb" -Destination "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/"
		
		Remove-Item -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out/" -Force -Recurse
		Remove-Item -Path "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip" -Force
		
		Push-Location "./src"
		& dotnet tool restore --ignore-failed-sources
		Pop-Location

		Push-Location "./src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/"
		& dotnet coverlet "CodeStream.VisualStudio.UnitTests.dll" --target "$xunit" --targetargs "CodeStream.VisualStudio.UnitTests.dll" --exclude-by-file "**/Annotations/Annotations.cs" --format cobertura 
		& dotnet reportgenerator "-reports:coverage.cobertura.xml" "-targetdir:coveragereport" "-reporttypes:Html;TeamCitySummary"
		Compress-Archive -Path coveragereport\* -DestinationPath CoverageReport.zip
		Pop-Location

		if ($LastExitCode -ne 0) {
			throw "UnitTests failed"
		}

		Write-Host "UnitTests completed"
	}

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
	& $msbuild './src/CodeStream.VisualStudio.Vsix.x86/CodeStream.VisualStudio.Vsix.x86.csproj' /t:restore,$target /p:Configuration=$Mode /p:AllowUnsafeBlocks=true /verbosity:$Verbosity /p:Platform='x86' /p:OutputPath=$x86OutputDir /p:DeployExtension=False
	Write-Log "Running MSBuild (x64)..."
	& $msbuild './src/CodeStream.VisualStudio.Vsix.x64/CodeStream.VisualStudio.Vsix.x64.csproj' /t:restore,$target /p:Configuration=$Mode /p:AllowUnsafeBlocks=true /verbosity:$Verbosity /p:Platform='x64' /p:OutputPath=$x64OutputDir /p:DeployExtension=False

	if ($LastExitCode -ne 0) {
		throw "MSBuild failed"
	}

	Write-Log "Build-Extension completed in {$(Get-ElapsedTime($timer))}"
	Write-Log "x86 Artifacts: $($x86OutputDir) at $(Get-Date)"    
	Write-Log "x64 Artifacts: $($x64OutputDir) at $(Get-Date)"    
}

try {
	Print-Help

	$target = "Rebuild"
	$root = $(Resolve-Path -path "$PSScriptRoot/..")
	Push-Location $root

	if ($CI) {
		$Mode = "Release"
		$Verbosity = "normal"
	
		Write-Log "Running in CI mode..."

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
