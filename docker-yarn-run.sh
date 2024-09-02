#!/bin/sh

docker run --rm -v "$PWD":/app -w /app --env YARN_CACHE_FOLDER=/app/docker/.yarn-cache --add-host host.docker.internal:host-gateway "node:20" bash -c "yarn $*"
