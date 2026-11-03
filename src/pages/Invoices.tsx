import { useState, useEffect } from 'react';
import API from '../services/api';
import { getProfile } from '../services/vendorApi';
import { MdSearch, MdVisibility, MdDownload, MdArrowBack } from 'react-icons/md';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { isSameStateAsCompany } from '../data/gstStateCodes';
import './Invoices.css';

interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  warranty?: string;
  modelNumber?: string;
  hsnCode?: string;
  serialNumbers?: string[];
}

const ASSURE_TECHNOLOGIES_ADDRESS = '1st Floor, 5-15 Shop No 1, Dandu Venkata Ramaiah Commercial, A Konduru, NTR District, Andhra Pradesh - 521227';

interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerName: string;
  customerGstin: string;
  customerAddress: string;
  soldBy: string;
  vendorGstin: string;
  vendorMobile: string;
  vendorEmail: string;
  vendorAddress: string;
  items: InvoiceItem[];
  total: number;
  grandTotal?: number;
  gstPercent?: number;
  date: string;
  status: string;
  productName: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewingInvoice, setViewingInvoice] = useState<VendorInvoice | null>(null);

  useEffect(() => {
    fetchVendorInvoices();
  }, []);

  const fetchVendorInvoices = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch vendor profile for current seller details
      let profileData: any = {};
      try {
        const profRes = await getProfile();
        profileData = profRes?.data || profRes || {};
      } catch (e) {
        console.error('Failed to fetch vendor profile for invoice', e);
      }

      const vendorName = profileData.business_name || profileData.full_name || 'Vendor';
      const vendorGstin = profileData.gst_number || '';
      const vendorMobile = profileData.mobile || '';
      const vendorEmail = profileData.email || '';
      const vendorAddress = profileData.address || '';

      // 2. Fetch invoices from backend
      let loadedInvoices: VendorInvoice[] = [];
      try {
        const invRes = await API.get('/invoices/vendor');
        if (invRes.data?.data && Array.isArray(invRes.data.data)) {
          loadedInvoices = invRes.data.data.map((inv: any) => {
            const rawItems: InvoiceItem[] = (inv.items || []).map((i: any) => ({
              id: i.id || String(Math.random()),
              description: i.description || 'Product',
              qty: i.qty || 1,
              rate: parseFloat(i.rate) || 0,
              amount: parseFloat(i.amount) || (i.qty * i.rate) || 0,
              warranty: i.warranty || '',
              modelNumber: i.model_number || '',
              hsnCode: i.hsn_code || '',
              serialNumbers: (() => {
                let sn = i.serial_numbers;
                if (typeof sn === 'string') {
                  try {
                    sn = JSON.parse(sn);
                  } catch {
                    sn = sn.split(',').map((s: string) => s.trim()).filter(Boolean);
                  }
                }
                return Array.isArray(sn) ? sn : (typeof sn === 'string' ? [sn] : []);
              })()
            }));

            const itemsTotal = rawItems.reduce((acc, curr) => acc + curr.amount, 0);
            const backendGrandTotal = parseFloat(inv.grand_total);
            const grandTotal = backendGrandTotal > 0 ? backendGrandTotal : (itemsTotal * 1.18);
            const gstPercent = parseFloat(inv.gst_percent) || 18;

            return {
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              orderId: inv.order_id,
              customerName: 'Assure Technologies',
              customerGstin: '37DJPPN2516B1Z9',
              customerAddress: ASSURE_TECHNOLOGIES_ADDRESS,
              soldBy: inv.vendor?.business_name || inv.vendor?.full_name || vendorName,
              vendorGstin: inv.vendor?.gst_number || vendorGstin,
              vendorMobile: inv.vendor?.mobile || vendorMobile,
              vendorEmail: inv.vendor?.email || vendorEmail,
              vendorAddress: inv.vendor?.address || vendorAddress,
              items: rawItems,
              total: grandTotal,
              grandTotal,
              gstPercent,
              date: new Date(inv.createdAt).toLocaleString(),
              status: inv.status || 'Paid',
              productName: rawItems[0]?.description || 'Product'
            };
          });
        }
      } catch (err) {
        console.warn('Backend /invoices/vendor not available yet, using accepted orders fallback', err);
      }

      // 3. Fallback: Reconstruct invoices from accepted orders if /invoices/vendor returned none
      if (loadedInvoices.length === 0) {
        try {
          const ordersRes = await API.get('/vendor/orders', { params: { limit: 100 } });
          const rawOrders = ordersRes.data?.orders || (Array.isArray(ordersRes.data) ? ordersRes.data : []);
          const acceptedOrders = rawOrders.filter((o: any) => {
            const status = (o.status || o.items?.[0]?.status || '').toUpperCase();
            return status === 'ACCEPTED' || status === 'OUT_FOR_DELIVERY' || status === 'COMPLETED';
          });

          loadedInvoices = acceptedOrders.map((o: any) => {
            const rawItems: InvoiceItem[] = (o.items || []).map((i: any) => {
              const qty = i.qty || 1;
              const slab = i.tax_slab || 18;
              const vendorBase = parseFloat(i.product?.base_price) || parseFloat(i.price) || 0;
              const discPct = parseFloat(i.product?.discount) || 0;
              const unitPayout = (i.vendor_payout != null && qty > 0)
                ? (parseFloat(i.vendor_payout) / qty)
                : (vendorBase * (1 - (discPct / 100)));
              const itemPayoutAmount = parseFloat((unitPayout * qty).toFixed(2));
              const rateIncl = parseFloat((unitPayout * (1 + (slab / 100))).toFixed(2));

              return {
                id: i.id || String(Math.random()),
                description: i.product?.name || i.product_name || 'Product',
                qty,
                rate: rateIncl,
                amount: itemPayoutAmount,
                warranty: i.warranty || '1 Year',
                modelNumber: i.model_number || 'N/A',
                hsnCode: i.hsn_code || 'N/A',
                serialNumbers: []
              };
            });

            const itemsTotal = rawItems.reduce((acc, curr) => acc + curr.amount, 0);
            const totalTax = rawItems.reduce((acc, curr) => acc + (curr.amount * 0.18), 0);
            const grandTotal = parseFloat((itemsTotal + totalTax).toFixed(2));

            return {
              id: o.id || o.order_number,
              invoiceNumber: `INV-${(o.order_number || o.id).replace('ORD', '')}`,
              orderId: o.order_number || o.id,
              customerName: 'Assure Technologies',
              customerGstin: '37DJPPN2516B1Z9',
              customerAddress: ASSURE_TECHNOLOGIES_ADDRESS,
              soldBy: vendorName,
              vendorGstin: vendorGstin || '27AAAAA0000A1Z5',
              vendorMobile: vendorMobile,
              vendorEmail: vendorEmail,
              vendorAddress: vendorAddress,
              items: rawItems,
              total: grandTotal,
              grandTotal,
              gstPercent: 18,
              date: new Date(o.createdAt).toLocaleString(),
              status: 'Paid',
              productName: rawItems[0]?.description || 'Product'
            };
          });
        } catch (orderErr) {
          console.error('Failed to fetch accepted orders as fallback', orderErr);
        }
      }

      setInvoices(loadedInvoices);
    } catch (error) {
      console.error('Failed to load invoices', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceNumber: string) => {
    const input = document.getElementById('vendor-invoice-pdf');
    if (!input) return;

    const actionButtons = input.querySelector('.pdf-exclude-buttons');
    if (actionButtons) {
      (actionButtons as HTMLElement).style.display = 'none';
    }

    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      if (actionButtons) {
        (actionButtons as HTMLElement).style.display = 'flex';
      }
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(query) ||
      inv.orderId.toLowerCase().includes(query) ||
      inv.productName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="invoices-page">
      {!viewingInvoice ? (
        <>
          <div className="invoices-header">
            <div className="invoices-header-text">
              <h1>Invoices</h1>
              <p>Manage and download your tax invoices issued to Assure Technologies</p>
            </div>
            <div className="invoices-search-bar">
              <MdSearch size={20} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by Invoice No, Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="invoices-card">
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                No invoices found. Invoices are generated when you accept orders.
              </div>
            ) : (
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Order ID</th>
                    <th>Billed To</th>
                    <th>Product</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.orderId}</td>
                      <td>
                        <div>{inv.customerName}</div>
                        <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
                          GSTIN: {inv.customerGstin}
                        </small>
                      </td>
                      <td>{inv.productName}</td>
                      <td><strong>₹{inv.total.toFixed(2)}</strong></td>
                      <td>
                        <span className="status-badge status-paid">{inv.status}</span>
                      </td>
                      <td>{inv.date}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn-action-view"
                            onClick={() => setViewingInvoice(inv)}
                          >
                            <MdVisibility size={15} /> View
                          </button>
                          <button
                            className="btn-action-download"
                            onClick={() => {
                              setViewingInvoice(inv);
                              setTimeout(() => {
                                handleDownloadPDF(inv.invoiceNumber);
                              }, 300);
                            }}
                          >
                            <MdDownload size={15} /> Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="invoice-detail-wrapper" id="vendor-invoice-pdf">
          <div className="pdf-exclude-buttons invoice-detail-actions">
            <div>
              <button
                className="btn-action-back"
                onClick={() => setViewingInvoice(null)}
              >
                <MdArrowBack size={16} /> Back to Invoices
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-action-download"
                onClick={() => handleDownloadPDF(viewingInvoice.invoiceNumber)}
              >
                <MdDownload size={16} /> Download PDF
              </button>
            </div>
          </div>

          <div className="invoice-box">
            <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.05em' }}>TAX INVOICE</h2>
              <small style={{ color: '#64748b' }}>Original for Recipient</small>
            </div>

            <div className="invoice-header-grid">
              <div className="invoice-party-box">
                <h4>Billed To (Customer):</h4>
                <div className="party-name">{viewingInvoice.customerName}</div>
                <div><strong>GSTIN:</strong> {viewingInvoice.customerGstin}</div>
                <div><strong>Address:</strong> {viewingInvoice.customerAddress}</div>
              </div>

              <div className="invoice-party-box">
                <h4>Sold By (Vendor):</h4>
                <div className="party-name">{viewingInvoice.soldBy}</div>
                <div><strong>GSTIN:</strong> {viewingInvoice.vendorGstin || 'N/A'}</div>
                {viewingInvoice.vendorMobile && <div><strong>Mobile:</strong> {viewingInvoice.vendorMobile}</div>}
                {viewingInvoice.vendorEmail && <div><strong>Email:</strong> {viewingInvoice.vendorEmail}</div>}
                {viewingInvoice.vendorAddress && <div><strong>Address:</strong> {viewingInvoice.vendorAddress}</div>}
              </div>
            </div>

            <div className="invoice-meta-grid">
              <div><strong>Invoice No:</strong> {viewingInvoice.invoiceNumber}</div>
              <div><strong>Date:</strong> {viewingInvoice.date}</div>
              <div><strong>Order ID:</strong> {viewingInvoice.orderId}</div>
              <div><strong>Payment Status:</strong> {viewingInvoice.status}</div>
            </div>

            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Items</h4>
            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>S.No</th>
                  <th>Description</th>
                  <th>Model No</th>
                  <th>HSN</th>
                  <th>Warranty</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate (Incl. of Tax)</th>
                  <th style={{ textAlign: 'right' }}>Rate (Excl. of Tax)</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewingInvoice.items.map((item, idx) => {
                  const qty = item.qty || 1;
                  const rateExcl = (item.amount && item.amount < (item.rate * qty))
                    ? (item.amount / qty)
                    : item.rate;
                  const rateIncl = (item.rate > rateExcl)
                    ? item.rate
                    : (rateExcl * 1.18);
                  const amount = item.amount || (rateExcl * qty);

                  return (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{item.description}</strong>
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                            Serials: {item.serialNumbers.join(', ')}
                          </div>
                        )}
                      </td>
                      <td>{item.modelNumber || '-'}</td>
                      <td>{item.hsnCode || '-'}</td>
                      <td>{item.warranty || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f766e' }}>₹{rateIncl.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{rateExcl.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}><strong>₹{amount.toFixed(2)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(() => {
              const itemsTotal = viewingInvoice.items.reduce((sum, item) => sum + item.amount, 0);
              const grandTotal = viewingInvoice.grandTotal || 0;
              const gstPercent = viewingInvoice.gstPercent || 18;

              const total = grandTotal > 0 ? grandTotal : (itemsTotal * (1 + gstPercent / 100));
              const gst = (grandTotal > itemsTotal && itemsTotal > 0)
                ? (grandTotal - itemsTotal)
                : (total - itemsTotal);
              const taxable = total - gst;
              const isIntraState = isSameStateAsCompany(viewingInvoice.vendorGstin);

              return (
                <div className="invoice-total-box" style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '6px' }}>
                    <strong>Subtotal (Taxable):</strong> ₹{taxable.toFixed(2)}
                  </div>
                  {isIntraState ? (
                    <>
                      <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '4px' }}>
                        <strong>CGST:</strong> ₹{(gst / 2).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '8px' }}>
                        <strong>SGST:</strong> ₹{(gst / 2).toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '8px' }}>
                      <strong>IGST:</strong> ₹{gst.toFixed(2)}
                    </div>
                  )}
                  <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Total: ₹{total.toFixed(2)}</h4>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
