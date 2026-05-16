#!/bin/sh
# Ensures the analytics DB directory is writable before the server starts.
#
# Easypanel (and plain Docker bind mounts) attach volumes owned by root. The
# server runs as the unprivileged `node` user, so we fix ownership here while
# still root, then drop privileges with gosu. Works for named volumes, bind
# mounts, and Easypanel volume mounts alike.
set -e

DB_DIR="${DB_DIR:-/app/db}"
mkdir -p "$DB_DIR"
chown -R node:node "$DB_DIR"

exec gosu node "$@"
