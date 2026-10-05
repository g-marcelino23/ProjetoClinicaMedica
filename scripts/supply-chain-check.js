const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const projects = ['.', 'backend', 'frontend']
const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))

for (const project of projects) {
  const prefix = project === '.' ? '' : `${project}/`
  const manifest = readJson(`${prefix}package.json`)
  const lock = readJson(`${prefix}package-lock.json`)

  assert.equal(manifest.private, true, `${prefix}package.json precisa ser private`)
  assert.equal(
    manifest.packageManager,
    'npm@11.9.0',
    `${prefix}package.json precisa fixar o gerenciador`
  )
  assert.ok(manifest.engines?.node, `${prefix}package.json precisa fixar Node.js`)
  assert.equal(lock.lockfileVersion, 3, `${prefix}package-lock.json deve usar lockfile v3`)

  for (const [name, version] of Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  })) {
    assert.equal(
      exactVersionPattern.test(version),
      true,
      `${name} não usa uma versão exata do registro: ${version}`
    )
  }

  for (const [packagePath, metadata] of Object.entries(lock.packages || {})) {
    if (packagePath && metadata.resolved) {
      assert.match(
        metadata.resolved,
        /^https:\/\/registry\.npmjs\.org\//,
        `${prefix}${packagePath} não veio do registro oficial`
      )
    }

    if (
      packagePath &&
      metadata.resolved?.startsWith('https://registry.npmjs.org/') &&
      !metadata.integrity
    ) {
      assert.fail(`${prefix}${packagePath} não possui hash de integridade`)
    }
  }
}

const workflow = fs.readFileSync(
  path.join(root, '.github', 'workflows', 'security.yml'),
  'utf8'
)
const actionReferences = [...workflow.matchAll(/uses:\s*[^@\s]+@([^\s#]+)/g)]

assert.ok(actionReferences.length > 0, 'Pipeline não possui Actions verificáveis')
for (const [, reference] of actionReferences) {
  assert.match(reference, /^[a-f0-9]{40}$/, `Action não fixada por hash: ${reference}`)
}

assert.match(workflow, /npm ci --ignore-scripts/)
assert.match(workflow, /npm audit --audit-level=low/)
assert.match(workflow, /npm sbom --sbom-format cyclonedx/)

const trackedDependencies = spawnSync(
  'git',
  ['ls-files', 'node_modules', 'backend/node_modules', 'frontend/node_modules'],
  { cwd: root, encoding: 'utf8' }
)

assert.equal(trackedDependencies.status, 0, trackedDependencies.stderr)
assert.equal(
  trackedDependencies.stdout.trim(),
  '',
  'node_modules não pode permanecer rastreado pelo Git'
)

console.log(
  JSON.stringify({
    status: 'ok',
    manifestsChecked: projects.length,
    actionsPinned: actionReferences.length,
    lockfileIntegrityChecked: true,
    trackedNodeModules: 0,
    sbomAutomation: true,
  })
)
