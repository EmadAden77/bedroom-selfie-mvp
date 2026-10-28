import type { CompilationContext } from '../domain/types'
export const gazeChoices=[
{id:'auto',label:'حسب التعبير',text:''},
{id:'lens',label:'نحو عدسة الكاميرا',text:'Pupils naturally track the camera lens; soft direct eye contact without an artificial fixed stare.'},
{id:'screen',label:'نحو شاشة الهاتف',text:'Eyes focus slightly below the lens on the visible phone screen. The head stays in its selected orientation.'},
{id:'off_left',label:'نظرة جانبية يسار',text:'Eyes glance subtly toward the subject left within natural ocular rotation.'},
{id:'off_right',label:'نظرة جانبية يمين',text:'Eyes glance subtly toward the subject right within natural ocular rotation.'},
{id:'down',label:'نظرة للأسفل',text:'Eyes glance downward with a modest upper-lid descent.'}
] as const
export const microChoices=[
{id:'none',label:'دون حركة إضافية',text:''},
{id:'wink_left',label:'غمزة بالعين اليسرى',text:'Left eyelids briefly close into one natural wink; the right eye stays open and attentive.'},
{id:'wink_right',label:'غمزة بالعين اليمنى',text:'Right eyelids briefly close into one natural wink; the left eye stays open and attentive.'},
{id:'brow_raise',label:'رفع حاجب خفيف',text:'Lift one brow a few millimeters with restrained asymmetry; preserve its actual shape and density.'},
{id:'micro_smile',label:'ابتسامة صغيرة',text:'Gently elevate both mouth corners with minimal cheek movement, retaining the original lip shape.'}
] as const
export function renderGazeMicro(ctx: CompilationContext): string {
 const gaze=gazeChoices.find(v=>v.id===(ctx.gazeId||'auto'))?.text||''
 const micro=microChoices.find(v=>v.id===(ctx.microExpressionId||'none'))?.text||''
 if(!gaze&&!micro)return ''
 const wink=ctx.microExpressionId==='wink_left'||ctx.microExpressionId==='wink_right'
 return ['GAZE AND MICRO EXPRESSION: '+(gaze||'Retain natural eye direction from the selected base expression.'),micro,
 wink?'During the wink, evaluate gaze direction using the open eye. No duplicated eyelids and no simultaneous closure of both eyes.':'Eyes remain anatomically aligned with the skull.',
 'Keep face identity, eye shape, eyelid anatomy, eyebrow density, mouth anatomy and natural asymmetry unchanged. These actions are temporary muscle movements, not a new face.',
 (ctx.promptTarget||'gemini')==='chatgpt'?'ChatGPT expression priority: make the selected micro movement visibly legible while keeping all other facial features consistent.':'Gemini expression priority: retain subtle muscle motion and natural imperfect symmetry.'
 ].filter(Boolean).join(' ')
}
