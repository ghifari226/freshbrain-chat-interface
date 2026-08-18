import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve('src')
const violations = []
const importPattern = /(?:from\s+|import\s*\()(['"])([^'"]+)\1/g

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return filesIn(absolutePath)
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [absolutePath] : []
  })
}

function layerFor(relativePath) {
  return relativePath.split(path.sep)[0]
}

function featureFor(relativePath) {
  const parts = relativePath.split(path.sep)
  return parts[0] === 'features' ? parts[1] : null
}

for (const absoluteFile of filesIn(sourceRoot)) {
  const relativeFile = path.relative(sourceRoot, absoluteFile)
  const sourceLayer = layerFor(relativeFile)
  const sourceFeature = featureFor(relativeFile)
  const source = fs.readFileSync(absoluteFile, 'utf8')

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[2]
    const featureMatch = specifier.match(/^@features\/([^/]+)(\/.*)?$/)
    if (featureMatch?.[2] && !/^\/[^/]+\.js$/.test(featureMatch[2])) {
      violations.push(`${relativeFile}: import lintas fitur harus melalui @features/${featureMatch[1]}`)
    }
    if (['core', 'shared', 'integrations'].includes(sourceLayer) && /^@(app|features)\//.test(specifier)) {
      violations.push(`${relativeFile}: ${sourceLayer} tidak boleh bergantung pada ${specifier}`)
    }
    if (sourceFeature && specifier.startsWith('@app/')) {
      violations.push(`${relativeFile}: fitur tidak boleh bergantung pada app`)
    }
    if (sourceFeature && specifier.startsWith('.')) {
      const target = path.normalize(path.join(path.dirname(relativeFile), specifier))
      const targetFeature = featureFor(target)
      if (targetFeature && targetFeature !== sourceFeature) {
        violations.push(`${relativeFile}: import relatif melintasi fitur menuju ${targetFeature}`)
      }
    }
  }
}

if (violations.length) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Architecture boundaries passed')
}
