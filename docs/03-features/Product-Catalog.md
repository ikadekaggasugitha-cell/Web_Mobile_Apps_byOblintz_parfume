# Product Catalog

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Product Catalog |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Product Catalog adalah fitur utama untuk menampilkan dan mencari produk parfum OBLINTZ.

---

## 2. Features

### 2.1 Product Listing

| Feature | Description |
|---------|-------------|
| Grid View | Tampilan produk dalam grid 2-4 kolom |
| List View | Tampilan produk dalam list |
| Sorting | Popular, Newest, Price (Low-High, High-Low) |
| Pagination | Infinite scroll atau传统 pagination |

### 2.2 Filtering

| Filter | Options |
|--------|---------|
| Category | Floral, Woody, Citrus, Oriental, Fresh, Gourmand |
| Price Range | Slider atau predefined ranges |
| Occasion | Romantic, Formal, Casual, Party, Daily |
| Size | 30ml, 50ml, 100ml |
| Stock | In Stock, Out of Stock |

### 2.3 Search

| Feature | Description |
|---------|-------------|
| Autocomplete | Suggestions saat typing |
| Fuzzy Matching | Typo tolerance |
| Search History | Recent searches |
| Popular Searches | Trending searches |

### 2.4 Product Detail

| Field | Description |
|-------|-------------|
| Name | Product name |
| Price | Current price |
| Compare Price | Original price (if discounted) |
| Description | Product description |
| Notes | Top, Middle, Base notes |
| Occasions | Suitable occasions |
| Images | Multiple images with zoom |
| Stock | Available quantity |
| Reviews | Customer reviews |
| Related Products | Similar products |

---

## 3. User Flow

```
Homepage
   │
   ▼
Browse Products
   │
   ├──► Filter/Sort
   │
   ├──► Search
   │
   ▼
Product Detail
   │
   ├──► Add to Cart
   │
   ├──► Add to Wishlist
   │
   ├──► View Reviews
   │
   └──► View Related Products
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /products | List products |
| GET | /products/:slug | Product detail |
| GET | /products/search | Search products |
| GET | /products/:slug/related | Related products |
| GET | /categories | List categories |
| GET | /categories/:slug | Category products |

---

## 5. Admin Management

- CRUD produk
- Bulk upload (CSV/Excel)
- Multi-image upload
- Category management
- Inventory tracking
- SEO metadata

---

**Version**: 1.0
**Last Updated**: 28 August 2026
