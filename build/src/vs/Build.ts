import { execFileSync } from "child_process";
import fs from "fs";

export default function (vsRootPath: string) {
  // validation only allows 17.0 and is defaulted to 17.0, so it can't be anything else anyway
  const msbuild =
    "C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/MSBuild/Current/Bin/MSBuild.exe";
  const xunit =
    "C:/.nuget/xunit.runner.console/2.4.2/tools/net472/xunit.console.x86.exe";

  execFileSync(
    `"${msbuild}"`,
    [
      `${vsRootPath}/src/CodeStream.VisualStudio.sln`,
      "/t:restore,rebuild",
      "/p:Configuration=Debug",
      "/p:AllowUnsafeBlocks=true",
      "/verbosity:quiet",
      "/p:Platform='x86'",
      "/p:DeployExtension:False",
    ],
    { stdio: "inherit" },
  );

  if (
    fs.existsSync(
      `${vsRootPath}/src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out`,
    )
  ) {
    fs.rmdirSync(
      `${vsRootPath}/src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out`,
      {
        recursive: true,
      },
    );
  }

  if (
    fs.existsSync(
      `${vsRootPath}/src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip`,
    )
  ) {
    fs.rmSync(
      `${vsRootPath}/src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip`,
      {
        force: true,
      },
    );
  }

  // fs.copyFileSync('../src/CodeStream.VisualStudio.Vsix.x86/bin/x86/Debug/codestream-vs.vsix', '../src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip');

  // execSync(`7z e ../src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip ../src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out/`, (error, stdout, stderr) => {
  // 	if (error) {
  // 	  consoul.error(error);
  // 	  return;
  // 	}
  // 	else if(stderr){
  // 	  consoul.error(stderr);
  // 	  return;
  // 	}
  // 	else{
  // 	  consoul.info(stdout);
  // 	}
  //   });

  // fs.copyFileSync('../src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out/CodeStream.VisualStudio.*.pdb', '../src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/');

  // fs.rmdirSync('../src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/.codestream-out/', { recursive: true, force: true});
  // fs.rmdirSync('../src/CodeStream.VisualStudio.UnitTests/bin/x86/Debug/codestream-vs.zip', { force: true});

  // execSync(`dotnet tool restore --ignore-failed-sources`);
  // execSync(`dotnet coverlet "CodeStream.VisualStudio.UnitTests.dll" --target "${xunit}" --targetargs "CodeStream.VisualStudio.UnitTests.dll" --exclude-by-file "**/Annotations/Annotations.cs" --format cobertura`);
  // execSync(`dotnet reportgenerator "-reports:coverage.cobertura.xml" "-targetdir:coveragereport" "-reporttypes:Html;TeamCitySummary"`);

  // const x86OutputPath = './artifacts/x86';
  // const x64OutputPath = './artifacts/x64';

  // if(!fs.existsSync(x86OutputPath)){
  // 	fs.mkdirSync(x86OutputPath, { recursive: true});
  // }

  // if(!fs.existsSync(x64OutputPath)){
  // 	fs.mkdirSync(x64OutputPath, { recursive: true});
  // }

  // execSync(`${msbuild} '../src/CodeStream.VisualStudio.Vsix.x86/CodeStream.VisualStudio.Vsix.x86.csproj' /t:restore,Rebuild /p:Configuration=Release /p:AllowUnsafeBlocks=true /verbosity:Normal /p:Platform='x86' /p:OutputPath=${x86OutputPath} /p:DeployExtension=False`)
  // execSync(`${msbuild} '../src/CodeStream.VisualStudio.Vsix.x64/CodeStream.VisualStudio.Vsix.x64.csproj' /t:restore,Rebuild /p:Configuration=Release /p:AllowUnsafeBlocks=true /verbosity:Normal /p:Platform='x64' /p:OutputPath=${x64OutputPath} /p:DeployExtension=False`)
}
