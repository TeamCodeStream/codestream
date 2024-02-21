#!/usr/bin/env bash

function check_commands() {

  # Check for jq
  if ! command -v jq >/dev/null; then
    echo "jq could not be found"
    echo "Please install it using Homebrew: brew install jq"
    exit 1
  fi

  # Check for Node.js, npm and npx
  if command -v node >/dev/null && command -v npm >/dev/null && command -v npx >/dev/null; then
    version=$(node -v)
    if [[ $version != "v18.15.0" ]]; then
      echo "Incorrect version of Node.js $version. Please use v18.15.0."
      echo "If you don't have it, please install it using nvm which you can install with 'brew install nvm' and then 'nvm install 18.15.0'"
      exit 1
    fi
  else
    echo "Node.js, npm, or npx was not found"
    echo "Please install Node.js v18.15.0: Install nvm using Homebrew with 'brew install nvm' and then use nvm to install Node.js with 'nvm install 18.15.0'"
    exit 1
  fi
}

check_commands

dirs=("vs" "vscode" "jb" "shared/ui" "shared/agent" "shared/util" "shared/build")

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

function format_number() {
    # Using node.js to format number with thousands separators
    number=$(node -e "console.log(parseInt('$1').toLocaleString('en-US'))")
    echo "$number"
}

function compile_all () {
  fails=()
  total_elapsed=0
  for dir in "${dirs[@]}"; do
      pushd "$dir" || continue
      printf "\n%s: " "$dir"
      start_time=$(node -e "console.log(Date.now())")
      npx tsc --noEmit
      exit_status=$?
      end_time=$(node -e "console.log(Date.now())")
      elapsed_time_ms=$((end_time - start_time)) # calculating elapsed time in ms
      total_elapsed=$((total_elapsed + elapsed_time_ms))  # in ms
      if [ $exit_status -ne 0 ]; then
        echo "🚨 $dir: typescript fail"
        fails+=("$dir")
      else
        # Format elapsed time in ms with comma as thousands separator
        formatted_elapsed_time_ms=$(format_number "$elapsed_time_ms")
        printf "✅  passed in %s ms\n" "$formatted_elapsed_time_ms"  # showing milli-seconds
      fi
      popd
  done
  if [ ${#fails[@]} -ne 0 ]; then
    printf -v joined '%s, ' "${fails[@]}"
    printf "\n🚨 Summary of failed projects: "
    echo "${joined%, }"
  fi
  # Format total elapsed time in ms with comma as thousands separator
  formatted_total_elapsed_ms=$(format_number "$total_elapsed")
  printf "\nTotal compilation time: %s ms\n" "$formatted_total_elapsed_ms"  # showing milli-seconds
}

function test () {
  # shared/agent temporarily runs shared/utils tests until teamcity is updated
  # pushd shared/utils
  # npm run test
  # popd
  pushd shared/agent
  npm run test-unit
  popd
  pushd shared/ui
  npm run test
}

function show_version () {
  for dir in "${dirs[@]}"; do
      pushd "$dir" || continue
      echo "$dir:"
      devDep=$(cat package.json | jq ".devDependencies.\"${2}\"")
      if [ "$devDep" = "null" ]; then
        dep=$(cat package.json | jq ".dependencies.\"${2}\"")
        echo $dep
      else
        echo $devDep
      fi
      popd
    done
}

function explain_version () {
  for dir in "${dirs[@]}"; do
    pushd "$dir" || continue
    echo "$dir:"
    npm explain "$2" 2>/dev/null
    if [ $? -ne 0 ]; then
      echo "Not found"
    fi
    popd
  done
}


function clean () {
  cleanFiles=(
    "jb/node_modules"
    "vscode/node_modules"
    "vs/node_modules"
    "shared/agent/node_modules"
    "shared/ui/node_modules"
    "shared/util/node_modules"
    "shared/agent/dist"
    "vscode/dist"
    "vs/src/resources/agent"
    "vs/src/CodeStream.VisualStudio.Vsix.x86/agent"
    "vs/src/CodeStream.VisualStudio.Vsix.x64/agent"
    "vs/src/resources/webview"
  )
  for path in "${cleanFiles[@]}"; do
    if [ -d "$path" ]; then
      echo "deleting $path"
      rm -r -f  "$path"
    else
      echo "skipping $path"
    fi
  done
}

function killEsbuild () {
  pkill esbuild
  pids=$(ps aux | grep esbuild.ts | grep -v grep | awk '{print $2}')
  for pid in $pids; do
    echo "killing $pid"
    kill -9 "$pid"
  done
}

function usage () {
  echo "Usage: utils.sh <command>"
  echo "Commands:"
  echo "  clean: remove node_modules from all projects"
  echo "  explainVersion <package>: explain the version of a package in all projects. Shows why a particular version is being used"
  echo "  showVersion <package>: briefly show the version of a package in all projects"
  echo "  test: run tests in all projects"
  echo "  compile: run typescript compiler (noEmit) on all projects"
  echo "  killEsbuild: kill all esbuild processes"
}

if [ "$1" = "" ]; then
  usage
  exit 1
fi

if [ "$1" = "clean" ]; then
  clean
elif [ "$1" = "explainVersion" ]; then
  explain_version "$@"
elif [ "$1" = "showVersion" ]; then
  show_version "$@"
elif [ "$1" = "test" ]; then
  test
elif [ "$1" = "compile" ]; then
  compile_all "$@"
elif [ "$1" = "killEsbuild" ]; then
  killEsbuild
else
  printf "Invalid command %s\n\n" "$1"
  usage
  exit 1
fi
