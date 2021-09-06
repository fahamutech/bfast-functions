#!/bin/bash
set -e

exec ipfs init
exec ipfs config --json Addresses.API '["/ip4/127.0.0.1/tcp/5002"]'
exec ipfs daemon &
exec npm run start "$@"
