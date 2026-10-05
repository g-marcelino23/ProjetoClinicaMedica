const fs = require('fs')
const path = require('path')

const backendRoot = path.resolve(__dirname, '..', 'src')
const frontendRoot = path.resolve(__dirname, '..', '..', 'frontend', 'src')

const collectFiles = (directory, extensions) => {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(fullPath, extensions))
    if (
      entry.isFile() &&
      extensions.some((extension) => entry.name.endsWith(extension))
    ) {
      files.push(fullPath)
    }
  }
  return files
}

const files = [
  ...collectFiles(backendRoot, ['.js']),
  ...collectFiles(frontendRoot, ['.js', '.jsx']),
]

const forbiddenPatterns = [
  { pattern: /\beval\s*\(/, label: 'eval' },
  { pattern: /\bnew\s+Function\s*\(/, label: 'new Function' },
  { pattern: /child_process/, label: 'child_process' },
  { pattern: /dangerouslySetInnerHTML/, label: 'dangerouslySetInnerHTML' },
  { pattern: /\.innerHTML\s*=/, label: 'innerHTML assignment' },
  { pattern: /insertAdjacentHTML/, label: 'insertAdjacentHTML' },
  { pattern: /document\.write\s*\(/, label: 'document.write' },
  {
    pattern: /\$\{\s*req\.(?:body|query|params)/,
    label: 'request data interpolated into a template',
  },
  {
    pattern: /\.query\s*\(\s*query\s*[,)]/,
    label: 'runtime-composed SQL query variable',
  },
  { pattern: /\bquery\s*\+=/, label: 'SQL query concatenation' },
]

const violations = []
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(source)) {
      violations.push(
        `${path.relative(path.resolve(__dirname, '..', '..'), file)}: ${rule.label}`
      )
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Superfícies inseguras encontradas:\n${violations.join('\n')}`)
}

const reportRoutes = fs.readFileSync(
  path.join(backendRoot, 'routes', 'relatorioRoutes.js'),
  'utf8'
)
const indicatorRoutes = fs.readFileSync(
  path.join(backendRoot, 'routes', 'indicadorRoutes.js'),
  'utf8'
)

if ((reportRoutes.match(/validate\(schemas\.reports\./g) || []).length !== 3) {
  throw new Error('Todas as rotas de relatório devem validar os filtros')
}
if (!indicatorRoutes.includes('validate(schemas.indicators.list)')) {
  throw new Error('A rota de indicadores deve validar os filtros')
}

console.log(
  JSON.stringify({
    status: 'ok',
    runtimeFilesChecked: files.length,
    dangerousInterpreterSinks: 0,
    directRequestSqlInterpolations: 0,
    dynamicallyConcatenatedRuntimeQueries: 0,
    validatedReportAndIndicatorRoutes: 4,
  })
)
