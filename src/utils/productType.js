export const PRODUCT_TYPE_SHOES = 'shoes'
export const PRODUCT_TYPE_OTHER = 'other'

export const PRODUCT_TYPES = [
  { id: PRODUCT_TYPE_SHOES, label: 'Shoes', stockUnit: 'pairs' },
  { id: PRODUCT_TYPE_OTHER, label: 'Other (Bag, Socks, etc.)', stockUnit: 'pcs' }
]

export function isShoeProduct(product) {
  return inferProductType(product) === PRODUCT_TYPE_SHOES
}

export function inferProductType(product) {
  if (product?.product_type === PRODUCT_TYPE_OTHER) return PRODUCT_TYPE_OTHER
  if (product?.product_type === PRODUCT_TYPE_SHOES) return PRODUCT_TYPE_SHOES
  return PRODUCT_TYPE_SHOES
}

export function getStockUnit(product) {
  return isShoeProduct(product) ? 'pairs' : 'pcs'
}
