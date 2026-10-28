import type { CompilationContext } from '../../domain/types'
import { bedroomShots } from '../../data/bedroom-shots'

export type AuditStatus = 'pass' | 'fail' | 'unreviewed'
export type AuditCriterion = { id: string; label: string; expectation: string }
export type AuditRatings = Record<string, AuditStatus>

export function getAuditCriteria(ctx: CompilationContext): AuditCriterion[] {
  const shot = bedroomShots.find(s => s.id === ctx.bedroomShotId)
  const hair = ctx.hairstyleMode === 'apply' && ctx.hairVariantId !== 'reference_natural_dry'
    ? 'تغيير ترتيب الشعر بوضوح مع ثبات خط الشعر والكثافة'
    : 'الحفاظ على تسريحة الشعر المرجعية دون تغيير'
  return [
    { id: 'identity', label: 'ملامح الوجه', expectation: 'نفس ملامح الوجه والعمر واللحية والأنف والعينين كما في المرجع' },
    { id: 'hair', label: 'تسريحة الشعر', expectation: hair },
    { id: 'room', label: 'ثبات غرفة النوم', expectation: 'نفس السرير والأثاث والدولاب والستائر ومواقعها' },
    { id: 'pose', label: 'الجسم والوضعية', expectation: shot ? 'تطابق الوضعية المختارة: ' + shot.label : 'توافق الجسم مع الوضعية المختارة ونقاط الارتكاز' },
    { id: 'hands', label: 'اليد والأصابع', expectation: shot?.mode === 'timer' ? 'الهاتف ثابت وغير ممسوك، والأيدي طبيعية' : 'قبضة الهاتف والأصابع والذراعان متصلة وطبيعية' },
    { id: 'camera', label: 'الهاتف والمنظور', expectation: shot?.mode === 'mirror' ? 'iPhone 15 Pro Max Black Titanium بثلاث عدسات وانعكاس مرآة صحيح' : 'منظور هاتف واقعي بلا تشوه غير طبيعي' },
    { id: 'light', label: 'الإضاءة', expectation: 'الإضاءة والظلال متوافقة مع المصدر المختار: ' + (ctx.nightLightingId || 'phone_screen_only') },
    { id: 'clothing', label: 'الملابس', expectation: 'اللون والنوع والملاءمة والثنيات تحترم الاختيارات والجاذبية' }
  ]
}

export function summarizeAudit(criteria: AuditCriterion[], ratings: AuditRatings) {
  const passed = criteria.filter(c => ratings[c.id] === 'pass')
  const failed = criteria.filter(c => ratings[c.id] === 'fail')
  const unreviewed = criteria.filter(c => !ratings[c.id] || ratings[c.id] === 'unreviewed')
  return { passed: passed.length, failed: failed.length, unreviewed: unreviewed.length, complete: unreviewed.length === 0, failedCriteria: failed }
}

export function formatAuditFeedback(ctx: CompilationContext, ratings: AuditRatings, note: string): string {
  const criteria = getAuditCriteria(ctx)
  const summary = summarizeAudit(criteria, ratings)
  const rows = criteria.map(c => {
    const state = ratings[c.id] === 'pass' ? 'PASS' : ratings[c.id] === 'fail' ? 'FAIL' : 'NOT REVIEWED'
    return '- ' + c.label + ' [' + state + ']: ' + c.expectation
  })
  return [
    'PHOTO RESULT AUDIT — MANUAL REVIEW',
    'Generator: ' + (ctx.promptTarget || 'gemini'),
    'Shot: ' + (ctx.bedroomShotId || 'custom'),
    'Results: ' + summary.passed + ' pass, ' + summary.failed + ' fail, ' + summary.unreviewed + ' unreviewed',
    ...rows,
    'Notes: ' + (note.trim() || '—'),
    'This is a user-reviewed checklist, not an automated image recognition assessment.'
  ].join('\n')
}
