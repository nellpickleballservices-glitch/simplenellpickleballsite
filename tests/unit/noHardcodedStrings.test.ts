import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

function findTsxFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      return findTsxFiles(full)
    }
    return entry.name.endsWith('.tsx') ? [full] : []
  })
}

describe('No hardcoded UI strings (I18N-02)', () => {
  it('no .tsx files contain TODO: i18n comments', () => {
    const appDir = join(process.cwd(), 'app')
    const files = findTsxFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      // Check for both comment styles: {/* TODO: i18n */} (JSX) and // TODO: i18n (TS)
      if (content.includes('TODO: i18n')) {
        violations.push(file.replace(process.cwd(), ''))
      }
    }

    expect(violations, `Files still have hardcoded strings:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
