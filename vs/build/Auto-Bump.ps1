[CmdletBinding(SupportsShouldProcess)]
param([string] $checkoutDir = $pwd, [string] $assetEnv = "")

# this creates a temporary directory
$tempDir = (New-TemporaryFile | ForEach-Object{ Remove-Item $_; mkdir $_ }).ToString()
Write-Host "Created $($tempDir)"
$branch = "develop"
pushd $tempDir
iex "git clone --depth 1 git@github.com:teamcodestream/codestream -b $($branch)"
    pushd codestream
        pushd vs\build
            .\Bump-Version.ps1 -BumpPatch
            $newVersion = (.\Get-Version.ps1).ToString()        
        popd
    $message = "Auto bump version on $($branch) to $($newVersion) for next release"
    $gitCommand = "git commit -am `"$message`""
    if ($WhatIfPreference.IsPresent -eq $True) {
        Write-Host "would have run 'git commit -am $message' and 'git push'"
    }
    else {
        iex $gitCommand
        iex "git push"
        if ($LastExitCode -ne $null -and $LastExitCode -ne 0) {
            exit 1
        }
        Write-Host "git push complete"
    }
    Write-Host $message
    popd
popd
Write-Host "Removing $($tempDir)..."
Remove-Item $tempDir -Recurse -Force
Write-Host "Removed $($tempDir)"