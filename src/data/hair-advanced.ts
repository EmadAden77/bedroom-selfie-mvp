import type { CompilationContext } from '../domain/types'
export const hairDirections = [
 {id:'auto',label:'حسب التسريحة',text:''},
 {id:'back',label:'للخلف',text:'Direct the existing strands backward, exposing the natural front hairline.'},
 {id:'forward',label:'للأمام',text:'Bring existing front strands forward into a natural fringe across part of the forehead.'},
 {id:'left',label:'إلى يسار الشخص',text:'Sweep existing top strands toward the subject left with a natural side part.'},
 {id:'right',label:'إلى يمين الشخص',text:'Sweep existing top strands toward the subject right with a natural side part.'}
] as const
export const hairVolumes = [
 {id:'auto',label:'طبيعي حسب التسريحة',text:''},
 {id:'flat',label:'منخفض',text:'Keep the existing hair close to the scalp with restrained root lift.'},
 {id:'natural',label:'متوسط طبيعي',text:'Use natural volume with mild irregular lift at the roots.'},
 {id:'lifted',label:'مرتفع قليلًا',text:'Lift the existing top strands modestly at the roots, without increasing hair density.'}
] as const
export const hairTextures = [
 {id:'auto',label:'حسب التسريحة',text:''},
 {id:'tidy',label:'مرتب',text:'Align existing strands with realistic small flyaways.'},
 {id:'soft',label:'مبعثر قليلًا',text:'Displace small groups of strands irregularly with mild natural messiness.'},
 {id:'messy',label:'مبعثر بوضوح',text:'Use visibly uneven strand directions and sleep-like natural displacement without adding hair.'}
] as const
export function renderAdvancedHair(ctx: CompilationContext): string {
 if ((ctx.hairstyleMode || 'preserve') !== 'apply' || ctx.hairVariantId === 'reference_natural_dry') return ''
 const direction=hairDirections.find(x=>x.id===(ctx.hairDirection || 'auto'))?.text || ''
 const volume=hairVolumes.find(x=>x.id===(ctx.hairVolume || 'auto'))?.text || ''
 const texture=hairTextures.find(x=>x.id===(ctx.hairTexture || 'auto'))?.text || ''
 const instructions=[direction,volume,texture].filter(Boolean)
 if (!instructions.length) return ''
 return ['ADVANCED HAIRSTYLE CONTROL: Apply the user-selected styling changes visibly to existing hair strands only.',...instructions,'Preserve the original hairline, skull geometry, natural color, density, hair fiber texture and facial identity. Natural gravity governs strand placement.'].join(' ')
}
