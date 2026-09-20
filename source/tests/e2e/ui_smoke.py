import json
import re
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[3]
ARTIFACTS = ROOT / "docs" / "evidence" / "artifacts" / "playwright"
BASE_URL = "http://127.0.0.1:5173"
HERO_URL = "/src/assets/hero-souvenir-v2.webp"

PRODUCTS = [
    {
        "id": f"visual-{index}",
        "name": name,
        "description": description,
        "price": price,
        "salePrice": sale_price,
        "stock": 12 + index,
        "images": [HERO_URL],
        "category": category,
        "sold": 20 * index,
        "shop": {
            "id": "visual-shop",
            "name": "Xưởng Việt tuyển chọn",
            "slug": "xuong-viet-tuyen-chon",
            "rating": 4.8,
            "location": "Hà Nội",
        },
    }
    for index, (name, description, price, sale_price, category) in enumerate(
        [
            ("Bộ trà gốm men lam", "Bộ trà thủ công nung nhiệt cao.", 680000, 620000, "Gốm sứ"),
            ("Túi thêu hoa sen", "Túi vải thêu tay hoàn thiện tại Huế.", 320000, None, "Lụa thêu"),
            ("Hộp sơn mài Khuê Văn Các", "Hộp trang sức sơn mài nhiều lớp.", 460000, 420000, "Sơn mài"),
            ("Đèn lồng Hội An mini", "Đèn lồng lụa dáng truyền thống.", 180000, None, "Trang trí"),
            ("Giỏ mây đan thủ công", "Giỏ mây tự nhiên từ xưởng gia đình.", 295000, None, "Mây tre"),
            ("Tranh Đông Hồ đóng khung", "Bản in dân gian trên giấy dó.", 350000, 310000, "Tranh dân gian"),
            ("Nón lá trang trí", "Nón lá cỡ nhỏ cho góc lưu niệm.", 145000, None, "Nón lá"),
            ("Móc khóa gỗ bản đồ Việt Nam", "Món quà nhỏ gọn từ gỗ tái tạo.", 65000, None, "Đồ gỗ"),
        ],
        start=1,
    )
]

VILLAGES = {
    "ha-noi": {
        "id": "village-bat-trang",
        "regionId": "region-ha-noi",
        "name": "Làng gốm Bát Tràng",
        "slug": "gom-bat-trang",
        "summary": "Nơi đất được tạo hình, phủ men và nung thành những món quà có nguồn gốc.",
        "foundedYear": 1400,
        "latitude": "20.976116",
        "longitude": "105.913017",
        "previewMedia": None,
        "crafts": ["Gốm", "Men thủ công"],
        "artisans": [{"name": "Nhóm tạo tác Bát Tràng", "craft": "Tạo hình và men gốm"}],
    },
    "hoi-an": {
        "id": "village-kim-bong",
        "regionId": "region-hoi-an",
        "name": "Làng mộc Kim Bồng",
        "slug": "moc-kim-bong",
        "summary": "Hơn bốn thế kỷ làm nghề bên sông, từ đóng thuyền đến chạm khắc vật phẩm nhỏ.",
        "foundedYear": 1590,
        "latitude": "15.866772",
        "longitude": "108.329088",
        "previewMedia": None,
        "crafts": ["Mộc", "Chạm khắc"],
        "artisans": [{"name": "Nhóm thợ mộc Kim Bồng", "craft": "Mộc và chạm khắc"}],
    },
}

CULTURE_REGIONS = [
    {
        "id": "region-ha-noi",
        "name": "Hà Nội",
        "slug": "ha-noi",
        "shortDescription": "Nơi lớp men gốm và nhịp phố cũ gặp nhau.",
        "centerLat": "21.027764",
        "centerLng": "105.834160",
        "mapX": "35",
        "mapY": "14",
        "heroMedia": None,
        "theme": {"primary": "#174C45", "accent": "#D89A3D", "paper": "#F2E6C9", "ink": "#17201D", "wash": "#DCEBE5"},
        "villages": [VILLAGES["ha-noi"]],
    },
    {
        "id": "region-hoi-an",
        "name": "Hội An",
        "slug": "hoi-an",
        "shortDescription": "Từ phố cảng, những câu chuyện gỗ và đèn lồng tiếp tục lên đường.",
        "centerLat": "15.880058",
        "centerLng": "108.338047",
        "mapX": "50",
        "mapY": "53",
        "heroMedia": None,
        "theme": {"primary": "#8B4A2F", "accent": "#E3A62F", "paper": "#F4E2B8", "ink": "#2D2119", "wash": "#EAD1A2"},
        "villages": [VILLAGES["hoi-an"]],
    },
]


