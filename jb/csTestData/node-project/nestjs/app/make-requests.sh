#!/bin/bash
shopt -s expand_aliases

# https://stackoverflow.com/a/62087619/11352427
randomString() {
    local length=$1
    LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c $length
}

# Make sure httpie can work in a script
alias http='http --print b --ignore-stdin'
beauty="CatsArePretty"

echo "Starting request loop"
while true; do
  name=$(randomString 10)
  email=${name}@example.com
  echo "Creating a user"
  http post http://localhost:3000/user name=${name} email=${email} | tee json | jq -C
  user_id=$(jq .id json)

  echo "Say hello"
  http get http://localhost:3000/

  echo "Show this user"
  http get http://localhost:3000/user/${user_id} | jq -C

  echo "Creating two cats"
  http post http://localhost:3000/cat name=$(randomString 20) birthdate=2023-04-01 ownerEmail=${email} breed=${beauty} | tee json | jq -C
  cat_id_1=$(jq .id json)
  http post http://localhost:3000/cat name=$(randomString 20) birthdate=2023-04-01 ownerEmail=${email} breed=${beauty} | tee json | jq -C
  cat_id_2=$(jq .id json)

  echo "Find the cats"
  http get http://localhost:3000/filtered-cats/${beauty} | jq -C

  echo "Find the cats, but rudely, get denied access"
  http get http://localhost:3000/filtered-cats/${beauty}?please=no | jq -C

  echo "Find a cat but wrongly, trigger a Nest.js error"
  http get http://localhost:3000/cat/felix | jq -C
  
  echo "Delete the cats"
  http delete http://localhost:3000/cat/${cat_id_1} | jq -C
  http delete http://localhost:3000/cat/${cat_id_2} | jq -C
  sleep 5

  echo "Delete the user"
  http delete http://localhost:3000/user/${user_id} | jq -C
  sleep 5
done
