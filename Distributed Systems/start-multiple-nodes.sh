#!/bin/bash

echo "Starting Distributed EHR System with Multiple Nodes..."
echo

echo "Starting Node 1 (Coordinator) on port 3000..."
gnome-terminal --title="Node 1" -- bash -c "node server.js --port=3000 --node-id=node-1; exec bash" &

sleep 2

echo "Starting Node 2 on port 3001..."
gnome-terminal --title="Node 2" -- bash -c "node server.js --port=3001 --node-id=node-2; exec bash" &

sleep 2

echo "Starting Node 3 on port 3002..."
gnome-terminal --title="Node 3" -- bash -c "node server.js --port=3002 --node-id=node-3; exec bash" &

echo
echo "All nodes started! Access the system at:"
echo "- Node 1: http://localhost:3000"
echo "- Node 2: http://localhost:3001"
echo "- Node 3: http://localhost:3002"
echo
echo "Press Enter to exit..."
read
