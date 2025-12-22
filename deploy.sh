#!/bin/bash

# Simple one-command deployment script
# Deploys both backend and frontend to Fly.io

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/deploy-fly.sh" --all --setup-db
