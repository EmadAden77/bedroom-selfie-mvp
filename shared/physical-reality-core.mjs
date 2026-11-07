/** Deterministic camera/light compatibility contract shared by the browser and Vercel.
 * Standalone ESM with no transitive source imports, Node polyfills or network access.
 * Return only established contradictions. Missing dimensions remain UNKNOWN elsewhere.
 */
export function captureLightingIssuesCore(shotId, mode, lighting){
 const issues=[]
 if(shotId==='mirror_rear_flash'&&lighting!=='rear_flash')
  issues.push('وضعية فلاش المرآة تحتاج فلاش الكاميرا الخلفية.')
 if(lighting==='laptop_screen_only'&&!(shotId.startsWith('laptop_')&&shotId!=='laptop_reflection'))
  issues.push('إضاءة شاشة اللابتوب تتطلب وضعية لابتوب حقيقية.')
 if(lighting==='rear_flash'&&mode!=='rear'&&mode!=='mirror')
  issues.push('فلاش الكاميرا الخلفية لا يناسب السيلفي الأمامي أو المؤقت؛ اختر تصويرًا خلفيًا أو مرآة.')
 if(lighting==='phone_screen_only'&&mode==='rear')
  issues.push('شاشة الهاتف المواجهة بعيدًا عن الشخص لا يمكن أن تكون المصدر الوحيد لإضاءة سيلفي الكاميرا الخلفية.')
 return issues
}
