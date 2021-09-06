#!/bin/bash
set -e

exec ipfs init
exec ipfs config --json Addresses.API '["/ip4/127.0.0.1/tcp/5002"]'
exec cp /faas/ipfs-service.service /etc/systemd/system
exec systemctl start ipfs-service.service
exec npm run start "$@"