def install_api_mocks(context, authenticated):
    user = {
        "id": "visual-buyer",
        "name": "Minh Anh",
        "email": "visual@example.test",
        "role": "buyer",
    }

    def handle(route):
        request = route.request
        path = urlparse(request.url).path

        if path == "/api/auth/refresh":
            if authenticated:
                route.fulfill(status=200, json={"token": "visual-access-token", "user": user})
            else:
                route.fulfill(
                    status=401,
                    json={"message": "Phiên đăng nhập không tồn tại", "error": {"code": "UNAUTHORIZED"}},
                )
            return

        if path == "/api/products/recommendations":
            items = [
                {**product, "recommendationReason": "Gần với sở thích quà thủ công của bạn"}
                for product in PRODUCTS[:4]
            ]
            route.fulfill(status=200, json={"items": items, "strategy": "personalized"})
            return

        if path in ("/api/products", "/api/products/search"):
            route.fulfill(
                status=200,
                json={
                    "items": PRODUCTS,
                    "total": len(PRODUCTS),
                    "page": 1,
                    "limit": 12,
                    "totalPages": 1,
                    "cached": False,
                },
            )
            return

        if path == f"/api/products/{PRODUCTS[3]['id']}":
            route.fulfill(
                status=200,
                json={
                    **PRODUCTS[3],
                    "reviews": [],
                    "craftVillageId": VILLAGES["hoi-an"]["id"],
                    "craftVillage": {
                        **VILLAGES["hoi-an"],
                        "region": {
                            "id": "region-hoi-an",
                            "name": "Hội An",
                            "slug": "hoi-an",
                            "shortDescription": CULTURE_REGIONS[1]["shortDescription"],
                            "theme": CULTURE_REGIONS[1]["theme"],
                        },
                    },
                },
            )
            return

        if path == "/api/culture/regions":
            route.fulfill(status=200, json={"items": CULTURE_REGIONS, "total": len(CULTURE_REGIONS)})
            return

        if path == "/api/culture/regions/hoi-an":
            route.fulfill(
                status=200,
                json={
                    **CULTURE_REGIONS[1],
                    "history": "Hội An từng là điểm gặp gỡ của thuyền buôn và thợ nghề. Các cộng đồng làm mộc vẫn gìn giữ kỹ thuật qua nhiều thế hệ.",
                    "products": [{**PRODUCTS[3], "craftVillageId": "village-kim-bong"}],
                },
            )
            return

        if path == "/api/shipping/estimate":
            route.fulfill(
                status=200,
                json={
                    "provider": "visual-test",
                    "fee": 0,
                    "etaDays": 3,
                    "note": "Miễn phí giao hàng",
                },
            )
            return

        route.fulfill(
            status=404,
            json={"message": "Visual test route not mocked", "error": {"code": "NOT_MOCKED"}},
        )

    context.route(f"{BASE_URL}/api/**", handle)


def attach_error_capture(page, errors):
    def on_console(message):
        if message.type == "error" and "401 (Unauthorized)" not in message.text:
            errors.append(f"console: {message.text}")

    page.on("console", on_console)
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.on(
        "response",
        lambda response: (
            errors.append(f"response: {response.status} {response.url}")
            if response.status >= 400 and urlparse(response.url).path != "/api/auth/refresh"
            else None
        ),
    )
    page.on(
        "requestfailed",
        lambda request: (
            errors.append(f"requestfailed: {request.url} - {request.failure}")
            if "ERR_ABORTED" not in str(request.failure)
            else None
        ),
    )


def assert_page_quality(page):
    expect(page.locator("main")).to_have_count(1)
    expect(page.locator("main h1:visible")).to_have_count(1)

    metrics = page.evaluate(
        """
        () => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          unnamedButtons: [...document.querySelectorAll('button')]
            .filter((el) => el.offsetParent !== null)
            .filter((el) => !(el.innerText.trim() || el.getAttribute('aria-label') || el.title))
            .length,
          imagesWithoutAlt: [...document.querySelectorAll('img')]
            .filter((el) => !el.hasAttribute('alt'))
            .length,
          fontReady: document.fonts.check('16px "Be Vietnam Pro"'),
        })
        """
    )
    if metrics["scroll"] > metrics["viewport"] + 1:
        raise AssertionError(f"Horizontal overflow: {metrics}")
    if metrics["unnamedButtons"]:
        raise AssertionError(f"Visible unnamed buttons: {metrics['unnamedButtons']}")
    if metrics["imagesWithoutAlt"]:
        raise AssertionError(f"Images without alt: {metrics['imagesWithoutAlt']}")
    if not metrics["fontReady"]:
        raise AssertionError("Be Vietnam Pro did not load")


def capture(page, filename, full_page=False):
    page.screenshot(path=str(ARTIFACTS / filename), full_page=full_page)


