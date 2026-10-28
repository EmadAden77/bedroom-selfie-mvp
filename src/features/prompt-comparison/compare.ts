import type { CompilationContext, PromptSection } from '../../domain/types'
import { compilePrompt } from '../../compiler'

export type TargetComparison = {
  gemini: ReturnType<typeof compilePrompt>
  chatgpt: ReturnType<typeof compilePrompt>
  differences: { id:string; gemini:string; chatgpt:string }[]
  sharedCount: number
}

export function compareTargets(ctx:CompilationContext):TargetComparison {
  const gemini=compilePrompt({...ctx,promptTarget:'gemini'})
  const chatgpt=compilePrompt({...ctx,promptTarget:'chatgpt'})
  const left=new Map(gemini.result.sections.map((s:PromptSection)=>[s.id,s.content]))
  const right=new Map(chatgpt.result.sections.map((s:PromptSection)=>[s.id,s.content]))
  const ids=new Set([...left.keys(),...right.keys()])
  const differences=[...ids].filter(id=>left.get(id)!==right.get(id))
    .map(id=>({id,gemini:left.get(id)||'غير موجود',chatgpt:right.get(id)||'غير موجود'}))
  return {
    gemini,chatgpt,differences,
    sharedCount:[...ids].filter(id=>left.has(id)&&left.get(id)===right.get(id)).length
  }
}

export function isCopyable(out:ReturnType<typeof compilePrompt>):boolean {
 return out.validation.isValid && out.result.errors.length===0 && out.result.promptText.trim().length>0
}
