param(
[string] $ConfigurationName,
[string] $TargetDir
)
Write-Host ""
Write-Host "CS4VS Post-Build.ps1 Starting..."
Write-Host ""
Write-Host ""

Write-Host "ProjectDir=$($ProjectDir)"
Write-Host "TargetDir=$($TargetDir)"
Write-Host ""

if ($ConfigurationName -eq "Debug") {
	pushd ..\..\..\..\..\build
	& .\Extract-Pdb.ps1
	popd
}

Write-Host ""
Write-Host ""
Write-Host "VS Post-Build.ps1 Completed"
Write-Host ""
Write-Host ""
