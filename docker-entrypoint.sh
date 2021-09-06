#!/bin/bash
set -e
exec npm i -g ipfs
exec jsipfs init
exec jsipfs config --json Addresses.API '["/ip4/127.0.0.1/tcp/5002"]'
exec jsipfs daemon &
exec npm run start "$@"
