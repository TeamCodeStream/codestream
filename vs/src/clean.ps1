# adapted from https://github.com/doblak/ps-clean/blob/master/DeleteObjBinFolders.ps1

# The MIT License (MIT)

# Copyright (c) 2013 Darjan Oblak

# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
# the Software, and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
# COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
# IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[CmdletBinding(SupportsShouldProcess)]
Param()

# PowerShell script that recursively deletes all 'bin' and 'obj' (or any other specified) folders inside current folder

$CurrentPath = (Get-Location -PSProvider FileSystem).ProviderPath

# recursively get all folders matching given includes, except ignored folders
$FoldersToRemove = Get-ChildItem .\ -include bin,obj -Recurse   | where {$_ -notmatch 'package' -and $_ -notmatch '_build'} | foreach {$_.fullname}

# recursively get all folders matching given includes
$AllFolders = Get-ChildItem .\ -include bin,obj -Recurse | foreach {$_.fullname}

# subtract arrays to calculate ignored ones
$IgnoredFolders = $AllFolders | where {$FoldersToRemove -notcontains $_} 

# remove folders and print to output
if($FoldersToRemove -ne $null)
{			
    Write-Host 
	foreach ($item in $FoldersToRemove) 
	{ 
        if ($WhatIfPreference.IsPresent -eq $True) {
            Write-Host "Would have deleted $($item)"
        }
        else {
		    remove-item $item -Force -Recurse;
            Write-Host "Removed: ." -nonewline; 
            Write-Host $item.replace($CurrentPath, ""); 
        }
	} 
}

# print ignored folders	to output
if($IgnoredFolders -ne $null)
{
    Write-Host 
	foreach ($item in $IgnoredFolders) 
	{ 
		Write-Host "Ignored: ." -nonewline; 
		Write-Host $item.replace($CurrentPath, ""); 
	} 
	
	Write-Host 
	Write-Host $IgnoredFolders.count "folders ignored" -foregroundcolor yellow
}

# print summary of the operation
Write-Host 
if($FoldersToRemove -ne $null)
{
	Write-Host $FoldersToRemove.count "folders removed" -foregroundcolor green
}
else { 	Write-Host "No folders to remove" -foregroundcolor green }	

Write-Host 

# prevent closing the window immediately
#$dummy = Read-Host "Completed, press enter to continue."