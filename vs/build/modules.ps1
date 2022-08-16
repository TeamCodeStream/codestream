 

New-Module -ScriptBlock {
    $rootDirectory = Split-Path ($PSScriptRoot)
    $scriptsDirectory = Join-Path $rootDirectory "build"
    Export-ModuleMember -Variable scriptsDirectory,rootDirectory
}

New-Module -ScriptBlock {
    function Die([int]$exitCode, [string]$message, [object[]]$output) {
        #$host.SetShouldExit($exitCode)
        if ($output) {
            Write-Host $output
            $message += ". See output above."
        }
        $hash = @{
            Message = $message
            ExitCode = $exitCode
            Output = $output
        }

        throw $message
    }


    function Run-Command([scriptblock]$Command, [switch]$Fatal, [switch]$Quiet) {
        $output = ""

        $exitCode = 0

        if ($Quiet) {
            $output = & $command 2>&1 | %{ "$_" }
        } else {
            & $command
        }

        if (!$? -and $LastExitCode -ne 0) {
            $exitCode = $LastExitCode
        } elseif ($? -and $LastExitCode -ne 0) {
            $exitCode = $LastExitCode
        }

        if ($exitCode -ne 0) {
            if (!$Fatal) {
                Write-Host "``$Command`` failed" $output
            } else {
                Die $exitCode "``$Command`` failed" $output
            }
        }
        $output
    }

    function Run-Process([int]$Timeout, [string]$Command, [string[]]$Arguments, [switch]$Fatal = $false)
    {
        $args = ($Arguments | %{ "`"$_`"" })
        [object[]] $output = "$Command " + $args
        $exitCode = 0
        $outputPath = [System.IO.Path]::GetTempFileName()
        $process = Start-Process -PassThru -NoNewWindow -RedirectStandardOutput $outputPath $Command ($args | %{ "`"$_`"" })
        Wait-Process -InputObject $process -Timeout $Timeout -ErrorAction SilentlyContinue
        if ($process.HasExited) {
            $output += Get-Content $outputPath
            $exitCode = $process.ExitCode
        } else {
            $output += "Process timed out. Backtrace:"
            $output += Get-DotNetStack $process.Id
            $exitCode = 9999
        }
        Stop-Process -InputObject $process
        Remove-Item $outputPath
        if ($exitCode -ne 0) {
            if (!$Fatal) {
                Write-Host "``$Command`` failed" $output
            } else {
                Die $exitCode "``$Command`` failed" $output
            }
        }
        $output
    }

    function Create-TempDirectory {
        $path = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
        New-Item -Type Directory $path
    }

    Export-ModuleMember -Function Die,Run-Command,Run-Process,Create-TempDirectory
}

New-Module -ScriptBlock {
    function Find-Git() {
        $git = (Get-Command 'git.exe').Path
        if (!$git) {
          $git = Join-Path $rootDirectory 'PortableGit\cmd\git.exe'
        }
        if (!$git) {
          Die("Couldn't find installed an git.exe")
        }
        $git
    }

    function Push-Changes([string]$branch) {
        Push-Location $rootDirectory

        Write-Host "Pushing $Branch to GitHub..."

        Run-Command -Fatal { & $git push origin $branch }

        Pop-Location
    }

    function Update-Submodules {
        Write-Host "Updating submodules..."
        Write-Host ""

        Run-Command -Fatal { git submodule init }
        Run-Command -Fatal { git submodule sync }
        Run-Command -Fatal { git submodule update --recursive --force }
    }

    function Clean-WorkingTree {
        Write-Host "Cleaning work tree..."
        Write-Host ""

        Run-Command -Fatal { git clean -xdf }
        Run-Command -Fatal { git submodule foreach git clean -xdf }
    }

    function Get-HeadSha {
        Run-Command -Quiet { & $git rev-parse HEAD }
    }

    $git = Find-Git
    Export-ModuleMember -Function Find-Git,Push-Changes,Update-Submodules,Clean-WorkingTree,Get-HeadSha
}

New-Module -ScriptBlock {
    function Write-Manifest([string]$directory) {
        Add-Type -Path (Join-Path $rootDirectory packages\Newtonsoft.Json.6.0.8\lib\net35\Newtonsoft.Json.dll)

        $manifest = @{
            NewestExtension = @{
                Version = [string](Read-CurrentVersionVsix)
                Commit = [string](Get-HeadSha)
            }
        }

        $manifestPath = Join-Path $directory manifest
        [Newtonsoft.Json.JsonConvert]::SerializeObject($manifest) | Out-File $manifestPath -Encoding UTF8
    }

    Export-ModuleMember -Function Write-Manifest
}

$scriptsDirectory = Split-Path $MyInvocation.MyCommand.Path
$rootDirectory = Split-Path ($scriptsDirectory)

function Die([string]$message, [object[]]$output) {
    if ($output) {
        Write-Output $output
        $message += ". See output above."
    }
    Throw $message
}

$git = (Get-Command 'git.exe').Path
if (!$git) {
  $git = Join-Path $rootDirectory 'PortableGit\cmd\git.exe'
}
if (!$git) {
  throw "Couldn't find installed an git.exe"
}


function Create-TempDirectory {
    $path = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
    New-Item -Type Directory $path
}

function Push-Changes([string]$branch) {
    Push-Location $rootDirectory

    Write-Output "Pushing $Branch to GitHub..."

    Run-Command -Fatal { & $git push origin $branch }

    Pop-Location
}

 