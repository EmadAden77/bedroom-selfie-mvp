import { HairVariant } from '../domain/types'

export const hairVariants: HairVariant[] = [
  {
    id: 'reference_natural_dry',
    arabicLabel: 'الحفاظ على شعر المرجع',
    englishName: 'reference_natural_dry',
    userFacingMeaning: 'الحفاظ على الشعر كما يظهر في المرجع دون اختراع تسريحة',
    observableConfig: 'natural dry hair as observed, no styling invention',
    renderableFragment: 'Hair: natural dry hair as observed, no styling invention, preserving observed volume and strand direction.',
    isDefault: true
  },
  {
    id: 'natural_slightly_tousled',
    arabicLabel: 'شعر طبيعي مبعثر قليلاً',
    englishName: 'natural_slightly_tousled',
    userFacingMeaning: 'مظهر طبيعي مبعثر بدرجة خفيفة',
    observableConfig: 'slightly tousled natural dry with light volume displacement',
    renderableFragment: 'Hair: slightly tousled natural dry with light volume displacement, strands lightly displaced.',
    isDefault: false
  },
  {
    id: 'neatly_combed',
    arabicLabel: 'شعر مرتب',
    englishName: 'neatly_combed',
    userFacingMeaning: 'شعر مرتب بمحاذاة خصل مضبوطة',
    observableConfig: 'neatly combed with controlled strand alignment',
    renderableFragment: 'Hair: neatly combed with controlled strand alignment, smooth directional flow.',
    isDefault: false
  },
  {
    id: 'slightly_damp',
    arabicLabel: 'شعر رطب قليلاً',
    englishName: 'slightly_damp',
    userFacingMeaning: 'مظهر رطب خفيف مع تكتل خفيف',
    observableConfig: 'slightly damp appearance with reduced volume and slight clumping',
    renderableFragment: 'Hair: slightly damp appearance with reduced volume and slight clumping, darker strand grouping.',
    isDefault: false
  },
  {
    id: 'wind_blown_natural',
    arabicLabel: 'شعر متأثر بهواء خفيف',
    englishName: 'wind_blown_natural',
    userFacingMeaning: 'خصل متحركة باتجاه هواء خفيف',
    observableConfig: 'wind-displaced natural with directional strand movement',
    renderableFragment: 'Hair: wind-displaced natural with directional strand movement, light airflow effect.',
    isDefault: false
  },
  {
    id: 'just_woke_up_messy',
    arabicLabel: 'شعر استيقاظ فوضوي خفيف',
    englishName: 'just_woke_up_messy',
    userFacingMeaning: 'فوضى خفيفة من ملامسة النوم',
    observableConfig: 'just woke up with natural messy displacement from sleep contact',
    renderableFragment: 'Hair: just woke up with natural messy displacement from sleep contact, flattened zones and lift at crown.',
    isDefault: false
  },
  {
    id: 'low_volume_natural',
    arabicLabel: 'شعر منخفض الحجم طبيعي',
    englishName: 'low_volume_natural',
    userFacingMeaning: 'شعر قريب من فروة الرأس بحجم منخفض',
    observableConfig: 'low volume natural lying closer to scalp',
    renderableFragment: 'Hair: low volume natural lying closer to scalp, reduced lift.',
    isDefault: false
  },
]
