import React, { createContext, useState, useContext, type ReactNode } from 'react';
import API from '../services/api';
import { BASE_URL } from '../services/api';
import Swal from 'sweetalert2';

export interface Product {
  id: string;
  display_id?: string;
  image: string | File;
  title: string;
  category: string;
  price: number;
  offer: number;
  tax_slab?: number;
  admin_commission?: number;
  stock: number;
  description?: string;
  status: 'Active' | 'Inactive';
}

interface ProductContextType {
  products: Product[];
  fetchProducts: (params?: any) => Promise<any>;
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updatedFields: Partial<Product>) => void;
  toggleProductStatus: (id: string) => void;
  deleteProduct: (id: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
};

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProducts = async (params: any = {}) => {
    setIsLoading(true);
    try {
      const response = await API.get('/vendor/products', { params });
      const productArray = response.data.data || response.data;
      const mappedProducts = productArray.map((p: any) => ({
        id: p.id,
        display_id: p.display_id,
        image: p.banner ? (p.banner.startsWith('/uploads/') ? `${BASE_URL}${p.banner}` : p.banner) : 'https://placehold.co/60x40/png',
        title: p.name,
        category: p.category,
        price: p.base_price,
        offer: p.discount,
        tax_slab: p.tax_slab != null ? Number(p.tax_slab) : 18,
        admin_commission: p.admin_commission,
        stock: p.stock,
        description: p.description || '',
        status: p.status === 'Active' || p.status === 'In Stock' ? 'Active' : 'Inactive',
      }));
      setProducts(mappedProducts);
      return response.data.pagination;
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = async (newProduct: Omit<Product, 'id'>) => {
    try {
      const formData = new FormData();
      formData.append('name', newProduct.title);
      formData.append('category', newProduct.category);
      formData.append('base_price', newProduct.price.toString());
      if (newProduct.tax_slab !== undefined) formData.append('tax_slab', newProduct.tax_slab.toString());
      if (newProduct.admin_commission !== undefined) formData.append('admin_commission', newProduct.admin_commission.toString());
      formData.append('stock', newProduct.stock.toString());
      formData.append('discount', newProduct.offer.toString());
      if (newProduct.description) formData.append('description', newProduct.description);
      formData.append('status', newProduct.status);
      
      if (newProduct.image instanceof File) {
        formData.append('banner', newProduct.image);
      } else if (typeof newProduct.image === 'string') {
        formData.append('banner', newProduct.image);
      }

      await API.post('/vendor/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchProducts();
      Swal.fire('Success', 'Product added successfully', 'success');
    } catch (error: any) {
      console.error('Failed to add product:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to add product', 'error');
    }
  };

  const updateProduct = async (id: string, updatedFields: Partial<Product>) => {
    try {
      const formData = new FormData();
      if (updatedFields.title) formData.append('name', updatedFields.title);
      if (updatedFields.category) formData.append('category', updatedFields.category);
      if (updatedFields.price !== undefined) formData.append('base_price', updatedFields.price.toString());
      if (updatedFields.offer !== undefined) formData.append('discount', updatedFields.offer.toString());
      if (updatedFields.tax_slab !== undefined) formData.append('tax_slab', updatedFields.tax_slab.toString());
      if (updatedFields.stock !== undefined) formData.append('stock', updatedFields.stock.toString());
      if (updatedFields.admin_commission !== undefined) formData.append('admin_commission', updatedFields.admin_commission.toString());
      if (updatedFields.description !== undefined) formData.append('description', updatedFields.description);
      if (updatedFields.status) formData.append('status', updatedFields.status);

      if (updatedFields.image instanceof File) {
        formData.append('banner', updatedFields.image);
      } else if (typeof updatedFields.image === 'string') {
        formData.append('banner', updatedFields.image);
      }

      await API.put(`/vendor/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to update product:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to update product', 'error');
    }
  };

  const toggleProductStatus = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStatusUI = product.status === 'Active' ? 'Inactive' : 'Active';
    const newStatusDB = newStatusUI === 'Active' ? 'In Stock' : 'Out of Stock';
    try {
      await API.put(`/vendor/products/${id}`, { status: newStatusDB });
      setProducts(currentProducts => 
        currentProducts.map(p => 
          p.id === id ? { ...p, status: newStatusUI } : p
        )
      );
    } catch (error: any) {
      console.error('Failed to toggle status:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to toggle product status', 'error');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await API.delete(`/vendor/products/${id}`);
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to delete product', 'error');
    }
  };

  return (
    <ProductContext.Provider value={{ products, fetchProducts, isLoading, addProduct, updateProduct, toggleProductStatus, deleteProduct }}>
      {children}
    </ProductContext.Provider>
  );
};
