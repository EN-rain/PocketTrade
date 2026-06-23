#!/usr/bin/env node
/**
 * Bundles the admin app into the web app's public folder.
 * 
 * Usage:
 *   node scripts/bundle-admin.mjs
 * 
 * Environment:
 *   ADMIN_BUNDLE_HASH - use a specific hash instead of generating one
 */

import * as fs from 'fs'
import * as path from 'path'
import * as child_process from 'child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'url'

// Get script directory for reliable path resolution
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..') // scripts -> web

// Generate or use provided hash
const hash = process.env.ADMIN_BUNDLE_HASH || randomBytes(6).toString('hex')
const adminPath = `/_adm_${hash}/index.html`

console.log(`Bundling admin app to ${adminPath}...`)

// Step 1: Build the admin app
console.log('Building admin app...')
const adminDir = path.join(webRoot, '..', 'admin')
console.log('Admin dir:', adminDir)
const buildResult = child_process.spawnSync('npm', ['run', 'build'], {
  cwd: adminDir,
  stdio: 'inherit',
  shell: true,
})

if (buildResult.status !== 0) {
  console.error('Admin build failed!')
  process.exit(1)
}

// Step 2: Remove any old _adm_* folders
console.log('Cleaning old admin bundles...')
const publicDir = path.join(webRoot, 'public')
const entries = fs.readdirSync(publicDir)
for (const entry of entries) {
  if (entry.startsWith('_adm_')) {
    const fullPath = path.join(publicDir, entry)
    console.log(`  Removing ${fullPath}`)
    fs.rmSync(fullPath, { recursive: true })
  }
}

// Step 3: Create new admin bundle directory
const targetDir = path.join(publicDir, `_adm_${hash}`)
console.log(`Creating ${targetDir}`)
fs.mkdirSync(targetDir, { recursive: true })

// Step 4: Copy admin dist files
const adminDistDir = path.join(webRoot, '..', 'admin', 'dist')
const copyDir = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

console.log('Copying admin dist files...')
copyDir(adminDistDir, targetDir)

// Step 5: Write admin-path.txt
fs.writeFileSync(
  path.join(publicDir, 'admin-path.txt'),
  `${adminPath}#/login`
)
console.log(`Wrote admin-path.txt: ${adminPath}`)

// Step 6: Write _adm_path.json (kept for backwards compatibility if needed)
fs.writeFileSync(
  path.join(publicDir, '_adm_path.json'),
  JSON.stringify({ path: adminPath }, null, 2)
)

console.log(`\nBundled admin to ${adminPath}`)