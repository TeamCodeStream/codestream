param(
[string] $ConfigurationName,
[string] $ProjectDir
)
Write-Host ""
Write-Host "CS4VS Pre-Build.ps1 Starting..."
Write-Host ""
Write-Host ""

Write-Host "ProjectDir=$($ProjectDir)"

$Joined = Join-Path "$($ProjectDir)" "..\..\licenses\$($ConfigurationName)"
Write-Host "joined" $Joined
Write-Host "resolved" (($Joined | Resolve-Path).Path)
$LicenseFile = (($Joined | Resolve-Path).Path) + "\teamdev.licenses"
Test-Path -Path "$($LicenseFile)"

if (Test-Path -Path "$($LicenseFile)") {
	Write-Host "LicenseFile=$($LicenseFile) (exists)"
}
else {
	Write-Host "LicenseFile=$($LicenseFile) (does not exist!!!)"
}

$LocalLicenseFile = "$($ProjectDir)teamdev.licenses"
Write-Host "LocalLicenseFile=$($LocalLicenseFile)"
Write-Host ""
Write-Host ""

Write-Host "Possibly deleting old local license file '$($LocalLicenseFile)'..."
if (Test-Path -Path "$($LocalLicenseFile)") {
	Remove-Item "$($LocalLicenseFile)" -Force
	Write-Host "Deleted old local license completed."
}
else {
	Write-Host "NOT deleting old local license (doesn't exist) '$($LocalLicenseFile)'..."
}
Write-Host ""

Write-Host "Copying license to local license..."
if (!(Test-Path -Path "$($LicenseFile)")) {
 	Write-Host "Actual LicenseFile not found LicenseFile=$($LicenseFile)"
 	exit 1
}
Copy-Item "$($LicenseFile)" -Destination "$($ProjectDir)"
Write-Host "Copying licenses completed."
Write-Host ""


Write-Host ""
Write-Host ""
Write-Host "VS Pre-Build.ps1 Completed"
Write-Host ""
Write-Host ""
