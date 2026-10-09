import type { Product, ProductVariant } from './catalogue';

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

export type CatalogueQuery = {
  search?: string;
  categoryId?: string | null;
  sort?: SortOption;
  inStockOnly?: boolean;
};

export function filterProducts(products: Product[], query: CatalogueQuery): Product[] {
  const term = (query.search ?? '').trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (query.categoryId && product.categoryId !== query.categoryId) {
      return false;
    }

    if (query.inStockOnly && getAvailableStock(product) <= 0) {
      return false;
    }

    if (!term) {
      return true;
    }

    const haystack = [
      product.name,
      product.description ?? '',
      product.categoryName ?? '',
      product.badge ?? '',
      ...product.variants.map((variant) => `${variant.value} ${variant.sku ?? ''}`),
    ]
      .join(' ')
      .toLowerCase();

    return term.split(/\s+/).every((word) => haystack.includes(word));
  });

  return sortProducts(filtered, query.sort ?? 'featured');
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const list = [...products];

  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => getFromPrice(a) - getFromPrice(b));
    case 'price-desc':
      return list.sort((a, b) => getFromPrice(b) - getFromPrice(a));
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
      return list.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
    case 'featured':
    default:
      return list.sort((a, b) => {
        const rank = Number(b.isFeatured) - Number(a.isFeatured);
        if (rank !== 0) {
          return rank;
        }
        const fresh = Number(b.isNew) - Number(a.isNew);
        return fresh !== 0 ? fresh : timeOf(b.createdAt) - timeOf(a.createdAt);
      });
  }
}

/** Unit price for a product + optional variant. Display-only: the server recomputes at checkout. */
export function getUnitPrice(product: Product, variant: ProductVariant | null | undefined): number {
  return Math.round((product.basePrice + (variant?.priceDelta ?? 0)) * 100) / 100;
}

/** Lowest purchasable price, used for "from" pricing and sorting. */
export function getFromPrice(product: Product): number {
  if (product.variants.length === 0) {
    return product.basePrice;
  }

  return Math.min(...product.variants.map((variant) => getUnitPrice(product, variant)));
}

export function hasPriceRange(product: Product): boolean {
  return product.variants.some((variant) => variant.priceDelta !== 0);
}

/**
 * Stock available for a selection. If the product has variants, stock is
 * tracked per variant; otherwise the product-level stock applies.
 */
export function getSelectionStock(product: Product, variant: ProductVariant | null | undefined): number {
  if (variant) {
    return Math.max(0, variant.stockQty);
  }

  return product.variants.length > 0 ? 0 : Math.max(0, product.stockQty);
}

export function getAvailableStock(product: Product): number {
  if (product.variants.length === 0) {
    return Math.max(0, product.stockQty);
  }

  return product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stockQty), 0);
}

/** Groups variants by option name, e.g. { Colour: [...], Size: [...] }. */
export function groupVariants(variants: ProductVariant[]): { name: string; options: ProductVariant[] }[] {
  const groups = new Map<string, ProductVariant[]>();

  for (const variant of variants) {
    const list = groups.get(variant.name) ?? [];
    list.push(variant);
    groups.set(variant.name, list);
  }

  return [...groups.entries()].map(([name, options]) => ({ name, options }));
}

/** First in-stock variant, falling back to the first variant. */
export function defaultVariant(product: Product): ProductVariant | null {
  if (product.variants.length === 0) {
    return null;
  }

  return product.variants.find((variant) => variant.stockQty > 0) ?? product.variants[0];
}

function timeOf(iso: string | null): number {
  const value = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(value) ? 0 : value;
}
