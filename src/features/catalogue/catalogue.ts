import { supabase } from '../../lib/supabase/client';

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
};

export type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
};

export type ProductVariant = {
  id: string;
  name: string;
  value: string;
  hexColor: string | null;
  priceDelta: number;
  stockQty: number;
  sku: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  basePrice: number;
  comparePrice: number | null;
  isFeatured: boolean;
  isNew: boolean;
  badge: string | null;
  stockQty: number;
  published: boolean;
  createdAt: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  description,
  category_id,
  base_price,
  compare_price,
  is_featured,
  is_new,
  badge,
  stock_qty,
  published,
  created_at,
  categories (
    id,
    name,
    slug
  ),
  product_images (
    id,
    url,
    alt_text,
    sort_order
  ),
  product_variants (
    id,
    name,
    value,
    hex_color,
    price_delta,
    stock_qty,
    sku
  )
` as const;

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, parent_id, sort_order')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.image_url,
    parentId: category.parent_id,
    sortOrder: category.sort_order ?? 0,
  }));
}

type ProductRow = NonNullable<
  Awaited<ReturnType<typeof productQuery>>['data']
>[number];

function productQuery() {
  return supabase.from('products').select(PRODUCT_SELECT).eq('published', true);
}

function mapProduct(product: ProductRow): Product {
  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.category_id,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    basePrice: Number(product.base_price),
    comparePrice:
      product.compare_price === null ? null : Number(product.compare_price),
    isFeatured: product.is_featured ?? false,
    isNew: product.is_new ?? false,
    badge: product.badge,
    stockQty: product.stock_qty,
    published: product.published ?? false,
    createdAt: product.created_at,
    images: [...(product.product_images ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.alt_text,
        sortOrder: image.sort_order ?? 0,
      })),
    variants: (product.product_variants ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      value: variant.value,
      hexColor: variant.hex_color,
      priceDelta: Number(variant.price_delta ?? 0),
      stockQty: variant.stock_qty,
      sku: variant.sku,
    })),
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await productQuery().order('created_at', {
    ascending: false,
  });

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data ?? []).map(mapProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await productQuery().eq('id', id).maybeSingle();

  if (error) {
    throw new Error(`Failed to load product: ${error.message}`);
  }

  return data ? mapProduct(data) : null;
}