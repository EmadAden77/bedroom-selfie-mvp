
export const hairIdentityGuard = {
  id: 'hair_identity_guard',
  fragment: `Hair identity guard: Preserve head geometry, hairline, density distribution, natural asymmetry.`
}

export const facialIdentityGuard = {
  id: 'facial_identity_guard',
  fragment: `Facial identity guard: Preserve facial identity anchored to reference: maintain head and face geometry and proportions, forehead structure, eye size, shape, inter-eye distance, basic eyelid structure, eyebrow shape and density, nose width tip nostril shape, underlying mouth anatomy and lip proportions, cheek and cheekbone structure, jaw chin ear structure, natural asymmetry, apparent age, beard and mustache distribution. Allow only temporary expression-driven displacement of mouth corners within natural range.`
}

export const clothingOutputGuard = {
  id: 'clothing_output_guard',
  fragment: `Clothing output guard: Render clothing with physically plausible deformation, respecting gravity, contact, fabric weight. No invented logos, text, transparency. No decorative folds without force source. Rib lines deform with stretch. Collar responds to tension. Hood has weight, thickness, seams, drawstrings when present.`
}

export const referenceIdentityFragment = "Reference identity anchored to reference image: preserve same person, no identity drift."
