import { Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import ShoppingAssistant from './components/ShoppingAssistant'
import ToastContainer from './components/ui/Toast'
import { LoadingStatus } from './components/ui/Spinner'
import { refreshAuthSession } from './api/axiosInstance'
import useAuthStore from './store/authStore'
import { lazyWithRetry } from './utils/lazyWithRetry'

const HomePage = lazyWithRetry(() => import('./pages/HomePage'), 'home')
const ProductListPage = lazyWithRetry(() => import('./pages/ProductListPage'), 'product-list')
const CartPage = lazyWithRetry(() => import('./pages/CartPage'), 'cart')
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'), 'login')
const ProductDetailPage = lazyWithRetry(() => import('./pages/ProductDetailPage'), 'product-detail')
const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage'), 'checkout')
const OrdersPage = lazyWithRetry(() => import('./pages/OrdersPage'), 'orders')
const OrderDetailPage = lazyWithRetry(() => import('./pages/OrderDetailPage'), 'order-detail')
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'), 'profile')
const MessagesPage = lazyWithRetry(() => import('./pages/MessagesPage'), 'messages')
const ShopPage = lazyWithRetry(() => import('./pages/ShopPage'), 'shop')
const BlogsPage = lazyWithRetry(() => import('./pages/BlogsPage'), 'blogs')
const InformationPage = lazyWithRetry(() => import('./pages/InformationPage'), 'information')
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'), 'not-found')
const RegionPage = lazyWithRetry(() => import('./pages/RegionPage'), 'culture-region')
const ExplorePage = lazyWithRetry(() => import('./pages/ExplorePage'), 'culture-explore')
const SellerLayout = lazyWithRetry(() => import('./pages/seller/SellerLayout'), 'seller-layout')
const SellerDashboard = lazyWithRetry(() => import('./pages/seller/SellerDashboard'), 'seller-dashboard')
const SellerProducts = lazyWithRetry(() => import('./pages/seller/SellerProducts'), 'seller-products')
const SellerProductForm = lazyWithRetry(() => import('./pages/seller/SellerProductForm'), 'seller-product-form')
const SellerOrders = lazyWithRetry(() => import('./pages/seller/SellerOrders'), 'seller-orders')
const SellerShopSettings = lazyWithRetry(() => import('./pages/seller/SellerShopSettings'), 'seller-settings')
const SellerRegister = lazyWithRetry(() => import('./pages/seller/SellerRegister'), 'seller-register')
const SellerRevenue = lazyWithRetry(() => import('./pages/seller/SellerRevenue'), 'seller-revenue')
const AdminLayout = lazyWithRetry(() => import('./pages/admin/AdminLayout'), 'admin-layout')
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'), 'admin-dashboard')
const AdminShops = lazyWithRetry(() => import('./pages/admin/AdminShops'), 'admin-shops')
const AdminUsers = lazyWithRetry(() => import('./pages/admin/AdminUsers'), 'admin-users')
const AdminOrders = lazyWithRetry(() => import('./pages/admin/AdminOrders'), 'admin-orders')

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
    <main className="mx-auto min-h-[320px] max-w-7xl px-4 py-10" aria-busy="true">
      <LoadingStatus label="Đang tải trang..." size="lg" className="min-h-[240px]" />
    </main>
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
    <div className="flex min-h-screen flex-col bg-[#F7F8F5]">
      <PageMetadata />
      <ScrollToTop />
      <AuthSessionBootstrap />
      <Header />
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/culture/:slug" element={<RegionPage />} />
            <Route path="/cart" element={<CartPage />} />
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
              <Route path="products/new" element={<SellerProductForm />} />
              <Route path="products/:id/edit" element={<SellerProductForm />} />
              <Route path="orders" element={<SellerOrders />} />
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
              <Route path="orders" element={<AdminOrders />} />
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
