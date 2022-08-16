Set-StrictMode -Version Latest

. $PSScriptRoot\modules.ps1 | out-null
. $scriptsDirectory\Modules\Versioning.ps1 | out-null
. $scriptsDirectory\Modules\Vsix.ps1 | out-null
. $scriptsDirectory\Modules\AssemblyInfo.ps1 | out-null
. $scriptsDirectory\Modules\SolutionInfo.ps1 | out-null
 
Read-Version "x86"