#!/usr/bin/env bash

# Give the db server time to start
sleep 5

echo "Starting server"
node example-database/setup.js
npm start &

#echo "Make requests"
./make-requests.sh
