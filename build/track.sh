#!/usr/bin/env bash

# TCBUILD_ASSET_FULL_NAME populated in TC build step `prep` - might need to be updated after migrating of dev_tools
version=$TCBUILD_ASSET_FULL_NAME
entityGuid=$2
ERR_EXIT_CODE=0 # Don't fail the build for now - change once we confirm this script works

# Get the commit from the current branch
commit=$(git rev-parse HEAD)

# Handle git error
if [ $? -ne 0 ]; then
  echo "Error getting commit from git"
  exit $ERR_EXIT_CODE
fi

# Check for missing args
if [ -z "$version" ] || [ -z "$entityGuid" ]; then
  echo "Usage: $0 <version> <entityGuid>"
  exit $ERR_EXIT_CODE
fi

# Check for missing env var
if [ -z "$NR_API_KEY" ]; then
  echo "NR_API_KEY environment variable not set"
  exit $ERR_EXIT_CODE
fi

echo "Sending deployment event to New Relic for version $version, entityGuid $entityGuid, commit $commit"
DATA="{\"query\": \"mutation { changeTrackingCreateDeployment( deployment: { version: \\\"$version\\\", entityGuid: \\\"$entityGuid\\\", commit: \\\"$commit\\\" } ) { deploymentId entityGuid } }\" }"
# echo $DATA

# Send the deployment event to New Relic
curl -i -X POST https://staging-api.newrelic.com/graphql \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H "Api-Key: $NR_API_KEY" \
  -H 'NewRelic-Requesting-Services: "CodeStream"' \
  -d "$DATA"

# Check for curl error, echo if error occurred and exit
if [ $? -ne 0 ]; then
  echo "Error sending deployment event to New Relic"
  exit $ERR_EXIT_CODE
fi

echo "Deployment event sent to New Relic"
