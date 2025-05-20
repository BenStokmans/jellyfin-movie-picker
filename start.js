#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n✨ Starting Jellyfin Movie Picker...');

// Start the integrated server (which serves the client too)
console.log('\n🚀 Starting integrated server...');
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  shell: true,
  stdio: 'pipe'
});

// Helper function to prefix output with colors
const prefixOutput = (prefix, data, color) => {
  const lines = data.toString().split('\n').filter(Boolean);
  lines.forEach(line => {
    console.log(`${color}[${prefix}]${'\x1b[0m'} ${line}`);
  });
};

// Handle server output
serverProcess.stdout.on('data', (data) => {
  prefixOutput('Server', data, '\x1b[36m'); // Cyan
});

serverProcess.stderr.on('data', (data) => {
  prefixOutput('Server', data, '\x1b[36m'); // Cyan
});

// Handle process exit
const cleanup = () => {
  console.log('\n🛑 Shutting down...');
  serverProcess.kill();
  console.log('👋 Goodbye!');
  process.exit(0);
};

// Handle keyboard interrupt
rl.on('SIGINT', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log('\n✨ Jellyfin Movie Picker is starting up!');
console.log('⭐ The application will be available at http://localhost:3000');
console.log('Press Ctrl+C to stop the server\n');
