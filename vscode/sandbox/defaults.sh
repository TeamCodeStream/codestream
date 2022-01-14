
# This file contains all the default variable settings for the sandbox.
# These settings should work on every developer's machine upon installation.

# There are 3 sandbox related variables that are pre-defined prior to
# sourcing in this file. They are:
#
#  VSCSB_NAME     Name of the installed sandbox (installation specific)
#  VSCSB_TOP      Path up to and including the sandbox's primary git project
#         (eg. this file is VSCSB_TOP/sandbox/defaults.sh)
#  VSCSB_SANDBOX  Path to the root directory of the sandbox tree


# Uncomment and setup if yarn is required. Available versions can be seen
# with the command:
#   ssh $DT_CLOUD_SERVER ls /home/web/SandboxRepos/software/yarn-$DT_OS_TYPE-*
# export VSCSB_YARN=true
# export VSCSB_YARN_VER=latest
# export PATH=$VSCSB_SANDBOX/yarn/bin:$PATH


# Uncomment and setup if node is required. Available versions can be seen
# with the command:
#   ssh $DT_CLOUD_SERVER ls /home/web/SandboxRepos/software/node-$DT_OS_TYPE-*
export VSCSB_NODE_VER=16.13.2
export PATH=$VSCSB_SANDBOX/node/bin:node_modules/.bin:$PATH

# Uncomment if you want to short circuit the sandbox hooks (see hooks/git_hooks.sh)
# export VSCSB_DISABLE_GIT_HOOKS=1

# Add sandbox utilities to the search path
export PATH=$VSCSB_TOP/bin:$PATH

# Standard variables to consider using
export VSCSB_LOGS=$VSCSB_SANDBOX/log    # Log directory
export VSCSB_TMP=$VSCSB_SANDBOX/tmp     # temp directory
export VSCSB_CONFS=$VSCSB_SANDBOX/conf  # config files directory
export VSCSB_DATA=$VSCSB_SANDBOX/data   # data directory
export VSCSB_PIDS=$VSCSB_SANDBOX/pid    # pid files directory
[ -z "$VSCSB_ASSET_ENV" ] && export VSCSB_ASSET_ENV=local

# If this variable is defined, the build command will not publish to the VS Code marketplace
export VSCSB_NOPUBLISH=1
