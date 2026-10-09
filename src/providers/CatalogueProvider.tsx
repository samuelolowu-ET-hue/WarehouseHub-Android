import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { displayError } from '../lib/errors';
import {
  getCategories,
  getProducts,
  type Category,
  type Product,
} from '../features/catalogue/catalogue';

type CatalogueContextValue = {
  categories: Category[];
  products: Product[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
};

const CatalogueContext = createContext<CatalogueContextValue | undefined>(undefined);

/**
 * Loads the public catalogue once and shares it across Home, Shop and
 * Product screens, avoiding duplicate Supabase queries. Works without login.
 */
export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [categoryData, productData] = await Promise.all([getCategories(), getProducts()]);

      if (mounted.current) {
        setCategories(categoryData);
        setProducts(productData);
      }
    } catch (err) {
      if (mounted.current) {
        setError(displayError(err, 'We couldn’t load the catalogue. Please try again.'));
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load('initial');

    return () => {
      mounted.current = false;
    };
  }, [load]);

  const reload = useCallback(() => load('initial'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const getProduct = useCallback((id: string) => productMap.get(id), [productMap]);

  const value = useMemo(
    () => ({ categories, products, loading, refreshing, error, reload, refresh, getProduct }),
    [categories, products, loading, refreshing, error, reload, refresh, getProduct]
  );

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue() {
  const context = useContext(CatalogueContext);

  if (!context) {
    throw new Error('useCatalogue must be used inside CatalogueProvider.');
  }

  return context;
}
