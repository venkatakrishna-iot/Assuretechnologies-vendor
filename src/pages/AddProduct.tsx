import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductContext } from '../context/ProductContext';
import './Products.css';

const AddProduct = () => {
  const { addProduct } = useProductContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    price: '',
    discount: '',
    adminCommissionPct: '10',
    stock: '',
    image: 'https://placehold.co/60x40/png',
    fileName: 'No file chosen',
    imageFile: null as File | null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string, fileName: file.name, imageFile: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const vendorPrice = parseFloat(formData.price) || 0;
  const commissionPct = parseFloat(formData.adminCommissionPct) || 0;
  const discountPct = parseFloat(formData.discount) || 0;
  
  const adminCommission = vendorPrice * (commissionPct / 100);
  const originalPrice = vendorPrice + adminCommission;
  const vendorDiscountedPrice = vendorPrice * (1 - (discountPct / 100));
  const finalSellingPrice = vendorDiscountedPrice + adminCommission;
  const vendorPayout = vendorDiscountedPrice;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Add product to context
    addProduct({
      title: formData.title || 'Untitled Product',
      category: formData.category || 'Uncategorized',
      price: vendorPrice,
      admin_commission: commissionPct,
      stock: parseInt(formData.stock, 10) || 0,
      offer: parseFloat(formData.discount) || 0,
      status: 'Active',
      image: formData.imageFile || formData.image,
    });

    // Navigate to products page
    navigate('/products');
  };

  return (
    <div className="page-container relative-container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="panel">
          <div className="panel-header">
          <h2 className="panel-title">Add New Product</h2>
        </div>
        <div className="panel-body">
          <form className="add-product-form" onSubmit={handleSave}>
            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                <option value="Networking">Networking</option>
                <option value="Automation">Automation</option>
                <option value="AgriTech">AgriTech</option>
                <option value="Surveillance">Surveillance</option>
                <option value="Telephony">Telephony</option>
                <option value="Intercom">Intercom</option>
                <option value="Biometrics">Biometrics</option>
                <option value="Communication">Communication</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="IT Support">IT Support</option>
                <option value="Solar">Solar</option>
                <option value="IoT">IoT</option>
                <option value="CCTV">CCTV</option>
                <option value="Sensors">Sensors</option>
                <option value="Agriculture">Agriculture</option>
                <option value="FiberOptics">FiberOptics</option>
              </select>
            </div>

            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                className="form-control"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group col-half">
                <label>Base Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group col-half">
                <label>Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-half">
                <label>Admin Commission (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control"
                  name="adminCommissionPct"
                  value={formData.adminCommissionPct}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group col-half">
                <label>Pricing Breakdown</label>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Original Price (Frontend):</span>
                    <span style={{ fontWeight: '500', textDecoration: 'line-through' }}>₹{originalPrice.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Final Selling Price:</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>₹{finalSellingPrice.toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontWeight: '500' }}>Your Payout:</span>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>₹{vendorPayout.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-half">
                <label>Initial Stock</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Product Image</label>
              <div className="file-input-wrapper" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ pointerEvents: 'none' }}>Choose File</button>
                <span className="file-name">{formData.fileName}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handleImageChange}
                  style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </div>
              {formData.image !== 'https://placehold.co/60x40/png' && (
                <div className="mt-2">
                  <img src={formData.image} alt="Preview" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary mt-2">Save Product</button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AddProduct;
