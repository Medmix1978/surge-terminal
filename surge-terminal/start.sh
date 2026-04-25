#!/bin/bash
cd "$(dirname "$0")/server"
PORT=${PORT:-3001}
node index.js
