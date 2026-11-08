import {LIGHTING_FRAGMENTS,type LightingOption} from '../../shared/lighting-decision'
export type NightLightingPreset = {
 id:LightingOption; arabicLabel:string; description:string; renderableFragment:string
}
/** Exactly four choices; all assume a blacked-out room and one active emitter. */
export const nightLightingPresets:readonly NightLightingPreset[]=[
 {id:'led_spotlight',arabicLabel:'سبوت لايت LED أبيض واحد',description:'سبوت سقفي واحد؛ شعاع محدد وظلال واقعية، دون مصادر أخرى',renderableFragment:LIGHTING_FRAGMENTS.led_spotlight},
 {id:'camera_flash',arabicLabel:'فلاش الكاميرا الخلفية فقط',description:'فلاش الهاتف الحقيقي أثناء التعريض، مع انعكاس المرآة عند الحاجة',renderableFragment:LIGHTING_FRAGMENTS.camera_flash},
 {id:'phone_screen',arabicLabel:'إضاءة شاشة الهاتف فقط',description:'ضوء شاشة ضعيف على الوجه يتلاشى نحو الجسم والخلفية',renderableFragment:LIGHTING_FRAGMENTS.phone_screen},
 {id:'laptop_screen',arabicLabel:'إضاءة شاشة اللابتوب فقط',description:'شاشة لابتوب حقيقية مثبتة على سطح؛ وهج محدود المدى',renderableFragment:LIGHTING_FRAGMENTS.laptop_screen}
]
