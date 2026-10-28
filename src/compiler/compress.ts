
import { PromptSection } from '../domain/types'

export function compressSections(sections: PromptSection[]): PromptSection[] {
  const seen = new Set<string>()
  const deduped: PromptSection[] = []
  for (const sec of sections) {
    if (sec.id.includes('guard')) {
      if (seen.has(sec.id)) {
        continue // skip duplicate guards
      }
      seen.add(sec.id)
    }
    deduped.push(sec)
  }
  return deduped
}
