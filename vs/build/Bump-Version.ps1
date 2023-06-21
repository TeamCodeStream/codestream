<#
.SYNOPSIS
    Bumps the version number of CodeStream for Visual Studio
.DESCRIPTION
    By default, just bumps the last component of the version number by one. An
    alternate version number can be specified on the command line.

    The new version number is committed to the local repository and pushed to
    GitHub.
#>
[CmdletBinding(PositionalBinding=$false)]
Param(
    # It would be nice to use our Validate-Version function here, but we
    # can't because this Param definition has to come before any other code in the
    # file.
    [Parameter(Mandatory=$false)]
    [ValidateScript({ ($_.Major -ge 0) -and ($_.Minor -ge 0) -and ($_.Build -ge 0) })]
    [System.Version]
    $NewVersion = $null,

    [Parameter(Mandatory=$false)]
    [switch]
    $BumpMajor = $false,

    [Parameter(Mandatory=$false)]
    [switch]
    $BumpMinor = $false,

    [Parameter(Mandatory=$false)]
    [switch]
    $BumpPatch = $false,

    [Parameter(Mandatory=$false)]
    [switch]
    $BumpBuild = $false,

    [Parameter(Mandatory=$false)]
    [int]
    $BuildNumber = -1,

    [Parameter(Mandatory=$false)]
    [switch]
    $Commit = $false,

    [Parameter(Mandatory=$false)]
    [switch]
    $Push = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]
    $Force = $false,

    [Parameter(Mandatory=$false)]
    [switch]
    $Trace = $false,

    [Parameter(Mandatory=$false)]
    [string]
    $Environment
)

<#
NOTE: the format of the [System.Version] object is as follows:
major.minor[.build[.revision]]
#>

Set-StrictMode -Version Latest
if ($Trace) { Set-PSDebug -Trace 1 }

. $PSScriptRoot\modules.ps1 | out-null
. $scriptsDirectory\Modules\Versioning.ps1 | out-null
. $scriptsDirectory\Modules\Vsix.ps1 | out-null
. $scriptsDirectory\Modules\AssemblyInfo.ps1 | out-null
. $scriptsDirectory\Modules\SolutionInfo.ps1 | out-null

if ($NewVersion -eq $null) {
    if (!$BumpMajor -and !$BumpMinor -and !$BumpPatch -and !$BumpBuild){
       Die -1 "You need to indicate which part of the version to update via -BumpMajor/-BumpMinor/-BumpPatch flags or a custom version via -NewVersion"
    }
}

if ($Push -and !$Commit) {
    Die 1 "Cannot push a version bump without -Commit"
}

if ($Commit -and !$Force){
    .\Require-CleanWorkTree "bump version"
}

if (!$?) {
    exit 1
}

if ($NewVersion -eq $null) {
    $currentVersion = Read-Version "x64"
    $NewVersion = Generate-Version $currentVersion $BumpMajor $BumpMinor $BumpPatch $BumpBuild $BuildNumber       
}

Write-Output "Setting Version=$NewVersion, Environment=$($Environment)"
Write-Version $NewVersion $Environment

if ($commit) {
    write-output "committing version change"
    commit-version $newversion
}
