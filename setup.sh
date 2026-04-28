#!/bin/bash

echo "--- Starting Royal Indian Rasoi Setup ---"

# Check for node
if ! command -v node &> /dev/null
then
    echo "Node.js could not be found. Please install it."
    exit
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Setup finished! Using MongoDB Atlas."
npm start
