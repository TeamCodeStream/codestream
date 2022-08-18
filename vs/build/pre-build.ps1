param([string] $checkoutDir = $pwd, [string] $assetEnv = "")

$computer = 'teamcity.codestream.us'
$username = 'web'
$homeDir = 'C:\Users\Administrator'
$keyfile = $homeDir + '\.ssh\id_rsa'
$localReleaseLicenseFile = $checkoutDir + '\vs\licenses\Release\teamdev.licenses'
$localDebugLicenseFile = $checkoutDir + '\vs\licenses\Debug\teamdev.licenses'
$remoteLicenseFile = '/home/web/.codestream/licenses/teamdev/DotNetBrowser/runtime/teamdev.licenses'
$localVSCETokenFile = $homeDir + '\.vsce'
$remoteVSCETokenFile = '/home/web/.codestream/microsoft/vsce-credentials'

Write-Host 'Checkout Dir  : ' $checkoutDir
Write-Host 'PSScriptRoot  : ' $PSScriptRoot
Write-Host 'Build Number  : ' $env:BUILD_NUMBER
Write-Host 'Build Counter : ' $env:TCBUILD_COUNTER
Write-Host 'Asset-Env     : ' $assetEnv
Write-Host 'localicenseFile: ' $localReleaseLicenseFile
Write-Host 'remoteLicenseFile: ' $remoteLicenseFile

$cred = new-object -typename System.Management.Automation.PSCredential $username, (new-object System.Security.SecureString)

# Get the teamdev license
Get-SCPFile -ComputerName $computer -LocalFile $localReleaseLicenseFile -RemoteFile $remoteLicenseFile -KeyFile $keyfile -Credential $cred -AcceptKey
Get-SCPFile -ComputerName $computer -LocalFile $localDebugLicenseFile -RemoteFile $remoteLicenseFile -KeyFile $keyfile -Credential $cred -AcceptKey

# Get the VSCE Marketplace Token File
Get-SCPFile -ComputerName $computer -LocalFile $localVSCETokenFile -RemoteFile $remoteVSCETokenFile -KeyFile $keyfile -Credential $cred -AcceptKey

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

. $PSScriptRoot\Bump-Version.ps1 -BumpBuild -BuildNumber $env:BUILD_NUMBER -Environment $assetEnv
