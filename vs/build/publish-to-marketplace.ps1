[CmdletBinding(SupportsShouldProcess)]
param([string] $checkoutDir = $pwd, [string] $assetEnv = "", [string] $buildNumber = $env:build_number)

$homeDir = 'C:\Users\Administrator'
$localVSCETokenFile = $homeDir + '\.vsce'

Write-Host '**** The script is running in directory' (Get-Location)
$vsDir = $checkoutDir + '\vs'
$buildDir = $vsDir + '\build'
$x86AssetDir = $buildDir + '\artifacts\Release\x86'
$x64AssetDir = $buildDir + '\artifacts\Release\x64'

$x86Asset = $x86AssetDir + '\codestream-vs-' + $buildNumber + '-x86.vsix'
$x64Asset = $x64AssetDir + '\codestream-vs-' + $buildNumber + '-x64.vsix'

Write-Host 'Here is the x86 VSIX file (' $x86Asset '):'
Get-ChildItem $x86Asset
if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
    exit 1
}

Write-Host 'Here is the x64 VSIX file (' $x64Asset '):'
Get-ChildItem $x64Asset
if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
    exit 1
}

$pat = (Get-Content -Raw -Path $localVSCETokenFile | ConvertFrom-Json).publishers.Where({$_.Name -eq "CodeStream"}).pat
if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
    exit 1
}
Write-Host "Got PAT Length=$($pat.Length)"

$path = (& "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe" -products 'Microsoft.VisualStudio.Product.BuildTools' -latest -property installationPath)
Write-Host $path
$exe = (-join($path, "\VSSDK\VisualStudioIntegration\Tools\Bin\VsixPublisher.exe"))
Write-Host "VsixPublish path... $($exe)"

if ($WhatIfPreference.IsPresent -eq $True) {
    Write-Host "Would have published $($x86Asset)"
    Write-Host "Would have published $($x64Asset)"
}
else {
    Write-Host 'Publishing assets to marketplace...'
    # https://docs.microsoft.com/en-us/visualstudio/extensibility/walkthrough-publishing-a-visual-studio-extension-via-command-line?view=vs-2019
    #  -ignoreWarnings "VSIXValidatorWarning01,VSIXValidatorWarning02"
    & $exe publish -payload $x86Asset -publishManifest "$($vsDir)\src\CodeStream.VisualStudio.Vsix.x86\publish\publishManifest.json" -personalAccessToken $pat
    if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
        Write-Error "Failed to publish $($x86Asset) to marketplace"
		exit 1
	}

    & $exe publish -payload $x64Asset -publishManifest "$($vsDir)\src\CodeStream.VisualStudio.Vsix.x64\publish\publishManifest.json" -personalAccessToken $pat
    if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
        Write-Error "Failed to publish $($x64Asset) to marketplace"
		exit 1
	}
}
