import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import './Layout.css';
import {
  MdDashboard,
  MdInventory,
  MdOutlineShoppingBag,
  MdListAlt,
  MdReceiptLong,
  MdPerson,
  MdLogout
} from 'react-icons/md';
import { FiBox } from 'react-icons/fi';
import NotificationsDropdown from './NotificationsDropdown';
import API from '../services/api';
import { logoutUser } from '../services/auth';
import Swal from 'sweetalert2';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.error('Logout API error:', err);
    }
    logoutUser();
    Swal.fire({
      title: 'Logged Out',
      text: 'You have been logged out successfully.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
    navigate('/login');
  };

  return (
    <div className="layout-container">
      <nav className="navbar">
        <Link to="/dashboard" className="navbar-brand text-decoration-none">
          <h2>Assure<span> Vendor</span></h2>
        </Link>

        <ul className="navbar-nav">
          <li className="nav-item">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <MdDashboard className="nav-icon" /> Dashboard
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/add-product" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <FiBox className="nav-icon" /> Add Products
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/products" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <MdInventory className="nav-icon" /> Products
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/orders" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <MdOutlineShoppingBag className="nav-icon" /> Orders
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/invoices" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <MdReceiptLong className="nav-icon" /> Invoices
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/inventory" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <MdListAlt className="nav-icon" /> Payouts
            </NavLink>
          </li>
        </ul>

        <div className="navbar-right">
          <NotificationsDropdown />
          <NavLink to="/profile" className="nav-link">
            <MdPerson className="nav-icon" /> Profile
          </NavLink>
          <a href="#" onClick={handleLogout} className="nav-link text-warning">
            <MdLogout className="nav-icon" /> Logout
          </a>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="app-footer">
      </footer>
    </div>
  );
};

export default Layout;
