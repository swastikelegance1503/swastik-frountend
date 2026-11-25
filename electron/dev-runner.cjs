const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const VITE_PORT = 5173;
const DEV_URL = `http://localhost:${VITE_PORT}`;

function isPortOpen(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function waitForVite(timeoutMs = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const open = await isPortOpen(DEV_URL);
    if (open) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function start() {
  console.log('🚀 Checking if Vite dev server is running on', DEV_URL);
  let viteProcess = null;

  const isOpen = await isPortOpen(DEV_URL);
  if (!isOpen) {
    console.log('⚡ Starting Vite dev server...');
    viteProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });
  } else {
    console.log('✅ Vite dev server is already running!');
  }

  const ready = await waitForVite();
  if (!ready) {
    console.error('❌ Failed to connect to Vite dev server on', DEV_URL);
    if (viteProcess) viteProcess.kill();
    process.exit(1);
  }

  console.log('🖥️ Launching Swastik Art Electron Desktop Window...');
  const electronBinary = require('electron');

  const devEnv = {
    ...process.env,
    ELECTRON_START_URL: DEV_URL,
    NODE_ENV: 'development'
  };
  delete devEnv.ELECTRON_RUN_AS_NODE;

  const electronProcess = spawn(electronBinary, ['.'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: devEnv
  });

  electronProcess.on('close', (code) => {
    console.log('👋 Desktop App closed with exit code', code);
    if (viteProcess) {
      console.log('🛑 Stopping background dev server...');
      viteProcess.kill();
    }
    process.exit(code || 0);
  });
}

start().catch((err) => {
  console.error('Failed to start Electron Dev:', err);
  process.exit(1);
});

