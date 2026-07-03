// ===== أدوات الصور: قراءة ملف وتصغيره إلى dataURL =====
// المنصة بلا خادم — الصور تُخزَّن dataURL في localStorage، فالتصغير إلزامي.

/** يقرأ ملف صورة ويعيده dataURL (JPEG) مُصغّرًا بحيث لا يتجاوز أطول ضلع maxSize */
export function fileToDataUrl(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale)
        c.height = Math.round(img.height * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('تعذّر فك ترميز الصورة'))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
