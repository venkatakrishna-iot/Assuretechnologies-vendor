import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import Profile from './pages/Profile';
import TrackOrder from './pages/TrackOrder';
import { ProductProvider } from './context/ProductContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes wrapped in PrivateRoute and Layout */}
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/add-product" element={<AddProduct />} />
                <Route path="/products" element={<Products />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/track-order/:id" element={<TrackOrder />} />
              </Route>
            </Route>

            {/* Fallback route */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ProductProvider>
    </QueryClientProvider>
  );
}

export default App;