def run_desktop(browser):
    errors = []
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    install_api_mocks(context, authenticated=True)
    page = context.new_page()
    attach_error_capture(page, errors)

    page.goto(BASE_URL, wait_until="networkidle")
    if page.get_by_role("heading", name=re.compile("Mua quà Việt theo cách của bạn")).count() == 0:
        print(json.dumps({
            "debugUrl": page.url,
            "debugBody": page.locator("body").inner_text()[:1200],
            "debugErrors": errors,
        }, ensure_ascii=False))
    expect(page.get_by_role("heading", name=re.compile("Mua quà Việt theo cách của bạn"))).to_be_visible()
    expect(page.get_by_role("link", name=re.compile("Mua sắm nhanh"))).to_be_visible()
    page.get_by_role("link", name=re.compile("Khám phá bản đồ")).click()
    expect(page).to_have_url(re.compile(r"/explore$"))
    expect(page.get_by_role("heading", name=re.compile("Chạm vào một vùng"))).to_be_visible()
    expect(page.get_by_role("link", name="Khám phá văn hóa Hà Nội")).to_be_visible()
    page.get_by_role("link", name="Khám phá văn hóa Hội An").hover()
    expect(page.get_by_role("heading", name="Làng mộc Kim Bồng")).to_be_visible()
    assert_page_quality(page)
    capture(page, "home-desktop.png")

    page.get_by_role("link", name="Khám phá văn hóa Hội An").click()
    expect(page).to_have_url(re.compile(r"/culture/hoi-an$"))
    expect(page.get_by_role("heading", name="Hội An", exact=True)).to_be_visible()
    expect(page.get_by_role("heading", name="Câu chuyện trước khi thành món quà")).to_be_visible()
    expect(page.get_by_role("heading", name="Làng mộc Kim Bồng")).to_be_visible()
    assert_page_quality(page)
    capture(page, "culture-hoi-an-desktop.png", full_page=True)

    page.goto(f"{BASE_URL}/products/{PRODUCTS[3]['id']}", wait_until="networkidle")
    expect(page.get_by_role("heading", name=PRODUCTS[3]["name"])).to_be_visible()
    expect(page.get_by_role("link", name=re.compile("Sản phẩm thuộc Làng mộc Kim Bồng"))).to_be_visible()
    assert_page_quality(page)

    page.goto(f"{BASE_URL}/products", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Khám phá sản phẩm")).to_be_visible()
    expect(page.locator("article")).to_have_count(len(PRODUCTS))
    assert_page_quality(page)
    capture(page, "products-desktop.png", full_page=True)

    page.get_by_role("button", name=re.compile("Thêm .* vào giỏ")).first.click()
    expect(page.get_by_role("link", name=re.compile("Giỏ hàng có 1 sản phẩm"))).to_be_visible()
    page.goto(f"{BASE_URL}/cart", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Giỏ hàng của bạn")).to_be_visible()
    assert_page_quality(page)

    page.get_by_role("link", name="Tiến hành thanh toán").click()
    expect(page).to_have_url(re.compile(r"/checkout$"))
    expect(page.get_by_role("heading", name="Thanh toán an toàn")).to_be_visible()
    expect(page.get_by_role("button", name=re.compile("Đặt hàng an toàn"))).to_be_visible()
    assert_page_quality(page)
    capture(page, "checkout-desktop.png", full_page=True)

    page.goto(f"{BASE_URL}/blogs", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Câu chuyện quà Việt")).to_be_visible()
    assert_page_quality(page)
    capture(page, "stories-desktop.png")

    page.goto(f"{BASE_URL}/policy", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Rõ ràng trước khi bạn đặt hàng.")).to_be_visible()
    assert_page_quality(page)

    page.goto(f"{BASE_URL}/not-a-real-route", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Trang này không còn ở đây.")).to_be_visible()
    assert_page_quality(page)

    context.close()
    return errors


def run_mobile(browser):
    errors = []
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    install_api_mocks(context, authenticated=False)
    page = context.new_page()
    attach_error_capture(page, errors)

    page.goto(BASE_URL, wait_until="networkidle")
    expect(page.get_by_role("heading", name=re.compile("Mua quà Việt theo cách của bạn"))).to_be_visible()
    assert_page_quality(page)
    capture(page, "home-mobile.png")

    page.get_by_role("link", name=re.compile("Khám phá bản đồ")).click()
    expect(page).to_have_url(re.compile(r"/explore$"))
    expect(page.get_by_role("heading", name=re.compile("Chạm vào một vùng"))).to_be_visible()
    assert_page_quality(page)

    menu = page.get_by_role("button", name="Mở menu")
    menu.click()
    expect(page.get_by_role("navigation", name="Điều hướng di động")).to_be_visible()
    assert_page_quality(page)
    capture(page, "menu-mobile.png")

    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Chào mừng bạn trở lại")).to_be_visible()
    assert_page_quality(page)
    capture(page, "login-mobile.png", full_page=True)

    context.close()
    return errors


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        errors = run_desktop(browser) + run_mobile(browser)
        browser.close()

    if errors:
        raise AssertionError("\n".join(errors))

    result = {
        "status": "passed",
        "viewports": ["1440x1000", "390x844"],
        "screenshots": sorted(path.name for path in ARTIFACTS.glob("*.png")),
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
