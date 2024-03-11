[CmdletBinding(SupportsShouldProcess)]
param([string] $checkoutDir = $pwd, [string] $assetEnv = "", [string] $buildNumber = $env:build_number)

Write-Host '**** The script is running in directory' (Get-Location)
$vsDir = $checkoutDir + '\vs'
$buildDir = $vsDir + '\build'

$assetDir = $buildDir + '\artifacts\Release\x64'
F$assetInfo = $assetDir + '\codestream-vs-' + $buildNumber + '.info'

Write-Host 'Here is the VSIX asset file (' $assetInfo '):'
Get-ChildItem $assetInfo

$commitId = (Get-Content -Raw -Path $assetInfo | ConvertFrom-Json).repoCommitId.codestream_vs

# uses .net version parsing!
$v = [System.Version]::Parse((Get-Content -Raw -Path $assetInfo | ConvertFrom-Json).version)
$version = "$($v.Major).$($v.Minor).$($v.Build)"

$gitCommand = "git tag vs-$version"
$gitPushCommand = "git push origin vs-$version"
 
if ($WhatIfPreference.IsPresent -eq $True) {
    Write-Host "would have run: $gitCommand"
    Write-Host "would have run: 'git push'"
}
else {
    iex "git fetch"
    iex "git rebase" # try to eliminate race conditions when all builds are running simultaneously
    iex $gitCommand
    if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
		Write-Error "Did you remember to cherry-pick the Auto Bump commit?"
		exit 1
	}

    Write-Host "git tag complete"

    iex $gitPushCommand
    if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
		Write-Error "Did you remember to cherry-pick the Auto Bump commit?"
		exit 1
	}
    Write-Host "git push complete"
}
