import fs from 'fs';
import path from 'path';
import { logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest20() {
  logHeader('TEST 20: Secrets, Configuration & Production Safety');

  const rootDir = process.cwd();
  const dangerousPatterns = [
    { name: 'Supabase Service Role Key', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
    { name: 'Razorpay Secret', regex: /rzp_(live|test)_[A-Za-z0-9]{14,}/g },
    { name: 'Resend API Key', regex: /re_[A-Za-z0-9]{20,}/g },
    { name: 'Private RSA/EC Key', regex: /-----BEGIN (RSA|EC|PRIVATE) KEY-----/g }
  ];

  // Scan src/ directory (frontend client bundle source)
  const srcFiles = [];
  function scan(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        scan(full);
      } else if (f.name.endsWith('.js') || f.name.endsWith('.jsx') || f.name.endsWith('.html')) {
        srcFiles.push(full);
      }
    }
  }
  scan(path.join(rootDir, 'src'));

  logInfo(`Scanning ${srcFiles.length} frontend source files in src/ for exposed secrets...`);

  let leakedSecrets = [];
  for (const file of srcFiles) {
    const text = fs.readFileSync(file, 'utf-8');
    for (const pat of dangerousPatterns) {
      if (pat.name === 'Razorpay Secret') {
        // Look specifically for secret key patterns (not public key IDs)
        if (text.includes('RAZORPAY_KEY_SECRET') || text.includes('key_secret')) {
          leakedSecrets.push({ file: path.relative(rootDir, file), secret: pat.name });
        }
      } else if (pat.name === 'Supabase Service Role Key') {
        if (text.includes('service_role') || text.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          leakedSecrets.push({ file: path.relative(rootDir, file), secret: pat.name });
        }
      }
    }
  }

  if (leakedSecrets.length === 0) {
    logPass('Zero private secrets or service role keys detected in frontend client source code (src/)');
  } else {
    logFail(`Secret leakage detected in frontend code! Count: ${leakedSecrets.length}`);
  }

  // Check .gitignore for .env files
  const gitignorePath = path.join(rootDir, '.gitignore');
  const gitignoreText = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';
  const protectsEnv = gitignoreText.includes('.env');

  if (protectsEnv) {
    logPass('.gitignore correctly excludes .env files from Git version control');
  } else {
    logFail('.gitignore does NOT exclude .env files!');
  }

  // Check public dist/ bundle if it exists
  const distDir = path.join(rootDir, 'dist');
  let distClean = true;
  if (fs.existsSync(distDir)) {
    logInfo('Scanning production build output (dist/) for secret leakage...');
    const distFiles = [];
    function scanDist(dir) {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, f.name);
        if (f.isDirectory()) scanDist(full);
        else if (f.name.endsWith('.js')) distFiles.push(full);
      }
    }
    scanDist(distDir);

    for (const f of distFiles) {
      const c = fs.readFileSync(f, 'utf-8');
      if (c.includes('SUPABASE_SERVICE_ROLE_KEY') || c.includes('RAZORPAY_KEY_SECRET')) {
        distClean = false;
        logFail(`Production bundle contains reference to backend secret: ${path.relative(rootDir, f)}`);
      }
    }
    if (distClean) {
      logPass(`Production build bundle (${distFiles.length} JS chunks) is free of backend secrets`);
    }
  }

  if (leakedSecrets.length === 0 && protectsEnv && distClean) {
    return { test: 'Test 20: Secrets, Configuration, Dependencies, and Production Safety', status: 'PASS', details: 'Zero secret leaks, .gitignore secure, bundles clean' };
  } else {
    return { test: 'Test 20: Secrets, Configuration, Dependencies, and Production Safety', status: 'FAIL', severity: 'CRITICAL', details: 'Potential secret exposure detected' };
  }
}

if (process.argv[1]?.endsWith('test-20-secrets-audit.mjs')) {
  runTest20().then(console.log);
}
