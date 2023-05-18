#!/usr/bin/env bash

echo "Starting server"
node -r ./instrumentation index.js &

echo "Make requests"
# make requests 
./make-requests.sh
