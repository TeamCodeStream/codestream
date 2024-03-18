import { execFileSync, execSync } from "child_process";
import fs from "fs";

export default function (vsRootPath: string) {
  const msbuild =
    "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin\\MSBuild.exe";
  const xunit =
    "C:\\.nuget\\xunit.runner.console\\2.7.0\\tools\\net472\\xunit.console.exe";

  try {
    execSync("npm run build:ci", { stdio: "inherit", cwd: `${vsRootPath}`});
  }
  catch(error){
    console.error("Error executing command:", error);
    process.exit(1);
  }
  
  try {
    execFileSync(
      msbuild,
      [
        `${vsRootPath}\\src\\CodeStream.VisualStudio.sln`,
        "/t:restore,rebuild",
        "/p:Configuration=Debug",
        "/verbosity:quiet",
        "/p:Platform=x64",
        "/p:DeployExtension=False",
      ],
      { stdio: "inherit" },
    );
  } catch (error) {
    console.error("Error executing command:", error);
    process.exit(1);
  }

  execSync(`dotnet tool restore --ignore-failed-sources`, {
    cwd: `${vsRootPath}\\src`,
  });
  execSync(
    `dotnet coverlet "CodeStream.VisualStudio.UnitTests.dll" --target "${xunit}" --targetargs "CodeStream.VisualStudio.UnitTests.dll" --exclude-by-file "**/Annotations/Annotations.cs" --format cobertura`,
    { cwd: `${vsRootPath}\\src` },
  );
  execSync(
    `dotnet reportgenerator "-reports:coverage.cobertura.xml" "-targetdir:coveragereport" "-reporttypes:Html;TeamCitySummary"`,
    { cwd: `${vsRootPath}\\src` },
  );

  const x64OutputPath = `${vsRootPath}\\artifacts\\x64`;

  if (!fs.existsSync(x64OutputPath)) {
    fs.mkdirSync(x64OutputPath, { recursive: true });
  }

}
