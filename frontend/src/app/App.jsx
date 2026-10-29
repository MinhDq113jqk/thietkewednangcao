import { Container as BsContainer } from 'react-bootstrap';
import { Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from '../layouts/Header'
import Footer from '../layouts/Footer'
import ProtectedRoute from '../features/auth/components/ProtectedRoute'
import ShoppingAssistant from '../features/assistant/components/ShoppingAssistant'
import ToastContainer from '../components/ui/Toast'
import { LoadingStatus } from '../components/ui/Spinner'
import { refreshAuthSession } from '../services/axiosInstance'
import useAuthStore from '../features/auth/store/authStore'
import { lazyWithRetry } from '../utils/lazyWithRetry'

const HomePage = lazyWithRetry(() => import('../features/home/pages/HomePage'), 'home')
const ProductListPage = lazyWithRetry(() => import('../features/products/pages/ProductListPage'), 'product-list')
const CartPage = lazyWithRetry(() => import('../features/cart/pages/CartPage'), 'cart')
const LoginPage = lazyWithRetry(() => import('../features/auth/pages/LoginPage'), 'login')
const ProductDetailPage = lazyWithRetry(() => import('../features/products/pages/ProductDetailPage'), 'product-detail')
const CheckoutPage = lazyWithRetry(() => import('../features/checkout/pages/CheckoutPage'), 'checkout')
const OrdersPage = lazyWithRetry(() => import('../pages/OrdersPage'), 'orders')
const OrderDetailPage = lazyWithRetry(() => import('../pages/OrderDetailPage'), 'order-detail')
const ProfilePage = lazyWithRetry(() => import('../features/account/pages/ProfilePage'), 'profile')
const MessagesPage = lazyWithRetry(() => import('../features/messages/pages/MessagesPage'), 'messages')
const ShopPage = lazyWithRetry(() => import('../features/shops/pages/ShopPage'), 'shop')
const BlogsPage = lazyWithRetry(() => import('../features/content/pages/BlogsPage'), 'blogs')
const InformationPage = lazyWithRetry(() => import('../features/content/pages/InformationPage'), 'information')
const NotFoundPage = lazyWithRetry(() => import('./NotFoundPage'), 'not-found')
const RegionPage = lazyWithRetry(() => import('../features/culture/pages/RegionPage'), 'culture-region')
const ExplorePage = lazyWithRetry(() => import('../features/culture/pages/ExplorePage'), 'culture-explore')
const SellerLayout = lazyWithRetry(() => import('../layouts/SellerLayout'), 'seller-layout')
const SellerDashboard = lazyWithRetry(() => import('../features/seller/pages/SellerDashboard'), 'seller-dashboard')
const SellerInventory = lazyWithRetry(() => import('../features/seller/pages/SellerInventory'), 'seller-inventory')
const SellerProducts = lazyWithRetry(() => import('../features/seller/pages/SellerProducts'), 'seller-products')
const SellerProductForm = lazyWithRetry(() => import('../features/seller/pages/SellerProductForm'), 'seller-product-form')
const SellerOrders = lazyWithRetry(() => import('../features/seller/pages/SellerOrders'), 'seller-orders')
const SellerShopSettings = lazyWithRetry(() => import('../features/seller/pages/SellerShopSettings'), 'seller-settings')
const SellerRegister = lazyWithRetry(() => import('../features/seller/pages/SellerRegister'), 'seller-register')
const SellerRevenue = lazyWithRetry(() => import('../features/seller/pages/SellerRevenue'), 'seller-revenue')
const AdminLayout = lazyWithRetry(() => import('../layouts/AdminLayout'), 'admin-layout')
const AdminDashboard = lazyWithRetry(() => import('../features/admin/pages/AdminDashboard'), 'admin-dashboard')
const AdminShops = lazyWithRetry(() => import('../features/admin/pages/AdminShops'), 'admin-shops')
const AdminUsers = lazyWithRetry(() => import('../features/admin/pages/AdminUsers'), 'admin-users')
const AdminOrders = lazyWithRetry(() => import('../features/admin/pages/AdminOrders'), 'admin-orders')
const AdminPayments = lazyWithRetry(() => import('../features/admin/pages/AdminPayments'), 'admin-payments')
const AfterSalesPage = lazyWithRetry(() => import('../features/after-sales/components/AfterSales').then((m) => ({ default: m.AfterSalesPage })), 'after-sales')
const AdminRefunds = lazyWithRetry(() => import('../features/admin/pages/AdminRefunds'), 'admin-refunds')
const CodReconciliation = lazyWithRetry(() => import('../features/finance/pages/CodReconciliation'), 'cod-reconciliation')
const Settlements = lazyWithRetry(() => import('../features/finance/pages/Settlements'), 'settlements')

const AccountActionPage = lazyWithRetry(() => import('../features/auth/pages/AccountActionPage'), 'account-action');
const SupportPage = lazyWithRetry(() => import('../features/support/pages/SupportPage'), 'support');
const NotificationsPage = lazyWithRetry(() => import('../features/notifications/pages/NotificationsPage'), 'notifications');
const AdminOperations = lazyWithRetry(() => import('../features/admin/pages/AdminOperations'), 'admin-operations');

const pageMeta = [
  { match: /^\/$/, title: 'SouvenirShop - Quà lưu niệm Việt Nam', description: 'Marketplace quà lưu niệm, thủ công mỹ nghệ và đặc sản vùng miền Việt Nam.' },
  { match: /^\/products/, title: 'Sản phẩm - SouvenirShop', description: 'Tìm kiếm, lọc và mua sản phẩm quà lưu niệm từ các gian hàng Việt Nam.' },
  { match: /^\/explore/, title: 'Khám phá bản đồ văn hóa - SouvenirShop', description: 'Du lịch qua màn hình với bản đồ làng nghề và vùng văn hóa Việt Nam.' },
  { match: /^\/culture\//, title: 'Bản đồ văn hóa - SouvenirShop', description: 'Khám phá vùng văn hóa, làng nghề, nghệ nhân và sản phẩm có nguồn gốc trên khắp Việt Nam.' },
  { match: /^\/cart/, title: 'Giỏ hàng - SouvenirShop', description: 'Kiểm tra sản phẩm trong giỏ hàng trước khi thanh toán.' },
  { match: /^\/checkout/, title: 'Thanh toán - SouvenirShop', description: 'Nhập thông tin giao hàng và hoàn tất đặt hàng.' },
  { match: /^\/orders/, title: 'Đơn hàng của tôi - SouvenirShop', description: 'Theo dõi trạng thái các đơn hàng đã đặt.' },
  { match: /^\/seller/, title: 'Kênh người bán - SouvenirShop', description: 'Quản lý gian hàng, sản phẩm, đơn hàng và doanh thu.' },
  { match: /^\/admin/, title: 'Quản trị - SouvenirShop', description: 'Dashboard điều hành marketplace dành cho admin.' },
  { match: /^\/login/, title: 'Đăng nhập - SouvenirShop', description: 'Đăng nhập hoặc đăng ký tài khoản SouvenirShop.' },
  { match: /^\/about/, title: 'Về SouvenirShop', description: 'Sứ mệnh kết nối người yêu quà Việt với hộ gia đình, làng nghề và xưởng thủ công.' },
  { match: /^\/policy/, title: 'Chính sách - SouvenirShop', description: 'Chính sách mua hàng, thanh toán, đổi trả và bảo vệ thông tin tại SouvenirShop.' },
  { match: /^\/contact/, title: 'Liên hệ - SouvenirShop', description: 'Các kênh hỗ trợ dành cho người mua và người bán trên SouvenirShop.' },
]

function PageMetadata() {
  const location = useLocation()

  useEffect(() => {
    const meta = pageMeta.find((item) => item.match.test(location.pathname)) || pageMeta[0]
    document.title = meta.title

    let description = document.querySelector('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.setAttribute('name', 'description')
      document.head.appendChild(description)
    }
    description.setAttribute('content', meta.description)
  }, [location.pathname])

  return null
}

function PageLoader() {
  return (
    <BsContainer as="main" className="py-5 app-detail-1" aria-busy="true">
      <LoadingStatus label="Đang tải trang..." size="lg" className="app-detail-2" />
    </BsContainer>
  )
}

function AuthSessionBootstrap() {
  const finishInitialization = useAuthStore((state) => state.finishInitialization)

  useEffect(() => {
    refreshAuthSession().catch(() => {
      finishInitialization()
    })
  }, [finishInitialization])

  return null
}

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return null
}

function App() {
  const location = useLocation()
  const isWorkspace = location.pathname.startsWith('/seller') || location.pathname.startsWith('/admin')
  const isMessagesPage = location.pathname.startsWith('/messages')
  const showShoppingAssistant = !isWorkspace && !isMessagesPage

  return (
    <div className="bs-ui booking-app d-flex min-vh-100 flex-column app-detail-3">
      <PageMetadata />
      <ScrollToTop />
      <AuthSessionBootstrap />
      <Header />
      <div className="flex-grow-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/culture/:slug" element={<RegionPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/forgot-password" element={<AccountActionPage key="forgot" />} />
            <Route path="/reset-password" element={<AccountActionPage key="reset" />} />
            <Route path="/verify-email" element={<AccountActionPage key="verify" />} />
            <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/shop/:slug" element={<ShopPage />} />
            <Route path="/blogs" element={<BlogsPage />} />
            <Route path="/about" element={<InformationPage type="about" />} />
            <Route path="/policy" element={<InformationPage type="policy" />} />
            <Route path="/contact" element={<InformationPage type="contact" />} />
            <Route path="/seller/register" element={
              <ProtectedRoute><SellerRegister /></ProtectedRoute>
            } />
            <Route path="/seller" element={
              <ProtectedRoute roles={['seller', 'admin']} redirectTo="/seller/register">
                <SellerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<SellerDashboard />} />
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="inventory" element={<SellerInventory />} />
              <Route path="products/new" element={<SellerProductForm />} />
              <Route path="products/:id/edit" element={<SellerProductForm />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="returns" element={<AfterSalesPage mode="seller" />} />
              <Route path="cod" element={<CodReconciliation mode="seller" />} />
              <Route path="settlements" element={<Settlements mode="seller" />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<SellerShopSettings />} />
              <Route path="revenue" element={<SellerRevenue />} />
            </Route>
            <Route path="/admin" element={
              <ProtectedRoute roles="admin" redirectTo="/">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="shops" element={<AdminShops />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="support" element={<SupportPage admin />} />
              <Route path="operations" element={<AdminOperations />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="returns" element={<AfterSalesPage mode="admin" />} />
              <Route path="refunds" element={<AdminRefunds />} />
              <Route path="cod" element={<CodReconciliation mode="admin" />} />
              <Route path="settlements" element={<Settlements mode="admin" />} />
            </Route>
            <Route path="/checkout" element={
              <ProtectedRoute><CheckoutPage /></ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute><OrdersPage /></ProtectedRoute>
            } />
            <Route path="/orders/:id" element={
              <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      {!isWorkspace && !isMessagesPage && <Footer />}
      {showShoppingAssistant && <ShoppingAssistant />}
      <ToastContainer />
    </div>
  )
}

export default App
