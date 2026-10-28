
import { PromptSection } from '../domain/types'

const internalMetadataKeys = ['courseBehavior','waleBehavior','anisotropy','recovery','hysteresis','loadHistory','compressionSet','wrinkleMemory','bendingStiffness','physicsMetadata']

export function stripInternalMetadata(sections: PromptSection[]): PromptSection[] {
  return sections.map(sec => {
    let content = sec.content
    // Ensure no internal metadata leaks
    for (const key of internalMetadataKeys) {
      if (content.toLowerCase().includes(key.toLowerCase())) {
        console.warn(`Stripping internal metadata ${key} from ${sec.id}`)
        content = content.replace(new RegExp(key, 'gi'), '')
      }
    }
    return { ...sec, content }
  }).filter(sec => sec.content.trim().length > 0)
}
