
# This file contains all the default variable settings for the sandbox.
# These settings should work on every developer's machine upon installation.

# There are 3 sandbox related variables that are pre-defined prior to
# sourcing in this file. They are:
#
#  LSPAGENT_NAME     Name of the installed sandbox (installation specific)
#  LSPAGENT_TOP      Path up to and including the sandbox's primary git project
#         (eg. this file is LSPAGENT_TOP/sandbox/defaults.sh)
#  LSPAGENT_SANDBOX  Path to the root directory of the sandbox tree

# Installation options
if [ -f "$LSPAGENT_SANDBOX/sb.options" ]; then
	echo "Loading extra params from sb.options"
	. $LSPAGENT_SANDBOX/sb.options
	export `grep ^LSPAGENT_ $LSPAGENT_SANDBOX/sb.options|cut -f1 -d=`
fi

# Uncomment and setup if yarn is required. Available versions can be seen
# with the command:
#   ssh $DT_CLOUD_SERVER ls /home/web/SandboxRepos/software/yarn-$DT_OS_TYPE-*
# export LSPAGENT_YARN=true
# export LSPAGENT_YARN_VER=latest
# export PATH=$LSPAGENT_SANDBOX/yarn/bin:$PATH


# Uncomment and setup if node is required. Available versions can be seen
# with the command:
#   ssh $DT_CLOUD_SERVER ls /home/web/SandboxRepos/software/node-$DT_OS_TYPE-*
export LSPAGENT_NODE_VER=16.13.2
export PATH=$LSPAGENT_SANDBOX/node/bin:$LSPAGENT_TOP/node_modules/.bin:$PATH

# Uncomment if you want to short circuit the sandbox hooks (see hooks/git_hooks.sh)
# export LSPAGENT_DISABLE_GIT_HOOKS=1

# Add sandbox utilities to the search path
export PATH=$LSPAGENT_TOP/bin:$PATH

# Standard variables to consider using
export LSPAGENT_LOGS=$LSPAGENT_SANDBOX/log    # Log directory
export LSPAGENT_TMP=$LSPAGENT_SANDBOX/tmp     # temp directory
export LSPAGENT_CONFS=$LSPAGENT_SANDBOX/conf  # config files directory
export LSPAGENT_DATA=$LSPAGENT_SANDBOX/data   # data directory
export LSPAGENT_PIDS=$LSPAGENT_SANDBOX/pid    # pid files directory
[ -z "$LSPAGENT_ASSET_ENV" ] && export LSPAGENT_ASSET_ENV=local

# API service origin (default is specified)
# [ -z "$LSPAGENT_API_ORIGIN" ] && export LSPAGENT_API_ORIGIN=https://localhost.codestream.us:12079

# description required
# [ -z "$LSPAGENT_CONFIRMATION_CHEAT" ] && export LSPAGENT_CONFIRMATION_CHEAT=""
