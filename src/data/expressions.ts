import { ExpressionVariant, DeferredCompositeState } from '../domain/types'

export const expressionVariants: ExpressionVariant[] = [
  {
    id: 'reference_expression_preserved',
    arabicLabel: 'الحفاظ على تعبير المرجع',
    englishName: 'reference_expression_preserved',
    userFacingMeaning: 'الحفاظ على التعبير كما في الصورة المرجعية',
    observableFacialConfiguration: 'expression as observed in reference',
    renderableFragment: 'Facial expression: preserve expression as observed in reference, no new emotion invention.',
    isDefault: true
  },
  {
    id: 'neutral_relaxed',
    arabicLabel: 'محايد مسترخي',
    englishName: 'neutral_relaxed',
    userFacingMeaning: 'وجه محايد مسترخي بفم مغلق',
    observableFacialConfiguration: 'neutral relaxed with closed mouth, soft eyelids',
    renderableFragment: 'Facial expression: neutral relaxed with closed mouth, soft eyelids, minimal muscle tension.',
    isDefault: false
  },
  {
    id: 'soft_closed_lip_smile',
    arabicLabel: 'ابتسامة خفيفة مغلقة',
    englishName: 'soft_closed_lip_smile',
    userFacingMeaning: 'ابتسامة خفيفة بفم مغلق',
    observableFacialConfiguration: 'soft closed-lip smile with slight cheek lift',
    renderableFragment: 'Facial expression: soft closed-lip smile with slight cheek lift, gentle mouth corner elevation.',
    isDefault: false
  },
  {
    id: 'sleepy_just_awake',
    arabicLabel: 'نعاس استيقاظ',
    englishName: 'sleepy_just_awake',
    userFacingMeaning: 'ملامح نعاس بعد الاستيقاظ مباشرة',
    observableFacialConfiguration: 'sleepy just awake with heavy lids and soft focus',
    renderableFragment: 'Facial expression: sleepy just awake with heavy lids, soft focus, relaxed lower face.',
    isDefault: false
  },
  {
    id: 'focused_concentration',
    arabicLabel: 'تركيز وانتباه',
    englishName: 'focused_concentration',
    userFacingMeaning: 'نظرة مركزة مع جبهة مستقرة',
    observableFacialConfiguration: 'focused concentration with steady gaze',
    renderableFragment: 'Facial expression: focused concentration with steady gaze, stable forehead, slight brow engagement.',
    isDefault: false
  },
  {
    id: 'mild_brow_interest',
    arabicLabel: 'فضول خفيف',
    englishName: 'mild_brow_interest',
    userFacingMeaning: 'فضول خفيف برفع حاجب طفيف',
    observableFacialConfiguration: 'mild curiosity with slight brow lift',
    renderableFragment: 'Facial expression: mild curiosity with slight brow lift, open eyes, neutral mouth.',
    isDefault: false
  },
  {
    id: 'restrained_amusement',
    arabicLabel: 'تسلية مكبوحة',
    englishName: 'restrained_amusement',
    userFacingMeaning: 'تسلية مكبوحة بابتسامة مضبوطة',
    observableFacialConfiguration: 'restrained amusement with suppressed smile',
    renderableFragment: 'Facial expression: restrained amusement with suppressed smile, light cheek tension, eyes engaged.',
    isDefault: false
  },
  {
    id: 'mild_surprise',
    arabicLabel: 'مفاجأة خفيفة',
    englishName: 'mild_surprise',
    userFacingMeaning: 'مفاجأة خفيفة باتساع عين محدود',
    observableFacialConfiguration: 'mild surprise with slight eye widening',
    renderableFragment: 'Facial expression: mild surprise with slight eye widening, brows slightly raised, mouth closed.',
    isDefault: false
  },
]

export const deferredCompositeStates: DeferredCompositeState[] = [
  {
    id: 'light_fatigue',
    arabicLabel: 'إرهاق خفيف',
    englishName: 'light_fatigue',
    userFacingMeaning: 'حالة مركبة مؤجلة تشمل إرهاق خفيف - غير متاحة حالياً',
    observableFacialConfiguration: 'DEFERRED COMPOSITE STATE - Arousal-Related',
    renderableFragment: 'DEFERRED',
    deferred: true,
    isSelectable: false,
    reason: 'حالة مركبة تشمل تعبيرات نعاس وإرهاق - مؤجلة حتى اكتمال أنظمة الجسم والإضاءة'
  },
]
