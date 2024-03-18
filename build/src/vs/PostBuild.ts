import fs from "fs";
import * as Git from "../lib/Git";
import * as Versioning from "../lib/Versioning";
import { isCI, isPI } from "../lib/TeamCity";

interface AssetInfo {
  Name: string;
  AssetEnvironment: string;
  Version?: string;
  CommitId?: string;
}

export default function (vsRootPath: string) {
  const assetDir = `${vsRootPath}\\artifacts`;
  const version = Versioning.getVersionVS();
  const revision = Git.getRevision();
  const whereAreWe = isCI() ? "DEV" : isPI() ? "PROD" : "UNKNOWN";
  const assetBaseName = `codestream-vs-${whereAreWe}-${version}`;

  const assetInfo: AssetInfo = {
    Name: assetBaseName,
    AssetEnvironment: whereAreWe,
    Version: version,
    CommitId: revision,
  };

  const assetInfoJson = JSON.stringify(assetInfo);
  fs.writeFileSync(`${assetDir}\\${assetBaseName}.info`, assetInfoJson, {
    encoding: "utf-8",
  });

  fs.renameSync(
    `${assetDir}\\codestream-vs-22.vsix`,
    `${assetDir}\\${assetBaseName}.vsix`,
  );
}
