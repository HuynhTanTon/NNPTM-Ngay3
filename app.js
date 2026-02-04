/**
 * Dashboard Quản lý Sản phẩm - Bai3_0402
 * API: https://api.escuelajs.co/api/v1/products
 */

const API_PRODUCTS = 'https://api.escuelajs.co/api/v1/products';
const API_CATEGORIES = 'https://api.escuelajs.co/api/v1/categories';

/** Danh sách sản phẩm gốc từ API (dùng cho tìm kiếm, phân trang, sắp xếp) */
let allProducts = [];

/** Danh sách category cho dropdown (tạo/sửa) */
let allCategories = [];

/** Phân trang: trang hiện tại (1-based), số item mỗi trang */
let currentPage = 1;
let pageSize = 10;

/** Sắp xếp: cột đang chọn ('title' | 'price'), hướng 'asc' | 'desc' */
let sortBy = '';
let sortDir = 'asc';

/**
 * Lấy danh sách sản phẩm từ API
 */
async function fetchProducts() {
    try {
        const response = await fetch(API_PRODUCTS);
        if (!response.ok) {
            throw new Error('Không thể tải dữ liệu từ API');
        }
        return await response.json();
    } catch (error) {
        console.error('Lỗi fetch products:', error);
        return [];
    }
}

/**
 * Lấy danh sách categories từ API (cho form tạo/sửa)
 */
async function fetchCategories() {
    try {
        const response = await fetch(API_CATEGORIES);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('Lỗi fetch categories:', error);
        return [];
    }
}

/** Điền option category vào select (id + name) */
function fillCategorySelect(selectEl, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">-- Chọn category --</option>';
    allCategories.forEach(function (cat) {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name || ('ID ' + cat.id);
        if (selectedId != null && cat.id === selectedId) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

/**
 * Hiển thị danh sách sản phẩm vào bảng (Bootstrap table)
 * Các cột: id, title, price, category.name, images (1 ảnh đại diện)
 */
function renderProductTable(products) {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;

    disposeRowTooltips(tbody);

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Không có dữ liệu.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(function (product) {
        const categoryName = product.category ? product.category.name : '-';
        const imageUrl = getFirstImageUrl(product);

        const imgSrc = imageUrl ? String(imageUrl).replace(/"/g, '&quot;') : '';
        const imgTag = imgSrc
            ? `<img src="${imgSrc}" alt="${escapeHtml(product.title || 'Product')}" class="img-thumbnail" style="max-width: 60px; max-height: 60px; object-fit: cover;" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling && (this.nextElementSibling.style.display='inline');">
                   <span class="text-muted small" style="display: none;">Lỗi tải ảnh</span>`
            : '<span class="text-muted">-</span>';

        const description = product.description ? String(product.description).trim() : 'Không có mô tả';

        return `
            <tr data-bs-toggle="tooltip" data-bs-placement="top" data-bs-html="false" title="${escapeAttr(description)}" data-product-id="${product.id}" role="button">
                <td>${product.id}</td>
                <td>${escapeHtml(product.title)}</td>
                <td>${product.price}</td>
                <td>${escapeHtml(categoryName)}</td>
                <td>${imgTag}</td>
                <td><button type="button" class="btn btn-sm btn-outline-primary btn-view" data-product-id="${product.id}">View</button></td>
            </tr>
        `;
    }).join('');

    initRowTooltips();
}

/** Hủy tooltip cũ trước khi render lại */
function disposeRowTooltips(tbody) {
    if (!tbody) return;
    tbody.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
        const instance = bootstrap.Tooltip.getInstance(el);
        if (instance) instance.dispose();
    });
}

/** Khởi tạo Bootstrap Tooltip cho các dòng bảng (hiển thị description khi hover) */
function initRowTooltips() {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
        new bootstrap.Tooltip(el);
    });
}

