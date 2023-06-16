[CmdletBinding(SupportsShouldProcess)]
param([string] $checkoutDir = $pwd, [string] $assetEnv = "", [string] $buildNumber = $env:build_number)

Write-Host '**** The script is running in directory' (Get-Location)

$computer = 'teamcity.cdstrm.dev'
$username = 'web'
$keyfile = 'C:\Users\Administrator\.ssh\id_rsa'
$localVSCETokenFile = "$env:TEMP\codestream.vsce"
$remoteVSCETokenFile = '/home/web/.codestream/microsoft/vsce-credentials'

Write-Host ""
Write-Host "---- Script Values ----"
Write-Host 'PSScriptRoot  : ' $PSScriptRoot
Write-Host 'localVSCETokenFile: ' $localVSCETokenFile
Write-Host "-----------------------"
Write-Host ""

$cred = new-object -typename System.Management.Automation.PSCredential $username, (new-object System.Security.SecureString)
Get-SCPFile -ComputerName $computer -LocalFile $localVSCETokenFile -RemoteFile $remoteVSCETokenFile -KeyFile $keyfile -Credential $cred -AcceptKey

$exception = $False
$vsDir = $checkoutDir + '\vs'
$buildDir = $vsDir + '\build'
$x86AssetDir = $buildDir + '\artifacts\Release\x86'
$x64AssetDir = $buildDir + '\artifacts\Release\x64'

$x86Asset = $x86AssetDir + '\codestream-vs-' + $buildNumber + '-x86.vsix'
$x64Asset = $x64AssetDir + '\codestream-vs-' + $buildNumber + '-x64.vsix'

Write-Host 'Here is the x86 VSIX file (' $x86Asset '):'
Get-ChildItem $x86Asset
if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
    deleteTokenFile($localVSCETokenFile)
    exit 1
}

Write-Host 'Here is the x64 VSIX file (' $x64Asset '):'
Get-ChildItem $x64Asset
if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
    deleteTokenFile($localVSCETokenFile)
    exit 1
}

$pat = (Get-Content -Raw -Path $localVSCETokenFile | ConvertFrom-Json).publishers.Where({$_.Name -eq "CodeStream"}).pat
if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
    deleteTokenFile($localVSCETokenFile)
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
    try{
        & $exe publish -payload $x86Asset -publishManifest "$($vsDir)\src\CodeStream.VisualStudio.Vsix.x86\publish\publishManifest.json" -personalAccessToken $pat
        if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
            throw "Failed to publish $($x86Asset) to marketplace"
        }
    
        & $exe publish -payload $x64Asset -publishManifest "$($vsDir)\src\CodeStream.VisualStudio.Vsix.x64\publish\publishManifest.json" -personalAccessToken $pat
        if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
            throw "Failed to publish $($x64Asset) to marketplace"
        }
    }
    catch{
        Write-Error "$_"
        $exception = $True
    }
    finally{
        # Clean up the token file so it doesn't hang around longer than necessary
        deleteTokenFile($localVSCETokenFile)
    }

    if($exception -eq $True){
        exit 1
    }
}

function deleteTokenFile($tokenPath){
    if(Test-Path $tokenPath){
        Remove-Item $tokenPath
    }
}
