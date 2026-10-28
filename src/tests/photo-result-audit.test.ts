import { describe, it, expect } from 'vitest'
import { getAuditCriteria, summarizeAudit, formatAuditFeedback } from '../features/photo-result-audit/audit'
import type { CompilationContext } from '../domain/types'
import { bedroomShots } from '../data/bedroom-shots'

const ctx: CompilationContext = {
 hairVariantId:'neatly_combed', hairstyleMode:'apply',promptTarget:'chatgpt',
 expressionVariantId:'neutral_relaxed',upperGarmentId:'regular_crewneck_tshirt',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'lightly_worn',
 color:'white',surface:'solid',referenceImagePresent:true,bedroomShotId:'mirror_face_phone'
}

describe('Photo Result Audit',()=>{
  it('maps mirror phone and selected hairstyle into review expectations',()=>{
    const checks=getAuditCriteria(ctx)
    expect(checks).toHaveLength(8)
    expect(checks.find(c=>c.id==='camera')?.expectation).toContain('iPhone 15 Pro Max')
    expect(checks.find(c=>c.id==='hair')?.expectation).toContain('تغيير')
  })
  it('uses existing reference hairstyle for preserve mode',()=>{
    const checks=getAuditCriteria({...ctx,hairstyleMode:'preserve'})
    expect(checks.find(c=>c.id==='hair')?.expectation).toContain('الحفاظ')
  })
  it('timer mode expects a supported phone, not one held by hand',()=>{
    const timer=bedroomShots.find(s=>s.mode==='timer')
    expect(timer).toBeDefined()
    const checks=getAuditCriteria({...ctx,bedroomShotId:timer!.id})
    expect(checks.find(c=>c.id==='hands')?.expectation).toContain('غير ممسوك')
  })
  it('requires each criterion to be reviewed for complete status',()=>{
    const checks=getAuditCriteria(ctx)
    const empty=summarizeAudit(checks,{})
    expect(empty.complete).toBe(false)
    expect(empty.unreviewed).toBe(8)
    const ratings: Record<string, 'pass' | 'fail' | 'unreviewed'>=Object.fromEntries(checks.map(c=>[c.id,'pass' as const]))
    ratings['hair']='fail'
    const result=summarizeAudit(checks,ratings)
    expect(result).toMatchObject({passed:7,failed:1,unreviewed:0,complete:true})
    expect(result.failedCriteria[0].id).toBe('hair')
  })
  it('generates a readable review report with clear manual-review provenance',()=>{
    const report=formatAuditFeedback(ctx,{identity:'pass',hair:'fail'},'الشعر لم يتغير')
    expect(report).toContain('Generator: chatgpt')
    expect(report).toContain('تسريحة الشعر')
    expect(report).toContain('الشعر لم يتغير')
    expect(report).toContain('NOT REVIEWED')
    expect(report).toContain('not an automated image recognition assessment')
  })
  it.each(bedroomShots)('keeps eight criteria for $id',shot=>{
    const checks=getAuditCriteria({...ctx,bedroomShotId:shot.id})
    expect(checks.map(c=>c.id)).toEqual(['identity','hair','room','pose','hands','camera','light','clothing'])
    expect(checks.find(c=>c.id==='pose')?.expectation).toContain(shot.label)
  })
})
