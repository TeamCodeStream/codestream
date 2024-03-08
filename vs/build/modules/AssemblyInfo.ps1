Set-StrictMode -Version Latest

New-Module -ScriptBlock {

    $assemblyInfoFile = Join-Path $rootDirectory src\resources\AssemblyInfo.cs

    function Read-VersionAssemblyInfo() {
        $currentVersion = Get-Content $assemblyInfoFile | %{
        $regex = '\[assembly: AssemblyVersion\("(\d+\.\d+\.\d+.\d+)"\)]'
            if ($_ -match $regex) {
                $matches[1]
            }
        }
        [System.Version] $currentVersion
    }

    function Write-AssemblyInfo([System.Version]$version) {
        $numberOfReplacements = 0
        $newContent = Get-Content $assemblyInfoFile | %{
            $newString = $_
            #$regex = "(string Version = `")\d+\.\d+\.\d+\.\d+"
            $regex = "\(`"(\d+\.\d+\.\d+.\d+)`"\)"
            if ($_ -match $regex) {
                $numberOfReplacements++
                $newString = $newString -replace $regex,  "(`"$($version.Major).$($version.Minor).$(($version.Build, 0 -ne $null)[0]).$(($version.Revision, 0 -ne $null)[0])`")"
            }
            $newString
        }

        if ($numberOfReplacements -ne 2) {
            Die 1 "Expected to replace the version number in 1 place in AssemblyInfo.cs (Version) but actually replaced it in $numberOfReplacements"
        }
    #     Write-Host $version
    #     # ($version.Patch, 0 -ne $null)[0]
    #     Write-Host "$($version.Major).$($version.Minor).$(($version.Patch, 0 -ne $null)[0])"
    # throw $file
        $newContent | Set-Content $assemblyInfoFile
    }

    Export-ModuleMember -Function Write-AssemblyInfo
}