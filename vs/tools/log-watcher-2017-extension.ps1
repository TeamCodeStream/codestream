[CmdletBinding(PositionalBinding = $false)]
Param(	 
	[Parameter(Mandatory = $false)]
	[System.String] $Matches = "", 

	[Parameter(Mandatory = $false)]
	[Alias("h")]
	[Switch] $Help = $false
)

$host.ui.RawUI.WindowTitle = "2017 EXTENSION"
$path = "$($env:LOCALAPPDATA)\Codestream\Logs\vs-2017-extension.log" 

function Get-LogColor {
    Param([Parameter(Position=0)]
    [String]$LogEntry)

    process {        
		if ($LogEntry.Contains(" EROR ")) {Return "Red"}
		elseif ($LogEntry.Contains(" FATL ")) {Return "Red"}
		elseif ($LogEntry.Contains(" WARN ")) {Return "Magenta"}
		elseif ($LogEntry.Contains(" (SLOW)")) {Return "Magenta"}
        elseif ($LogEntry.Contains(" INFO ")) {Return "White"}    
		elseif ($LogEntry.Contains("EventAggregator")) { Return "DarkGreen" }
		elseif ($LogEntry.Contains(" DBUG ")) {Return "Gray"}  		
        else {Return "DarkGray"}
    }
}

Clear-Content $path
gc -wait $path | ForEach {
 if ($Matches -ne "" -and !$_.Contains($Matches)) { return; }
 Write-Host -ForegroundColor (Get-LogColor $_) $_
}