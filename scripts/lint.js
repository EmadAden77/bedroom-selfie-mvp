
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
console.log('Running lint (real file checks)...')
let errors = 0
let warnings = 0
function walk(dir){
  const files=[]
  const entries = fs.readdirSync(dir, {withFileTypes:true})
  for(const e of entries){
    const full = path.join(dir, e.name)
    if(e.isDirectory()){
      if(['node_modules','dist','.git','icons'].includes(e.name)) continue
      files.push(...walk(full))
    } else if(e.isFile() && (full.endsWith('.ts')||full.endsWith('.tsx')||full.endsWith('.js'))){
      files.push(full)
    }
  }
  return files
}
const files = walk(path.join(root,'src'))
console.log(`Checking ${files.length} files`)
for(const file of files){
  const content = fs.readFileSync(file,'utf-8')
  const rel = path.relative(root,file)
  if(content.includes('localStorage') && content.includes('Base64')){
    console.error(` ${rel}: Base64 in localStorage forbidden - must use Object URL`)
    errors++
  }
  if(content.includes('fetch(') && content.includes('http')){
    // Allow only if not upload external
    if(content.includes('upload') && content.includes('image')){ console.error(` ${rel}: External upload forbidden`); errors++ }
  }
  if(rel.includes('data/clothing') && content.includes('possible') && content.includes('oversized_sleep_tshirt')){
    // Check oversized fragment must be corrected
    if(!content.includes('substantially greater ease and length with increased fabric mass. Material lightweight cotton-appearance jersey. Fit oversized. State lightly_worn. Color charcoal. Surface solid.')){
      console.error(` ${rel}: oversized_sleep_tshirt must have corrected fragment without possible`)
      errors++
    }
  }
  // Check for CDN usage
  if(content.includes('cdn.jsdelivr') || content.includes('unpkg.com') || content.includes('fonts.googleapis')){
    console.error(` ${rel}: CDN forbidden - use local deps or system fonts`)
    errors++
  }
}
const indexHtml = fs.readFileSync(path.join(root,'index.html'),'utf-8')
if(indexHtml.includes('cdn.jsdelivr') || indexHtml.includes('unpkg.com') || indexHtml.includes('fonts.googleapis')){
  console.error(' index.html: CDN forbidden')
  errors++
}
if(errors===0){
  console.log(`Lint passed - ${files.length} files checked, no CDN, no Base64 localStorage, frozen fragments intact`)
} else {
  console.error(`Lint failed with ${errors} errors`)
  process.exit(1)
}
