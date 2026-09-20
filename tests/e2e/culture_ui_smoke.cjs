const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = 'http://127.0.0.1:5173';
const artifactDir = path.resolve(__dirname, '../../artifacts/playwright');
fs.mkdirSync(artifactDir, { recursive: true });
const browserExecutable = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((candidate) => fs.existsSync(candidate));
const product = {
  id: 'culture-product',
  name: 'Đèn lồng Hội An mini',
  description: 'Đèn lồng lụa dáng truyền thống.',
  price: 180000,
  stock: 12,
  images: ['/src/assets/hero-souvenir-v2.webp'],
  category: 'Trang trí',
  sold: 24,
  craftVillageId: 'village-kim-bong',
  shop: { id: 'shop-1', name: 'Xưởng Việt tuyển chọn', slug: 'xuong-viet', rating: 4.8 },
};

const village = {
  id: 'village-kim-bong',
  regionId: 'region-hoi-an',
  name: 'Làng mộc Kim Bồng',
  slug: 'moc-kim-bong',
  summary: 'Hơn bốn thế kỷ làm nghề bên sông, từ đóng thuyền đến chạm khắc vật phẩm nhỏ.',
  foundedYear: 1590,
  latitude: '15.866772',
  longitude: '108.329088',
  previewMedia: null,
  crafts: ['Mộc', 'Chạm khắc'],
  artisans: [{ name: 'Nhóm thợ mộc Kim Bồng', craft: 'Mộc và chạm khắc' }],
};

const regions = [
  {
    id: 'region-ha-noi',
    name: 'Hà Nội',
    slug: 'ha-noi',
    shortDescription: 'Nơi lớp men gốm và nhịp phố cũ gặp nhau.',
    mapX: '35',
    mapY: '14',
    theme: {},
    villages: [{ ...village, id: 'village-bat-trang', name: 'Làng gốm Bát Tràng' }],
  },
  {
    id: 'region-hoi-an',
    name: 'Hội An',
    slug: 'hoi-an',
    shortDescription: 'Từ phố cảng, những câu chuyện gỗ và đèn lồng tiếp tục lên đường.',
    history: 'Hội An từng là điểm gặp gỡ của thuyền buôn và thợ nghề. Các cộng đồng làm mộc vẫn gìn giữ kỹ thuật qua nhiều thế hệ.',
    mapX: '50',
    mapY: '53',
    theme: { primary: '#8B4A2F', accent: '#E3A62F', paper: '#F4E2B8', ink: '#2D2119', wash: '#EAD1A2' },
    villages: [village],
    products: [product],
  },
];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function installMocks(page) {
  await page.route(`${baseUrl}/api/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/refresh') {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'No session' }) });
    }
    if (url.pathname === '/api/culture/regions') {
      return route.fulfill({ json: { items: regions.map(({ products, history, ...region }) => region), total: regions.length } });
    }
    if (url.pathname === '/api/culture/regions/hoi-an') {
      return route.fulfill({ json: regions[1] });
    }
    if (url.pathname === '/api/products/recommendations') {
      return route.fulfill({ json: { items: [product], strategy: 'visual-test' } });
    }
    if (url.pathname === '/api/products' || url.pathname === '/api/products/search') {
      return route.fulfill({ json: { items: [product], total: 1, page: 1, limit: 12, totalPages: 1 } });
    }
    if (url.pathname === `/api/products/${product.id}`) {
      return route.fulfill({
        json: {
          ...product,
          reviews: [],
          craftVillage: {
            ...village,
            region: {
              id: 'region-hoi-an',
              name: 'Hội An',
              slug: 'hoi-an',
              shortDescription: regions[1].shortDescription,
              theme: regions[1].theme,
            },
          },
        },
      });
    }
    return route.fulfill({ status: 404, json: { message: 'Not mocked' } });
  });
}

async function runViewport(browser, viewport, suffix) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    const blockedExternalAsset = process.env.CULTURE_USE_REAL_API === 'true'
      && text.includes('ERR_NETWORK_ACCESS_DENIED');
    if (message.type() === 'error' && !text.includes('401') && !blockedExternalAsset) {
      errors.push(`console: ${text}`);
    }
  });
  if (process.env.CULTURE_USE_REAL_API !== 'true') await installMocks(page);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.getByRole('heading', { name: /Mua quà Việt theo cách của bạn/ }).waitFor();
  assert(await page.getByRole('link', { name: /Mua sắm nhanh/ }).isVisible(), 'Quick shopping CTA is not visible');
  await page.screenshot({ path: path.join(artifactDir, `dual-home-${suffix}.png`), fullPage: false });
  await page.getByRole('link', { name: /Khám phá bản đồ/ }).click();
  await page.waitForURL('**/explore');
  await page.getByRole('heading', { name: /Chạm vào một vùng/ }).waitFor();
  const hoiAnPin = page.getByRole('link', { name: 'Khám phá văn hóa Hội An' });
  await hoiAnPin.waitFor();
  assert(await hoiAnPin.isVisible(), 'Hội An pin is not visible');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `Horizontal overflow at ${suffix}: ${overflow}px`);

  if (suffix === 'desktop') {
    await hoiAnPin.hover();
    await page.getByRole('heading', { name: 'Làng mộc Kim Bồng' }).waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(artifactDir, 'culture-map-desktop.png'), fullPage: false });
    await hoiAnPin.click();
    await page.waitForURL('**/culture/hoi-an');
    await page.getByRole('heading', { name: 'Hội An', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Câu chuyện trước khi thành món quà' }).waitFor();
    await page.screenshot({ path: path.join(artifactDir, 'culture-region-desktop.png'), fullPage: true });

    let productId = product.id;
    if (process.env.CULTURE_USE_REAL_API === 'true') {
      productId = await page.evaluate(async () => {
        const response = await fetch('/api/culture/products?lat=20.976116&lng=105.913017&radiusKm=10&limit=1');
        const payload = await response.json();
        return payload.items[0]?.id;
      });
    }
    assert(productId, 'No culturally linked product is available for Product Detail QA');
    await page.goto(`${baseUrl}/products/${productId}`, { waitUntil: 'networkidle' });
    await page.getByText('Dấu nghề trên bản đồ', { exact: true }).waitFor();
    assert(await page.getByRole('link', { name: /Sản phẩm thuộc/ }).isVisible(), 'Craft village bridge is not visible');
    await page.screenshot({ path: path.join(artifactDir, 'dual-product-detail-desktop.png'), fullPage: false });
  } else {
    await page.screenshot({ path: path.join(artifactDir, 'culture-map-mobile.png'), fullPage: false });
  }

  assert(errors.length === 0, errors.join('\n'));
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
  try {
    await runViewport(browser, { width: 1440, height: 1000 }, 'desktop');
    await runViewport(browser, { width: 390, height: 844 }, 'mobile');
    process.stdout.write(JSON.stringify({ status: 'passed', viewports: ['1440x1000', '390x844'] }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
