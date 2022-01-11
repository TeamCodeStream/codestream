
# This file contains all the default variable settings for the sandbox.
# These settings should work on every developer's machine upon installation.

# There are 3 sandbox related variables that are pre-defined prior to
# sourcing in this file. They are:
#
#  JB_NAME     Name of the installed sandbox (installation specific)
#  JB_TOP      Path up to and including the sandbox's primary git project
#         (eg. this file is JB_TOP/sandbox/defaults.sh)
#  JB_SANDBOX  Path to the root directory of the sandbox tree


# Installation options
# --------------------
# You can override a sandbox's configuration variables by placing
# 'VARIABLE=VALUE' assignments into $MY_SANDBOX/sb.options.  These
# settings will override any others specified in the sandbox config.
# Each row is stricly a KEY=VALUE assignment. Do not write shell
# code. Use a ash (#) for comments.

if [ -f "$JB_SANDBOX/sb.options" ]; then
	echo "Loading extra params from sb.options"
	. $JB_SANDBOX/sb.options
	export `grep ^JB_ $JB_SANDBOX/sb.options|cut -f1 -d=`
fi


# ------------- Yarn --------------
# Uncomment and setup if yarn is required. Available versions can be seen
# with the command:
#   ssh $DT_CLOUD_SERVER ls /home/web/SandboxRepos/software/yarn-$DT_OS_TYPE-*
# export JB_YARN=true
# export JB_YARN_VER=latest
# export PATH=$JB_SANDBOX/yarn/bin:$PATH


# ------------- Node --------------
# Uncomment and setup if node is required. Available versions can be seen
# with the command:
#   ssh $DT_CLOUD_SERVER ls /home/web/SandboxRepos/software/node-$DT_OS_TYPE-*
[ -z "$JB_NODE_VER" ] && export JB_NODE_VER=16.13.2
export PATH=$JB_SANDBOX/node/bin:$JB_TOP/node_modules/.bin:$PATH
#
#
# Set this variable if you require additional options when doing npm installs
# (run from sandbox/configure-sandbox).  For example, doing npm installs from
# inside a docker container requires --unsafe-perm
#
# export JB_NPM_INSTALL_XTRA_OPTS=

# Add $MY_SANDBOX/bin to the search path
export PATH=$JB_TOP/bin:$PATH

# Uncomment if you want to short circuit the sandbox hooks (see hooks/git_hooks.sh).
# Similar to running 'git commit --no-verify'
# export JB_DISABLE_GIT_HOOKS=1

# Standard locations inside the sandbox
export JB_LOGS=$JB_SANDBOX/log    # Log directory
export JB_TMP=$JB_SANDBOX/tmp     # temp directory
export JB_CONFS=$JB_SANDBOX/conf  # config files directory
export JB_DATA=$JB_SANDBOX/data   # data directory
export JB_PIDS=$JB_SANDBOX/pid    # pid files directory

# Defines the asset build environment (usually 'local', 'dev' or 'prod')
# Used mostly when building assets or creating config files
[ -z "$JB_ASSET_ENV" ] && export JB_ASSET_ENV=local

# Defines the run-time environment (usually 'local', 'qa', 'pd', 'prod')
# Used for configuring a sandbox for a specific environment at run-time.
[ -z "$JB_ENV" ] && export JB_ENV=local
