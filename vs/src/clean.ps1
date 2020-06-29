[CmdletBinding(SupportsShouldProcess)]
Param()

# https://github.com/doblak/ps-clean/blob/master/DeleteObjBinFolders.ps1
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