#!/usr/bin/env bash

dirs=("vs" "vscode" "jb" "shared/ui" "shared/agent" "shared/util" "shared/build")

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

function compile_all () {
  fails=()
  for dir in "${dirs[@]}"; do
      pushd "$dir" || continue
      printf "\n%s: " "$dir"
      npx tsc --noEmit
      if [ $? -ne 0 ]; then
        echo "🚨$dir: typescript fail"
        fails+=("$dir")
      else
        echo "✅  passed"
      fi
      popd
    done
    if [ ${#fails[@]} -ne 0 ]; then
      printf -v joined '%s, ' "${fails[@]}"
      printf "\n🚨 Failed projects: "
      echo "${joined%, }"
    fi

}

function show_version () {
  for dir in "${dirs[@]}"; do
      pushd "$dir" || continue
      echo "$dir:"
      devDep=$(cat package.json | jq ".devDependencies.${2}")
      if [ "$devDep" = "null" ]; then
        dep=$(cat package.json | jq ".dependencies.${2}")
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
  cleanFiles=("node_modules" "jb/node_modules" "vscode/node_modules" "vs/node_modules" "shared/agent/node_modules" "shared/ui/node_modules" "shared/util/node_modules")
  for path in "${cleanFiles[@]}"; do
    if test -d "$path"; then
      echo "deleting $path"
      rm -r -f  "$path"
    else
      echo "skipping $path"
    fi
  done
}

if [ "$1" = "clean" ]; then
  clean
elif [ "$1" = "explainVersion" ]; then
  explain_version "$@"
elif [ "$1" = "showVersion" ]; then
  show_version "$@"
elif [ "$1" = "compile" ]; then
  compile_all "$@"
else
  echo "Invalid command $1"
  exit 1
fi



