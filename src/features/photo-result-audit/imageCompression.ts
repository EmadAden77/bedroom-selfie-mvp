/** Downsize image references in browser memory before an explicit opted-in Gemini upload. */
export async function compressForAudit(objectUrl:string):Promise<string>{
 const response=await fetch(objectUrl)
 if(!response.ok)throw Error('تعذر قراءة الصورة المرفوعة.')
 const blob=await response.blob()
 if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>15*1024*1024)
  throw Error('اختر صورة JPG أو PNG أو WebP بحجم لا يزيد عن 15 ميجابايت.')
 const pictureUrl=URL.createObjectURL(blob)
 let img:HTMLImageElement
 try{
  img=await new Promise<HTMLImageElement>((resolve,reject)=>{
   const picture=new Image()
   picture.onload=()=>resolve(picture)
   picture.onerror=()=>reject(Error('تعذر فتح الصورة.'))
   picture.src=pictureUrl
  })
  if(img.naturalWidth<16||img.naturalHeight<16)throw Error('الصورة صغيرة للغاية.')
  let edge=1280
  for(let attempt=0;attempt<4;attempt++){
   const scale=Math.min(1,edge/Math.max(img.naturalWidth,img.naturalHeight))
   const canvas=document.createElement('canvas')
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale))
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale))
   const ctx=canvas.getContext('2d')
   if(!ctx)throw Error('متصفحك لا يدعم تجهيز الصور للتحليل.')
   ctx.fillStyle='#ffffff'
   ctx.fillRect(0,0,canvas.width,canvas.height)
   ctx.drawImage(img,0,0,canvas.width,canvas.height)
   const data=canvas.toDataURL('image/jpeg',attempt===0?0.8:0.68)
   if(data.length<=1400000)return data
   edge=Math.round(edge*0.72)
  }
  throw Error('الصورة لا تزال كبيرة. جرّب ملفًا أصغر.')
 }finally{URL.revokeObjectURL(pictureUrl)}
}
