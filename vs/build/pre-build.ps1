param([string] $checkoutDir = $pwd, [string] $assetEnv = "")

$computer = 'teamcity.cdstrm.dev'
$username = 'web'
$keyfile = 'C:\Users\Administrator\.ssh\id_rsa'
$localReleaseLicenseFile = $checkoutDir + '\vs\licenses\Release\teamdev.licenses'
$localDebugLicenseFile = $checkoutDir + '\vs\licenses\Debug\teamdev.licenses'
$remoteLicenseFile = '/home/web/.codestream/licenses/teamdev.DotNetBrowser.licenses.txt'

Write-Host ""
Write-Host "---- Script Values ----"
Write-Host 'Checkout Dir  : ' $checkoutDir
Write-Host 'PSScriptRoot  : ' $PSScriptRoot
Write-Host 'Build Number  : ' $env:BUILD_NUMBER
Write-Host 'Build Counter : ' $env:TCBUILD_COUNTER
Write-Host 'Asset-Env     : ' $assetEnv
Write-Host 'localicenseFile: ' $localReleaseLicenseFile
Write-Host 'remoteLicenseFile: ' $remoteLicenseFile
Write-Host "-----------------------"
Write-Host ""

$cred = new-object -typename System.Management.Automation.PSCredential $username, (new-object System.Security.SecureString)

# Get the teamdev license
Get-SCPFile -ComputerName $computer -LocalFile $localReleaseLicenseFile -RemoteFile $remoteLicenseFile -KeyFile $keyfile -Credential $cred -AcceptKey
Get-SCPFile -ComputerName $computer -LocalFile $localDebugLicenseFile -RemoteFile $remoteLicenseFile -KeyFile $keyfile -Credential $cred -AcceptKey

if (!(Test-Path -Path $localReleaseLicenseFile)) {
    Write-Host "localReleaseLicenseFile not found ($localReleaseLicenseFile)"
    exit 1
}
else {
    Write-Host "localReleaseLicenseFile exists ($localReleaseLicenseFile)"
}

Write-Host '************ npm install -g lightercollective'
& npm install -g lightercollective

Write-Host 'DISABLE_OPENCOLLECTIVE is set to' $env:DISABLE_OPENCOLLECTIVE

Copy-Item "${$env:TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH}\node\node-v18.15.0-win-x64" -Destination "..\vs\src\CodeStream.VisualStudio.Vsix.x64\agent\node.exe"
Copy-Item "${$env:TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH}\node\node-v18.15.0-win-x86" -Destination "..\vs\src\CodeStream.VisualStudio.Vsix.x86\agent\node.exe"

. $PSScriptRoot\Bump-Version.ps1 -BumpBuild -BuildNumber $env:BUILD_NUMBER -Environment $assetEnv
