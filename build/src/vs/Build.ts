import { execFileSync, execSync } from "child_process";
import fs from "fs";
import AdmZip from "adm-zip";

export default function (vsRootPath: string) {
  // validation only allows 17.0 and is defaulted to 17.0, so it can't be anything else anyway
  const msbuild =
    "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin\\MSBuild.exe";
  const xunit =
    "C:\\.nuget\\xunit.runner.console\\2.4.2\\tools\\net472\\xunit.console.x86.exe";

  try {
    execFileSync(
      msbuild,
      [
        `${vsRootPath}\\src\\CodeStream.VisualStudio.sln`,
        "/t:restore,rebuild",
        "/p:Configuration=Debug",
        "/p:AllowUnsafeBlocks=true",
        "/verbosity:quiet",
        "/p:Platform=x86",
        "/p:DeployExtension=False",
      ],
      { stdio: "inherit" },
    );
  } catch (error) {
    console.error("Error executing command:", error);
  }

  if (
    fs.existsSync(
      `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\.codestream-out`,
    )
  ) {
    fs.rmdirSync(
      `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\.codestream-out`,
      {
        recursive: true,
      },
    );
  }

  if (
    fs.existsSync(
      `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\codestream-vs.zip`,
    )
  ) {
    fs.rmSync(
      `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\codestream-vs.zip`,
      {
        force: true,
      },
    );
  }

  fs.copyFileSync(`${vsRootPath}\\src\\CodeStream.VisualStudio.Vsix.x86\\bin\\x86\\Debug\\codestream-vs.vsix`, `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\codestream-vs.zip`);

  var zip = new AdmZip(`${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\codestream-vs.zip`);
  zip.extractAllTo(`${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\.codestream-out\\`, true);
 
  fs.copyFileSync(`${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\.codestream-out\\CodeStream.VisualStudio.*.pdb`, `${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\`);

  fs.rmdirSync(`${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\.codestream-out`, { recursive: true });
  fs.rmdirSync(`${vsRootPath}\\src\\CodeStream.VisualStudio.UnitTests\\bin\\x86\\Debug\\codestream-vs.zip`);

  execSync(`dotnet tool restore --ignore-failed-sources`, { cwd: vsRootPath });
  execSync(`dotnet coverlet "CodeStream.VisualStudio.UnitTests.dll" --target "${xunit}" --targetargs "CodeStream.VisualStudio.UnitTests.dll" --exclude-by-file "**/Annotations/Annotations.cs" --format cobertura`, { cwd: vsRootPath });
  execSync(`dotnet reportgenerator "-reports:coverage.cobertura.xml" "-targetdir:coveragereport" "-reporttypes:Html;TeamCitySummary"`, { cwd: vsRootPath });

  const x86OutputPath = `${vsRootPath}\\artifacts\\x86`;
  const x64OutputPath = `${vsRootPath}\\artifacts\\x64`;

  if(!fs.existsSync(x86OutputPath)){
  	fs.mkdirSync(x86OutputPath, { recursive: true});
  }

  if(!fs.existsSync(x64OutputPath)){
  	fs.mkdirSync(x64OutputPath, { recursive: true});
  }

  try {
    execFileSync(
      msbuild,
      [
        `${vsRootPath}\\src\\CodeStream.VisualStudio.Vsix.x86\\CodeStream.VisualStudio.Vsix.x86.csproj`,
        "/t:restore,rebuild",
        "/p:Configuration=Release",
        "/p:AllowUnsafeBlocks=true",
        "/verbosity:quiet",
        "/p:Platform=x86",
        "/p:DeployExtension=False",
        `/p:OutputPath=${x86OutputPath}`
      ],
      { stdio: "inherit" },
    );
  } catch (error) {
    console.error("Error executing command:", error);
  }

  try {
    execFileSync(
      msbuild,
      [
        `${vsRootPath}\\src\\CodeStream.VisualStudio.Vsix.x64\\CodeStream.VisualStudio.Vsix.x64.csproj`,
        "/t:restore,rebuild",
        "/p:Configuration=Release",
        "/p:AllowUnsafeBlocks=true",
        "/verbosity:quiet",
        "/p:Platform=x64",
        "/p:DeployExtension=False",
        `/p:OutputPath=${x64OutputPath}`
      ],
      { stdio: "inherit" },
    );
  } catch (error) {
    console.error("Error executing command:", error);
  }
}
