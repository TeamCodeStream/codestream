#!/bin/bash
shopt -s expand_aliases

# https://stackoverflow.com/a/62087619/11352427
randomString() {
    local length=$1
    LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c $length
}

# Make sure httpie can work in a script
alias http='http --print b --ignore-stdin'
base_url='http://localhost:8080/api'

echo "Starting request loop"
while true; do
  name=$(randomString 10)
  echo "Creating a user"
  http post ${base_url}/users username=${name} | tee json | jq -C
  user_id=$(jq .id json)

  echo "Showing all users"
  http get ${base_url}/users | jq -C

  echo "Getting our user"
  http get ${base_url}/users/${user_id} | jq -C

  new_name=$(randomString 10)
  echo "Changing our username"
  http put ${base_url}/users/${user_id} username=${new_name} id:=${user_id} | jq -C

  orchestra=$(randomString 15)
  echo "Creating an orchestra"
  http post ${base_url}/orchestras/ name=${orchestra} | tee json | jq -C
  orchestra_id=$(jq .id json)
  
  echo "Showing all orchestras"
  http get ${base_url}/orchestras | jq -C

  echo "Getting our orchestra"
  http get ${base_url}/orchestras/${orchestra_id} | jq -C

  new_name=$(randomString 15)
  echo "Changing the orchestra name"
  http put ${base_url}/orchestras/${orchestra_id} name=${new_name} id:=${orchestra_id} | tee json | jq -C

  instrument=$(randomString 12)
  echo "Buying an instrument for our orchestra"
  http post ${base_url}/instruments/ type=${instrument} purchaseDate=2022-12-25 orchestraId=${orchestra_id} | tee json | jq -C
  cat json
  instrument_id=$(jq .id json)
  
  echo "Showing all instruments"
  http get ${base_url}/instruments | jq -C

  echo "Getting our instrument"
  http get ${base_url}/instruments/${instrument_id} | jq -C

  echo "Changing the purchase date"
  http put ${base_url}/instruments/${instrument_id} purchaseDate=2023-12-25 id:=${instrument_id} | jq -c

  echo "Deleting our instrument"
  http delete ${base_url}/instruments/${instrument_id} | jq -C
  
  echo "Deleting our orchestra"
  http delete ${base_url}/orchestras/${orchestra_id} | jq -C

  echo "Deleting our user"
  http delete ${base_url}/users/${user_id} | jq -C

  sleep 5
done
