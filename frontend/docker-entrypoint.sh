#!/bin/sh
set -e

# Install dependencies if node_modules doesn't exist or is empty
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Execute the command passed to the entrypoint
exec "$@"

