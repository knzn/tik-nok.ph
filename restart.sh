#!/bin/bash

# Stop all containers
echo "Stopping all containers..."
docker-compose down

# Start containers
echo "Starting containers..."
docker-compose up -d

# Show logs
echo "Showing server logs..."
docker-compose logs -f server 