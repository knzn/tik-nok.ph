#!/bin/bash

# Stop containers 
echo "Stopping containers..."
docker-compose down

# Rebuild with no cache to ensure dependencies are updated
echo "Rebuilding server container..."
docker-compose build --no-cache server

# Start containers
echo "Starting containers..."
docker-compose up -d

# Show logs
echo "Showing server logs..."
docker-compose logs -f server 