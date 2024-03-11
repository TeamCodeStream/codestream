Set-StrictMode -Version Latest

New-Module -ScriptBlock {
    function Get-VsixManifestPath()
	{
        Join-Path $rootDirectory "src/CodeStream.VisualStudio.Vsix.x64/source.extension.vsixmanifest"
    }

    function Get-VsixManifestXml() {
        $xmlLines = Get-Content (Get-VsixManifestPath)
        # If we don't explicitly join the lines with CRLF, comments in the XML will
        # end up with LF line-endings, which will make Git spew a warning when we
        # try to commit the version bump.
        $xmlText = $xmlLines -join [System.Environment]::NewLine

        [xml] $xmlText
    }

    function Read-CurrentVersionVsix() {
        [System.Version] (Get-VsixManifestXml).PackageManifest.Metadata.Identity.Version
    }

    function Write-VersionVsixManifest([System.Version]$version) {

        $document = Get-VsixManifestXml

        $numberOfReplacements = 0
        $document.PackageManifest.Metadata.Identity.Version = "$($version.Major).$($version.Minor).$(($version.Build, 0 -ne $null)[0]).$(($version.Revision, 0 -ne $null)[0])"

        $document.Save((Get-VsixManifestPath))
    }

    Export-ModuleMember -Function Read-CurrentVersionVsix,Write-VersionVsixManifest
}