/** Tìm sản phẩm theo id trong allProducts (hoặc từ API nếu cần đầy đủ) */
function findProductById(id) {
    const numId = parseInt(id, 10);
    return allProducts.find(function (p) { return p.id === numId; }) || null;
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Escape cho thuộc tính HTML (title, data-*) để tránh vỡ attribute */
function escapeAttr(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Lấy URL ảnh đại diện (ảnh đầu tiên) từ product, an toàn với mảng/chuỗi */
function getFirstImageUrl(product) {
    const images = product.images;
    if (!images) return '';
    if (Array.isArray(images) && images.length > 0) {
        const first = images[0];
        return typeof first === 'string' ? first : '';
    }
    if (typeof images === 'string') {
        try {
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string' ? parsed[0] : '';
        } catch (_) {
            return images;
        }
    }
    return '';
}

/**
 * Lọc sản phẩm theo title (real-time, không phân biệt hoa thường)
 */
function filterProductsByTitle(products, keyword) {
    if (!keyword || !String(keyword).trim()) return products;
    const k = String(keyword).trim().toLowerCase();
    return products.filter(function (p) {
        const title = p.title ? String(p.title).toLowerCase() : '';
        return title.indexOf(k) !== -1;
    });
}

/**
 * Lấy danh sách đang áp dụng filter (tìm kiếm)
 */
function getFilteredProducts() {
    var keyword = document.getElementById('searchTitle');
    var k = keyword ? keyword.value : '';
    return filterProductsByTitle(allProducts, k);
}

/**
 * Sắp xếp mảng sản phẩm theo sortBy và sortDir (không thay đổi mảng gốc)
 */
function sortProducts(products, by, dir) {
    if (!by || !products || products.length === 0) return products.slice();
    var arr = products.slice();
    var isAsc = dir === 'asc';
    if (by === 'title') {
        arr.sort(function (a, b) {
            var x = (a.title != null) ? String(a.title) : '';
            var y = (b.title != null) ? String(b.title) : '';
            return isAsc ? x.localeCompare(y) : y.localeCompare(x);
        });
    } else if (by === 'price') {
        arr.sort(function (a, b) {
            var x = Number(a.price);
            var y = Number(b.price);
            if (isNaN(x)) x = 0;
            if (isNaN(y)) y = 0;
            return isAsc ? x - y : y - x;
        });
    }
    return arr;
}

/**
 * Lấy danh sách đã filter + sắp xếp (dùng cho phân trang và export)
 */
function getDisplayProducts() {
    var filtered = getFilteredProducts();
    return sortProducts(filtered, sortBy, sortDir);
}

/**
 * Cập nhật icon sắp xếp trên header
 */
function updateSortIcons() {
    var titleIcon = document.getElementById('sortTitleIcon');
    var priceIcon = document.getElementById('sortPriceIcon');
    if (titleIcon) titleIcon.textContent = sortBy === 'title' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
    if (priceIcon) priceIcon.textContent = sortBy === 'price' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
}

/**
 * Áp dụng phân trang + filter + sắp xếp và cập nhật bảng
 */
function applyPagination() {
    var display = getDisplayProducts();
    var total = display.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.max(1, Math.min(currentPage, totalPages));

    var start = (currentPage - 1) * pageSize;
    var pageProducts = display.slice(start, start + pageSize);

    renderProductTable(pageProducts);
    updateSortIcons();

    var pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.textContent = 'Trang ' + currentPage + ' / ' + totalPages;

    var btnPrev = document.getElementById('btnPrev');
    var btnNext = document.getElementById('btnNext');
    if (btnPrev) {
        btnPrev.disabled = currentPage <= 1;
        btnPrev.closest('.page-item').classList.toggle('disabled', currentPage <= 1);
    }
    if (btnNext) {
        btnNext.disabled = currentPage >= totalPages;
        btnNext.closest('.page-item').classList.toggle('disabled', currentPage >= totalPages);
    }
}

/**
 * Áp dụng tìm kiếm (reset về trang 1) và cập nhật bảng
 */
function applySearch() {
    currentPage = 1;
    applyPagination();
}

/**
 * Escape một ô cho CSV (bao bằng dấu ngoặc kép nếu có dấu phẩy, xuống dòng hoặc ngoặc kép)
 */
function escapeCsvCell(str) {
    if (str == null) return '';
    var s = String(str);
    if (/[",\r\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

/**
 * Xuất CSV: chỉ dữ liệu đang hiển thị (đúng filter, sort, pagination hiện tại)
 * File: products.csv
 */
function exportCSV() {
    var display = getDisplayProducts();
    var start = (currentPage - 1) * pageSize;
    var pageProducts = display.slice(start, start + pageSize);

    var headers = ['id', 'title', 'price', 'category', 'images'];
    var rows = [headers.join(',')];

    pageProducts.forEach(function (p) {
        var categoryName = (p.category && p.category.name) ? p.category.name : '';
        var imageUrl = getFirstImageUrl(p);
        var row = [
            escapeCsvCell(p.id),
            escapeCsvCell(p.title),
            escapeCsvCell(p.price),
            escapeCsvCell(categoryName),
            escapeCsvCell(imageUrl)
        ];
        rows.push(row.join(','));
    });

    var csv = rows.join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Mở modal xem chi tiết sản phẩm (chế độ xem)
 */
function openDetailModal(product) {
    if (!product) return;
    var view = document.getElementById('productDetailView');
    var edit = document.getElementById('productDetailEdit');
    var btnEdit = document.getElementById('btnEditProduct');
    var btnSave = document.getElementById('btnSaveProduct');
    var btnCancel = document.getElementById('btnCancelEdit');
    if (!view || !edit) return;

    view.classList.remove('d-none');
    edit.classList.add('d-none');
    btnEdit.classList.remove('d-none');
    btnSave.classList.add('d-none');
    btnCancel.classList.add('d-none');

    document.getElementById('detailId').textContent = product.id;
    document.getElementById('detailTitle').textContent = product.title || '-';
    document.getElementById('detailPrice').textContent = product.price != null ? product.price : '-';
    document.getElementById('detailDescription').textContent = product.description || '-';
    document.getElementById('detailCategory').textContent = product.category ? product.category.name : '-';
    var imgs = product.images;
    var imgHtml = '-';
    if (Array.isArray(imgs) && imgs.length > 0) {
        imgHtml = imgs.map(function (url) { return '<img src="' + escapeAttr(url) + '" alt="" class="img-thumbnail me-1" style="max-width:80px;max-height:80px;object-fit:cover;">'; }).join('');
    } else if (typeof imgs === 'string') {
        try {
            var arr = JSON.parse(imgs);
            if (Array.isArray(arr) && arr.length > 0) imgHtml = arr.map(function (url) { return '<img src="' + escapeAttr(url) + '" alt="" class="img-thumbnail me-1" style="max-width:80px;max-height:80px;">'; }).join('');
        } catch (_) { imgHtml = escapeHtml(imgs); }
    }
    document.getElementById('detailImages').innerHTML = imgHtml;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editTitle').value = product.title || '';
    document.getElementById('editPrice').value = product.price != null ? product.price : '';
    document.getElementById('editDescription').value = product.description || '';
    var catId = product.category ? product.category.id : '';
    fillCategorySelect(document.getElementById('editCategoryId'), catId);
    var imgArr = product.images;
    var imgLines = '';
    if (Array.isArray(imgArr)) imgLines = imgArr.join('\n');
    else if (typeof imgArr === 'string') {
        try { var a = JSON.parse(imgArr); if (Array.isArray(a)) imgLines = a.join('\n'); else imgLines = imgArr; } catch (_) { imgLines = imgArr; }
    }
    document.getElementById('editImages').value = imgLines;

    var modalEl = document.getElementById('productDetailModal');
    var modal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function onHidden() {
        switchDetailToView();
        modalEl.removeEventListener('hidden.bs.modal', onHidden);
    }, { once: true });
    modal.show();
}

/** Chuyển modal chi tiết sang chế độ chỉnh sửa */
function switchDetailToEdit() {
    document.getElementById('productDetailView').classList.add('d-none');
    document.getElementById('productDetailEdit').classList.remove('d-none');
    document.getElementById('btnEditProduct').classList.add('d-none');
    document.getElementById('btnSaveProduct').classList.remove('d-none');
    document.getElementById('btnCancelEdit').classList.remove('d-none');
}

/** Chuyển modal chi tiết về chế độ xem */
function switchDetailToView() {
    document.getElementById('productDetailView').classList.remove('d-none');
    document.getElementById('productDetailEdit').classList.add('d-none');
    document.getElementById('btnEditProduct').classList.remove('d-none');
    document.getElementById('btnSaveProduct').classList.add('d-none');
    document.getElementById('btnCancelEdit').classList.add('d-none');
}

/** Parse images từ textarea (mỗi dòng một URL) */
function parseImagesFromTextarea(text) {
    if (!text || !String(text).trim()) return [];
    return String(text).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
}

/**
 * Gọi PUT API cập nhật sản phẩm, sau đó refresh danh sách
 */
async function saveProductUpdate() {
    var idEl = document.getElementById('editProductId');
    var id = idEl ? idEl.value : '';
    if (!id) return;
    var title = document.getElementById('editTitle').value.trim();
    var price = document.getElementById('editPrice').value;
    var description = document.getElementById('editDescription').value.trim();
    var categoryId = document.getElementById('editCategoryId').value;
    var images = parseImagesFromTextarea(document.getElementById('editImages').value);

    if (!title) { alert('Vui lòng nhập Title.'); return; }
    var priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { alert('Price không hợp lệ.'); return; }

    var body = { title: title, price: priceNum };
    if (description !== '') body.description = description;
    if (categoryId) body.categoryId = parseInt(categoryId, 10);
    if (images.length > 0) body.images = images;

    try {
        var res = await fetch(API_PRODUCTS + '/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Cập nhật thất bại: ' + res.status);
        var updated = await res.json();
        var idx = allProducts.findIndex(function (p) { return p.id === parseInt(id, 10); });
        if (idx !== -1) allProducts[idx] = updated;
        bootstrap.Modal.getInstance(document.getElementById('productDetailModal')).hide();
        switchDetailToView();
        applyPagination();
    } catch (err) {
        console.error(err);
        alert('Không thể cập nhật: ' + (err.message || 'Lỗi mạng'));
    }
}

/**
 * Mở modal tạo mới sản phẩm
 */
function openCreateModal() {
    document.getElementById('createTitle').value = '';
    document.getElementById('createPrice').value = '';
    document.getElementById('createDescription').value = '';
    document.getElementById('createImages').value = 'https://placehold.co/600x400';
    fillCategorySelect(document.getElementById('createCategoryId'), null);
    var modal = new bootstrap.Modal(document.getElementById('productCreateModal'));
    modal.show();
}

/**
 * Submit tạo sản phẩm: POST API, refresh danh sách, đóng modal
 */
async function submitCreateProduct() {
    var title = document.getElementById('createTitle').value.trim();
    var price = document.getElementById('createPrice').value;
    var description = document.getElementById('createDescription').value.trim();
    var categoryId = document.getElementById('createCategoryId').value;
    var images = parseImagesFromTextarea(document.getElementById('createImages').value);

    if (!title) { alert('Vui lòng nhập Title.'); return; }
    var priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { alert('Price không hợp lệ.'); return; }
    if (!description) { alert('Vui lòng nhập Description.'); return; }
    if (!categoryId) { alert('Vui lòng chọn Category.'); return; }
    if (images.length === 0) { alert('Vui lòng nhập ít nhất một URL ảnh.'); return; }

    try {
        var res = await fetch(API_PRODUCTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                price: priceNum,
                description: description,
                categoryId: parseInt(categoryId, 10),
                images: images
            })
        });
        if (!res.ok) throw new Error('Tạo mới thất bại: ' + res.status);
        var newProduct = await res.json();
        allProducts.unshift(newProduct);
        bootstrap.Modal.getInstance(document.getElementById('productCreateModal')).hide();
        currentPage = 1;
        applyPagination();
    } catch (err) {
        console.error(err);
        alert('Không thể tạo sản phẩm: ' + (err.message || 'Lỗi mạng'));
    }
}

/**
 * Khởi tạo: load dữ liệu, hiển thị, gắn sự kiện tìm kiếm và phân trang
 */
async function init() {
    allProducts = await fetchProducts();
    allCategories = await fetchCategories();

    var searchInput = document.getElementById('searchTitle');
    if (searchInput) searchInput.addEventListener('input', applySearch);

    var pageSizeSelect = document.getElementById('pageSize');
    if (pageSizeSelect) {
        pageSize = parseInt(pageSizeSelect.value, 10) || 10;
        pageSizeSelect.addEventListener('change', function () {
            pageSize = parseInt(this.value, 10) || 10;
            currentPage = 1;
            applyPagination();
        });
    }

    var btnPrev = document.getElementById('btnPrev');
    var btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            applyPagination();
        }
    });
    if (btnNext) btnNext.addEventListener('click', function () {
        var display = getDisplayProducts();
        var totalPages = Math.max(1, Math.ceil(display.length / pageSize));
        if (currentPage < totalPages) {
            currentPage++;
            applyPagination();
        }
    });

    var sortTitle = document.getElementById('sortTitle');
    var sortPrice = document.getElementById('sortPrice');
    if (sortTitle) sortTitle.addEventListener('click', function () {
        if (sortBy === 'title') sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortBy = 'title'; sortDir = 'asc'; }
        currentPage = 1;
        applyPagination();
    });
    if (sortPrice) sortPrice.addEventListener('click', function () {
        if (sortBy === 'price') sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortBy = 'price'; sortDir = 'asc'; }
        currentPage = 1;
        applyPagination();
    });

    var btnExportCsv = document.getElementById('btnExportCsv');
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportCSV);

    var btnCreateProduct = document.getElementById('btnCreateProduct');
    if (btnCreateProduct) btnCreateProduct.addEventListener('click', openCreateModal);

    var btnSubmitCreate = document.getElementById('btnSubmitCreate');
    if (btnSubmitCreate) btnSubmitCreate.addEventListener('click', submitCreateProduct);

    var btnEditProduct = document.getElementById('btnEditProduct');
    if (btnEditProduct) btnEditProduct.addEventListener('click', switchDetailToEdit);
    var btnCancelEdit = document.getElementById('btnCancelEdit');
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', switchDetailToView);
    var btnSaveProduct = document.getElementById('btnSaveProduct');
    if (btnSaveProduct) btnSaveProduct.addEventListener('click', saveProductUpdate);

    var tbody = document.getElementById('productTableBody');
    if (tbody) {
        tbody.addEventListener('click', function (e) {
            var row = e.target.closest('tr[data-product-id]');
            if (!row) return;
            if (e.target.closest('.btn-view')) {
                e.preventDefault();
                e.stopPropagation();
            }
            var id = row.getAttribute('data-product-id');
            var product = findProductById(id);
            if (product) openDetailModal(product);
        });
    }

    applyPagination();
}

init();
