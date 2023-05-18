#!/bin/bash
shopt -s expand_aliases

# https://stackoverflow.com/a/62087619/11352427
randomString() {
    local length=$1
    LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c $length
}

# Make sure httpie can work in a script
alias http='http --print b --ignore-stdin'

echo "Starting request loop"
while true; do
  name=$(randomString 10)
  email=${name}@example.com
  echo "Creating a user"
  http post http://localhost:3000/signup name=${name} email=${email} | tee json | jq -C
  user_id=$(jq .id json)

  echo "Showing users"
  http get http://localhost:3000/users | jq -C

  echo "Creating a post"
  http post http://localhost:3000/post title=$(randomString 20) content=$(randomString 40) authorEmail=${email} | tee json | jq -C
  post_id=$(jq .id json)

  echo "Showing user drafts"
  http get http://localhost:3000/user/${user_id}/drafts | jq -C

  echo "Adding a view to a post"
  http put http://localhost:3000/post/${post_id}/views | jq -C

  echo "Publish a post"
  http put http://localhost:3000/publish/${post_id} | jq -C

  echo "Show the post feeds"
  http get http://localhost:3000/feed | jq -C

  echo "Delete the post"
  http delete http://localhost:3000/post/${post_id} | jq -C
  sleep 5
done
