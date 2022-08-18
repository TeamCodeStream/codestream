.\Bump-Version.ps1 -BumpMinor

if (!$?) {
    exit 1
}

.\Build.ps1