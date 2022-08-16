#requires -Version 5.0
$zipPath = "..\src\CodeStream.VisualStudio.Vsix.x86\bin\x86\Debug\codestream-vs.zip";

if(Test-Path $zipPath) {
	Remove-Item -Path $zipPath -Force
}

Copy-Item -Path $(Resolve-Path -Path "..\src\CodeStream.VisualStudio.Vsix.x86\bin\x86\Debug\codestream-vs.vsix") -Destination "$($(Resolve-Path -Path "..\src\CodeStream.VisualStudio.Vsix.x86\bin\x86\Debug\"))codestream-vs-CHEESE.vsix"

Rename-Item -Path $(Resolve-Path -Path "..\src\CodeStream.VisualStudio.Vsix.x86\bin\x86\Debug\codestream-vs-CHEESE.vsix") -NewName "codestream-vs.zip"

# change $Path to a ZIP file that exists on your system!
$Path = Resolve-Path -Path $zipPath

# change extension filter to a file extension that exists
# inside your ZIP filea
$Filter = 'CodeStream.VisualStudio.pdb'

# change output path to a folder where you want the extracted
# files to appear
$OutPath = Resolve-Path -Path '..\src\CodeStream.VisualStudio.UnitTests\bin\x86\Debug'

# ensure the output folder exists
$exists = Test-Path -Path $OutPath
if ($exists -eq $false)
{
  $null = New-Item -Path $OutPath -ItemType Directory -Force
}

# load ZIP methods
Add-Type -AssemblyName System.IO.Compression.FileSystem

# open ZIP archive for reading
$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)

# find all files in ZIP that match the filter (i.e. file extension)
$zip.Entries | 
  Where-Object { $_.FullName -like $Filter } |
  ForEach-Object { 
    # extract the selected items from the ZIP archive
    # and copy them to the out folder
    $FileName = $_.Name
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($_, "$OutPath\$FileName", $true)
    }

# close ZIP file
$zip.Dispose()

Remove-Item -Path $zipPath -Force

