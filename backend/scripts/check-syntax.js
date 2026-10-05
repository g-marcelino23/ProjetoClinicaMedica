const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const roots = ['src', 'scripts', 'test', 'migrations']
const files = []

const collectJavaScript = (directory) => {
  if (!fs.existsSync(directory)) return

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) collectJavaScript(fullPath)
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath)
  }
}

roots.forEach(collectJavaScript)

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'inherit',
  })

  if (result.status !== 0) process.exit(result.status || 1)
}

console.log(`${files.length} arquivos JavaScript verificados com sucesso.`)
