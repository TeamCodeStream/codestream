Set-StrictMode -Version Latest

New-Module -ScriptBlock {

    $solutionInfo = Join-Path $rootDirectory src\CodeStream.VisualStudio.Core\SolutionInfo.cs

    function Read-VersionSolutionInfo {
        $currentVersion = Get-Content $solutionInfo | %{
         $regex = "const string Version = `"(\d+\.\d+\.\d+.\d+\)`";"
            if ($_ -match $regex) {
                $matches[1]
            }
        }
        [System.Version] $currentVersion
    }

    function Write-SolutionInfo([System.Version]$version, [System.String] $environment) {
        $numberOfReplacements = 0
        $newContent = Get-Content $solutionInfo | %{
            $newString = $_
            
            $regex = "(string Version = `")\d+\.\d+\.\d+\.\d+"
            if ($_ -match $regex) {
                $numberOfReplacements++
                $newString = $newString -replace $regex,  "string Version = `"$($version.Major).$($version.Minor).$(($version.Build, 0 -ne $null)[0]).$(($version.Revision, 0 -ne $null)[0])"
            }
            $newString
        }

        if ($numberOfReplacements -ne 1) {
            Die 1 "Expected to replace the version number in 1 place in SolutionInfo.cs (Version) but actually replaced it in $numberOfReplacements"
        }

        $newContent | Set-Content $solutionInfo

        $numberOfReplacements = 0
        $found = $False
        $newContent = Get-Content $solutionInfo | %{
            $newString = $_
            if($found -eq $True) {
                return $newstring;
            }
            $regex = "string BuildEnv = `"([a-zA-Z0-9]+)?`";"
            if ($_ -match $regex) {
                $numberOfReplacements++
                $newString = $newString -replace $regex,  "string BuildEnv = `"$($environment)`";"
                $found = $True                
            }
            $newString
        }

        if ($numberOfReplacements -ne 1) {
            Die 1 "Expected to replace the BuildEnv in 1 place in SolutionInfo.cs but actually replaced it in $numberOfReplacements"
        }


        $newContent | Set-Content $solutionInfo
    }

    Export-ModuleMember -Function Write-SolutionInfo
}