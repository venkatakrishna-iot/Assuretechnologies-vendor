import Pagination from '../components/Pagination';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MdClose } from 'react-icons/md';
import Swal from 'sweetalert2';
import { useProductContext } from '../context/ProductContext';
import Loading from '../components/Loading';
import './Products.css';
import type { Product } from '../context/ProductContext';

const Products = () => {
  const { products, fetchProducts, isLoading, updateProduct, toggleProductStatus, deleteProduct } = useProductContext();
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    price: '',
    category: '',
    offer: '',
    stock: '',
    description: '',
    admin_commission: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  // const location = useLocation();

  // Server-side pagination and filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        stockStatus: stockFilter
      }).then((pagination: any) => {
        if (pagination) {
          setTotalPages(pagination.totalPages);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, stockFilter]);

  // Use the products from context directly
  const paginatedProducts = products;

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setPreviewImage(null);
    setEditFormData({
      title: product.title,
      price: product.price.toString(),
      category: product.category,
      offer: product.offer.toString(),
      stock: product.stock.toString(),
      description: product.description || '',
      admin_commission: product.admin_commission ? product.admin_commission.toString() : ''
    });
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setPreviewImage(null);
    setImageFile(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
      setImageFile(file);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = () => {
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        title: editFormData.title,
        price: parseFloat(editFormData.price) || 0,
        category: editFormData.category,
        offer: parseFloat(editFormData.offer) || 0,
        stock: parseInt(editFormData.stock, 10) || 0,
        description: editFormData.description,
        admin_commission: parseFloat(editFormData.admin_commission) || 0,
        ...(imageFile && { image: imageFile })
      });
      setEditingProduct(null);
    setPreviewImage(null);
    setImageFile(null);
      
      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Product updated successfully.',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleToggleStatus = (product: Product) => {
    const isCurrentlyActive = product.status === 'Active';
    const actionText = isCurrentlyActive ? 'hide' : 'activate';
    
    Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionText} this product?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1D4ED8',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Yes'
    }).then((result) => {
      if (result.isConfirmed) {
        toggleProductStatus(product.id);
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `Product is now ${isCurrentlyActive ? 'Inactive' : 'Active'}.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleDeleteProduct = (product: Product) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteProduct(product.id);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'The product has been deleted.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleSaveStock = (id: string, currentStock: number) => {
    const newStock = stockUpdates[id] !== undefined ? stockUpdates[id] : currentStock;
    updateProduct(id, { stock: newStock });
    
    // Clear the local override so it tracks the context value again (optional, but good practice)
    setStockUpdates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    Swal.fire({
      icon: 'success',
      title: 'Stock Updated!',
      text: 'The product stock has been successfully updated.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="page-container relative-container">
      {/* Decorative background blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="page-title mb-0">My Products</h2>
        <Link to="/add-product" className="btn btn-primary">
          + Add Product
        </Link>
      </div>
      
      <div className="d-flex justify-content-between align-items-center mb-4" style={{ gap: '16px', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1', minWidth: '250px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by title or category..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="filter-dropdown" style={{ minWidth: '150px' }}>
          <select 
            className="form-control" 
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Stock</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      <div className="table-container modern-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Discount (%)</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <Loading />
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-5 text-muted">
                  No products found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div style={{ width: '60px', height: '40px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={typeof product.image === 'string' ? product.image : URL.createObjectURL(product.image as File)} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </td>
                  <td className="font-weight-500">{product.title}</td>
                  <td>{product.category}</td>
                  <td>₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>{product.offer}%</td>
                  <td>
                    <div className="d-flex align-items-center" style={{ gap: '4px' }}>
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ width: '70px', padding: '6px' }} 
                        value={stockUpdates[product.id] !== undefined ? stockUpdates[product.id] : product.stock}
                        onChange={(e) => setStockUpdates(prev => ({ ...prev, [product.id]: parseInt(e.target.value) || 0 }))}
                      />
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '6px 8px' }} 
                        title="Save Stock"
                        onClick={() => handleSaveStock(product.id, product.stock)}
                      >
                        ✓
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${product.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-warning btn-sm" title="Edit" onClick={() => handleEditClick(product)}>
                        Edit
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        title={product.status === 'Active' ? 'Hide' : 'Activate'}
                        onClick={() => handleToggleStatus(product)}
                      >
                        {product.status === 'Active' ? 'Hide' : 'Active'}
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        title="Delete"
                        onClick={() => handleDeleteProduct(product)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Edit Modal */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', padding: 0 }}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--info))', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Edit Product</h3>
                  <span style={{ fontSize: '0.85rem', opacity: 0.8 }} title={editingProduct.id}>
                    ID: {editingProduct.display_id || editingProduct.id}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px', background: '#fff', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                
                {/* Left Column - Images */}
                <div style={{ flex: '0 0 220px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '12px' }}>Product Banner</label>
                  <div style={{ 
                    width: '100%', aspectRatio: '4/3', background: '#f8fafc', border: '1px dashed #cbd5e1', 
                    borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <img src={previewImage || (typeof editingProduct.image === 'string' ? editingProduct.image : URL.createObjectURL(editingProduct.image as File))} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px' }}>{previewImage ? 'Preview' : 'Current'}</div>
                  </div>
                  
                  <div className="d-flex align-items-center" style={{ gap: '8px', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '8px', background: '#f8fafc' }}>
                    <label style={{ margin: 0, cursor: 'pointer' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleImageChange}
                      />
                      <span className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fff', border: '1px solid #e2e8f0' }}>Replace</span>
                    </label>
                    <span className="text-muted" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {previewImage ? 'File selected' : 'No file selected'}
                    </span>
                  </div>
                </div>
                
                {/* Right Column - Details */}
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {(() => {
                    const editVendorPrice = parseFloat(editFormData.price) || 0;
                    const editCommissionPct = parseFloat(editFormData.admin_commission) || 0;
                    const editDiscountPct = parseFloat(editFormData.offer) || 0;
                    
                    const editAdminCommission = editVendorPrice * (editCommissionPct / 100);
                    const editOriginalPrice = editVendorPrice + editAdminCommission;
                    const editVendorDiscountedPrice = editVendorPrice * (1 - (editDiscountPct / 100));
                    const editFinalSellingPrice = editVendorDiscountedPrice + editAdminCommission;
                    const editVendorPayout = editVendorDiscountedPrice;

                    return (
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Pricing Breakdown</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>Original Price (Frontend):</span>
                          <span style={{ fontWeight: '500', textDecoration: 'line-through' }}>₹{editOriginalPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>Final Selling Price:</span>
                          <span style={{ fontWeight: 'bold', color: '#10b981' }}>₹{editFinalSellingPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569', fontWeight: '500' }}>Your Payout:</span>
                          <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>₹{editVendorPayout.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Product Title</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="title"
                      value={editFormData.title}
                      onChange={handleEditChange}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', background: '#f8fafc' }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Selling Price (₹)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        name="price"
                        value={editFormData.price}
                        onChange={handleEditChange}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', background: '#f8fafc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Discount (%)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        name="offer"
                        value={editFormData.offer}
                        onChange={handleEditChange}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', background: '#f8fafc' }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Category</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="category"
                        value={editFormData.category}
                        onChange={handleEditChange}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', background: '#f8fafc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Stock</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="stock"
                        value={editFormData.stock}
                        onChange={handleEditChange}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', background: '#f8fafc' }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Admin Comm. (%)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        max="100"
                        className="form-control" 
                        name="admin_commission"
                        value={editFormData.admin_commission}
                        onChange={handleEditChange}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', background: '#f8fafc' }}
                      />
                    </div>
                    <div>
                      {/* Empty column to keep grid layout intact */}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                    <textarea 
                      className="form-control" 
                      name="description"
                      rows={3}
                      value={editFormData.description}
                      onChange={handleEditChange}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', background: '#f8fafc', resize: 'vertical' }}
                    ></textarea>
                  </div>

                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div style={{ padding: '16px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleCloseModal}
                style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 600, background: '#fff', border: '1px solid #cbd5e1', color: '#475569' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveEdit}
                style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
