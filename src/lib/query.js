// { type: 'entreprise', solde: '', q: 'abc' } -> "?type=entreprise&q=abc" (les valeurs vides sont ignorées)
export function toQuery(params) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') sp.set(k, String(v).trim())
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}
