import { useState, useEffect } from 'react';
import API from '../services/api';
import { getProfile } from '../services/vendorApi';
import { MdSearch, MdVisibility, MdDownload, MdArrowBack } from 'react-icons/md';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { isSameStateAsCompany } from '../data/gstStateCodes';
import Pagination from '../components/Pagination';
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewingInvoice, setViewingInvoice] = useState<VendorInvoice | null>(null);
  const itemsPerPage = 10;

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
            const slab = parseFloat(inv.gst_percent) || 18;
            const rawItems: InvoiceItem[] = (inv.items || []).map((i: any) => {
              const qty = parseInt(i.qty, 10) || 1;
              const rawRate = parseFloat(i.rate) || 0;
              const rawAmount = parseFloat(i.amount) || 0;

              const rateIncl = rawRate;
              const rateExcl = rawAmount > 0 ? (rawAmount / qty) : (rateIncl / (1 + (slab / 100)));
              const amount = rawAmount > 0 ? rawAmount : parseFloat((rateExcl * qty).toFixed(2));

              return {
                id: i.id || String(Math.random()),
                description: i.description || 'Product',
                qty,
                rate: parseFloat(rateIncl.toFixed(2)),
                amount: parseFloat(amount.toFixed(2)),
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
              };
            });

            const grandTotal = rawItems.reduce((acc, curr) => acc + (curr.rate * curr.qty), 0);
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
              const rateIncl = parseFloat(unitPayout.toFixed(2));
              const rateExcl = parseFloat((rateIncl / (1 + (slab / 100))).toFixed(2));
              const itemPayoutAmount = parseFloat((rateExcl * qty).toFixed(2));

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

            const grandTotal = rawItems.reduce((acc, curr) => acc + (curr.rate * curr.qty), 0);

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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

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

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
                  {paginatedInvoices.map((inv) => (
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
            {!isLoading && filteredInvoices.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
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
                  const slab = viewingInvoice.gstPercent || 18;
                  const rateIncl = item.rate;
                  const rateExcl = item.amount ? (item.amount / qty) : (rateIncl / (1 + (slab / 100)));
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
              const taxable = viewingInvoice.items.reduce((sum, item) => sum + item.amount, 0);
              const grandTotalVal = viewingInvoice.grandTotal || 0;
              const total = grandTotalVal > 0
                ? grandTotalVal
                : viewingInvoice.items.reduce((sum, item) => sum + (item.rate * item.qty), 0);
              const gst = parseFloat((total - taxable).toFixed(2));
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

            {/* Component Warranty Conditions */}
            <div className="invoice-warranty-section">
              <h5 className="invoice-warranty-title">Component Warranty Conditions</h5>
              <ul className="invoice-warranty-list">
                <li>
                  <strong>Manufacturer Warranty:</strong> Hardware components (cameras, NVRs/DVRs, hard drives) carry a 1-to-3-year manufacturer warranty from the date of purchase. The installer acts as the facilitator for these claims.
                </li>
                <li>
                  <strong>Workmanship/Labor Warranty:</strong> Installation labor is typically covered for 90 days to 1 year. This covers faulty wiring, loose mounts, or incorrect configuration by the technicians.
                </li>
                <li>
                  <strong>Warranty Exclusions:</strong> The warranty is strictly void under the following conditions:
                  <ul className="invoice-warranty-sublist">
                    <li>Damage caused by lightning strikes, power surges, floods, or acts of God.</li>
                    <li>Vandalism, physical tampering, or unauthorized relocation of cameras.</li>
                    <li>Modifications to software settings, network routing, or firmware updates done by the client or a third party.</li>
                  </ul>
                </li>
                <li>
                  <strong>Consumables Exclusion:</strong> Cables, connectors, power adapters, and batteries are generally excluded from long-term warranties or carry a heavily reduced coverage period (e.g., 90 days).
                </li>
                <li>
                  <strong>Advance Replacement Policy:</strong> Defective components must be tested and verified before a replacement is issued. Loaner cameras during the manufacturer repair window are not included unless a separate Annual Maintenance Contract (AMC) is signed.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
