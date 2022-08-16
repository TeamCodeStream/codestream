Set-StrictMode -Version Latest

New-Module -ScriptBlock {
    function Get-VsixManifestPath(
		[ValidateSet("x86", "x64")]
		[string]
		$architecture) 
	{
        Join-Path $rootDirectory "src/CodeStream.VisualStudio.Vsix.$architecture/source.extension.vsixmanifest"
    }

    function Get-VsixManifestXml([string]$architecture) {
        $xmlLines = Get-Content (Get-VsixManifestPath $architecture)
        # If we don't explicitly join the lines with CRLF, comments in the XML will
        # end up with LF line-endings, which will make Git spew a warning when we
        # try to commit the version bump.
        $xmlText = $xmlLines -join [System.Environment]::NewLine

        [xml] $xmlText
    }

    function Read-CurrentVersionVsix([string]$architecture) {
        [System.Version] (Get-VsixManifestXml $architecture).PackageManifest.Metadata.Identity.Version
    }

    function Write-VersionVsixManifest([System.Version]$version, [string]$architecture) {

        $document = Get-VsixManifestXml $architecture

        $numberOfReplacements = 0
        $document.PackageManifest.Metadata.Identity.Version = "$($version.Major).$($version.Minor).$(($version.Build, 0 -ne $null)[0]).$(($version.Revision, 0 -ne $null)[0])"

        $document.Save((Get-VsixManifestPath $architecture))
    }

    Export-ModuleMember -Function Read-CurrentVersionVsix,Write-VersionVsixManifest
}