
export function validateImageFile(file: File): { valid: boolean, message: string } {
  const allowedTypes = ['image/jpeg','image/png','image/webp','image/heic','image/heif']
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!file.type.startsWith('image/')) {
    return { valid: false, message: 'نوع الملف غير مدعوم - يرجى اختيار صورة فقط (JPEG, PNG, WebP)' }
  }
  if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
    // Still allow generic image/* but warn
  }
  if (file.size > maxSize) {
    return { valid: false, message: `حجم الصورة كبير جدا (${(file.size/1024/1024).toFixed(1)}MB) - الحد الأقصى 10MB` }
  }
  if (file.size < 1024) {
    return { valid: false, message: 'الملف صغير جدا أو تالف' }
  }
  return { valid: true, message: '' }
}
