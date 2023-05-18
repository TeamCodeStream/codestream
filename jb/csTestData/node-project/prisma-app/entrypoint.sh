#!/usr/bin/env bash

# Give the db server time to start
sleep 5

echo "Starting server"
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev &

echo "Make requests"
./make-requests.sh
