import type { CompilationContext } from '../domain/types'
export const realismPresets = [
{id:'natural',label:'طبيعي',description:'صورة جوال طبيعية دون مبالغة في المعالجة',fragment:'REALISM INTENSITY — NATURAL: Ordinary phone exposure, restrained computational HDR, credible white balance and fine sensor grain only when actual lighting requires it. Maintain natural skin texture and imperfect everyday framing.'},
{id:'candid',label:'عفوي',description:'تكوين غير مثالي وتفاصيل تصوير عفوية',fragment:'REALISM INTENSITY — CANDID: Natural handheld framing slightly off center, a small credible camera tilt, modest automatic exposure variation and fine noise tied to the selected light source. Keep face focus naturally sharp. Avoid staged symmetry and artificial blur.'},
{id:'raw',label:'خام جدًا',description:'معالجة جوال أقل وملمس خام متزن',fragment:'REALISM INTENSITY — RAW PHONE: Restrained local sharpening and tone mapping, authentic shadow detail loss in dim areas, gentle luminance noise and modest JPEG texture at genuine high ISO. Retain a recognizable face. No excessive grain overlays, blown highlights, motion smears, cinematic grading and fake lens dirt.'}
] as const
export function renderRealismIntensity(ctx: CompilationContext): string {
 const preset=realismPresets.find(p=>p.id===(ctx.realismIntensity || 'natural')) || realismPresets[0]
 const restyled=ctx.hairstyleMode==='apply'&&ctx.hairVariantId!=='reference_natural_dry'
 const hairRule=restyled
  ? 'The selected restyling must remain visibly applied in the photograph; do not revert to the reference hairstyle. Preserve the actual hairline, natural fiber texture, scalp coverage and original hair density.'
  : 'Preserve the reference hairstyle and its existing strand arrangement.'
 return [preset.fragment,hairRule,'Realism changes only photographic processing and camera imperfections. Never alter facial identity, body geometry, room topology, bedding objects, light-source locations, perspective and physical contact.'].join(' ')
}
