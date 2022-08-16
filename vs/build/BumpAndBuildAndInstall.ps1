.\Bump-Version.ps1 -BumpMinor
.\Build.ps1 -Mode Release
ii .\artifacts\Release
& "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\VSIXInstaller.exe" .\artifacts\Release\codestream-vs-22.vsix