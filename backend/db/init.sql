-- Create database (run once)
CREATE DATABASE IF NOT EXISTS cloudretail
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE cloudretail;

-- =========================================================
-- USER SERVICE OWNERSHIP
-- Tables: users, addresses
-- =========================================================

CREATE TABLE users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email           VARCHAR(255)    NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(255)    NOT NULL,
    role            ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE addresses (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    label           VARCHAR(100)    NULL,                 -- e.g. "Home", "Work"
    line1           VARCHAR(255)    NOT NULL,
    line2           VARCHAR(255)    NULL,
    city            VARCHAR(100)    NOT NULL,
    state           VARCHAR(100)    NULL,
    postal_code     VARCHAR(50)     NULL,
    country         VARCHAR(100)    NOT NULL,
    is_default      TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_addresses_user_id (user_id),
    CONSTRAINT fk_addresses_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- PRODUCT SERVICE OWNERSHIP
-- Tables: categories, products
-- =========================================================

CREATE TABLE categories (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100)    NOT NULL,
    description     TEXT            NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_categories_name (name)
) ENGINE=InnoDB;

CREATE TABLE products (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT            NULL,
    price           DECIMAL(10,2)   NOT NULL,
    image_url       VARCHAR(1024)   NULL,                 -- per your requirement
    category_id     BIGINT UNSIGNED NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_products_category_id (category_id),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- INVENTORY SERVICE OWNERSHIP
-- Tables: inventory
-- =========================================================

CREATE TABLE inventory (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id              BIGINT UNSIGNED NOT NULL,
    quantity_available      INT             NOT NULL DEFAULT 0,
    quantity_reserved       INT             NOT NULL DEFAULT 0,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_inventory_product_id (product_id),
    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- ORDER SERVICE OWNERSHIP
-- Tables: orders, order_items
-- =========================================================

CREATE TABLE orders (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT UNSIGNED NOT NULL,
    status                  ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    total_amount            DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    shipping_address_id     BIGINT UNSIGNED NULL,         -- snapshot or reference; we keep it simple as FK
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_orders_user_id (user_id),
    KEY idx_orders_status (status),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_shipping_address
        FOREIGN KEY (shipping_address_id) REFERENCES addresses(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id        BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    quantity        INT             NOT NULL,
    unit_price      DECIMAL(10,2)   NOT NULL,
    line_total      DECIMAL(10,2)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_order_items_order_id (order_id),
    KEY idx_order_items_product_id (product_id),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================================================
-- PAYMENT SERVICE OWNERSHIP
-- Tables: payments
-- =========================================================

CREATE TABLE payments (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id                BIGINT UNSIGNED NOT NULL,
    amount                  DECIMAL(10,2)   NOT NULL,
    status                  ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    payment_method          VARCHAR(50)     NOT NULL DEFAULT 'CARD',  -- or "SIMULATED"
    provider_reference      VARCHAR(255)    NULL,                     -- simulated external transaction id
    error_message           VARCHAR(255)    NULL,                     -- for FAILED status
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_payments_order_id (order_id),
    KEY idx_payments_status (status),
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- SEED DATA
-- 5 categories, 10 products per category, inventory for each product
-- Prices in LKR, images from picsum.photos
-- =========================================================

-- Seed categories (will get IDs 1..5)
INSERT INTO categories (name, description) VALUES
('Electronics', 'Phones, tablets, and electronic accessories.'),
('Home & Kitchen', 'Home appliances and kitchen essentials.'),
('Fashion', 'Clothing, footwear, and accessories.'),
('Health & Beauty', 'Personal care and beauty products.'),
('Sports & Outdoors', 'Sports equipment and outdoor gear.');

-- Seed products (50 products = 10 per category)
INSERT INTO products (name, description, price, image_url, category_id, is_active) VALUES
-- Electronics (category_id = 1)
('Smartphone A1', 'Entry-level smartphone with 64GB storage and dual camera.', 75000.00, 'https://picsum.photos/seed/electronics1/600/400', 1, 1),
('Smartphone A2', 'Mid-range smartphone with 128GB storage and fast charging.', 115000.00, 'https://picsum.photos/seed/electronics2/600/400', 1, 1),
('Tablet T1', '10-inch tablet suitable for media and light productivity.', 98000.00, 'https://picsum.photos/seed/electronics3/600/400', 1, 1),
('Wireless Earbuds', 'True wireless earbuds with noise isolation and charging case.', 14500.00, 'https://picsum.photos/seed/electronics4/600/400', 1, 1),
('Bluetooth Speaker', 'Portable Bluetooth speaker with deep bass.', 18500.00, 'https://picsum.photos/seed/electronics5/600/400', 1, 1),
('Laptop Sleeve 15.6"', 'Shock-resistant laptop sleeve for 15.6-inch devices.', 5500.00, 'https://picsum.photos/seed/electronics6/600/400', 1, 1),
('Power Bank 10000mAh', 'Compact power bank with dual USB output.', 8900.00, 'https://picsum.photos/seed/electronics7/600/400', 1, 1),
('USB-C Fast Charger', '30W USB-C fast wall charger for phones and tablets.', 6400.00, 'https://picsum.photos/seed/electronics8/600/400', 1, 1),
('Gaming Mouse', 'Ergonomic gaming mouse with adjustable DPI.', 9200.00, 'https://picsum.photos/seed/electronics9/600/400', 1, 1),
('Mechanical Keyboard', 'Mechanical keyboard with blue switches and RGB backlight.', 18500.00, 'https://picsum.photos/seed/electronics10/600/400', 1, 1),

-- Home & Kitchen (category_id = 2)
('Electric Kettle 1.7L', 'Stainless steel electric kettle with auto shut-off.', 9500.00, 'https://picsum.photos/seed/home1/600/400', 2, 1),
('Non-stick Frying Pan 28cm', 'Durable non-stick frying pan for everyday cooking.', 7200.00, 'https://picsum.photos/seed/home2/600/400', 2, 1),
('Blender 1.5L', 'Multi-speed blender for juices and smoothies.', 14200.00, 'https://picsum.photos/seed/home3/600/400', 2, 1),
('Air Fryer 4L', 'Oil-free air fryer for healthier frying.', 34500.00, 'https://picsum.photos/seed/home4/600/400', 2, 1),
('Rice Cooker 1.8L', 'Automatic rice cooker with keep-warm function.', 16800.00, 'https://picsum.photos/seed/home5/600/400', 2, 1),
('Dish Drying Rack', 'Two-tier dish rack with cutlery holder.', 6800.00, 'https://picsum.photos/seed/home6/600/400', 2, 1),
('Knife Set 5pcs', 'Stainless steel knife set with wooden block.', 11500.00, 'https://picsum.photos/seed/home7/600/400', 2, 1),
('Storage Container Set', 'Set of 6 airtight food storage containers.', 8300.00, 'https://picsum.photos/seed/home8/600/400', 2, 1),
('Coffee Maker 6-cup', 'Drip coffee maker suitable for home use.', 19500.00, 'https://picsum.photos/seed/home9/600/400', 2, 1),
('LED Desk Lamp', 'Adjustable LED desk lamp with touch dimmer.', 5600.00, 'https://picsum.photos/seed/home10/600/400', 2, 1),

-- Fashion (category_id = 3)
('Classic T-Shirt', 'Unisex cotton t-shirt with classic fit.', 2800.00, 'https://picsum.photos/seed/fashion1/600/400', 3, 1),
('Slim Fit Jeans', 'Slim fit denim jeans for everyday wear.', 7200.00, 'https://picsum.photos/seed/fashion2/600/400', 3, 1),
('Unisex Hoodie', 'Fleece-lined hoodie suitable for casual wear.', 8500.00, 'https://picsum.photos/seed/fashion3/600/400', 3, 1),
('White Sneakers', 'Low-top white sneakers with rubber sole.', 11500.00, 'https://picsum.photos/seed/fashion4/600/400', 3, 1),
('Leather Belt', 'Genuine leather belt with metal buckle.', 4300.00, 'https://picsum.photos/seed/fashion5/600/400', 3, 1),
('Casual Backpack', 'Lightweight backpack with laptop compartment.', 9600.00, 'https://picsum.photos/seed/fashion6/600/400', 3, 1),
('Sunglasses UV400', 'UV400 protected sunglasses with classic frame.', 4100.00, 'https://picsum.photos/seed/fashion7/600/400', 3, 1),
('Minimal Wrist Watch', 'Minimal analog wrist watch with leather strap.', 13800.00, 'https://picsum.photos/seed/fashion8/600/400', 3, 1),
('Sport Socks 3-pack', 'Pack of three breathable sport socks.', 1900.00, 'https://picsum.photos/seed/fashion9/600/400', 3, 1),
('Adjustable Cap', 'Adjustable cotton cap with curved brim.', 2600.00, 'https://picsum.photos/seed/fashion10/600/400', 3, 1),

-- Health & Beauty (category_id = 4)
('Gentle Face Wash', 'Daily gentle face wash suitable for all skin types.', 3200.00, 'https://picsum.photos/seed/beauty1/600/400', 4, 1),
('Moisturising Cream', 'Hydrating moisturiser for dry and normal skin.', 5400.00, 'https://picsum.photos/seed/beauty2/600/400', 4, 1),
('Shampoo 500ml', 'Anti-dandruff shampoo for daily use.', 3800.00, 'https://picsum.photos/seed/beauty3/600/400', 4, 1),
('Conditioner 500ml', 'Nourishing conditioner for smooth hair.', 3800.00, 'https://picsum.photos/seed/beauty4/600/400', 4, 1),
('Body Lotion 400ml', 'Lightweight body lotion for soft skin.', 4100.00, 'https://picsum.photos/seed/beauty5/600/400', 4, 1),
('Toothbrush Pack 4pcs', 'Pack of four soft bristle toothbrushes.', 1600.00, 'https://picsum.photos/seed/beauty6/600/400', 4, 1),
('Electric Trimmer', 'Rechargeable grooming trimmer with multiple heads.', 7200.00, 'https://picsum.photos/seed/beauty7/600/400', 4, 1),
('Hair Dryer 2000W', 'Compact 2000W hair dryer with cool shot.', 8900.00, 'https://picsum.photos/seed/beauty8/600/400', 4, 1),
('Perfume 50ml', 'Fresh unisex fragrance, 50ml bottle.', 12500.00, 'https://picsum.photos/seed/beauty9/600/400', 4, 1),
('Makeup Brush Set', 'Set of 10 makeup brushes with pouch.', 6800.00, 'https://picsum.photos/seed/beauty10/600/400', 4, 1),

-- Sports & Outdoors (category_id = 5)
('Yoga Mat', 'Non-slip yoga mat with carrying strap.', 5200.00, 'https://picsum.photos/seed/sports1/600/400', 5, 1),
('Dumbbell Set 10kg', 'Pair of adjustable dumbbells totaling 10kg.', 18500.00, 'https://picsum.photos/seed/sports2/600/400', 5, 1),
('Jump Rope', 'Adjustable-length jump rope for cardio training.', 1900.00, 'https://picsum.photos/seed/sports3/600/400', 5, 1),
('Football Size 5', 'Standard size 5 football suitable for outdoor play.', 4600.00, 'https://picsum.photos/seed/sports4/600/400', 5, 1),
('Badminton Racket', 'Lightweight aluminum badminton racket.', 5200.00, 'https://picsum.photos/seed/sports5/600/400', 5, 1),
('Water Bottle 1L', 'Reusable 1L BPA-free sports water bottle.', 2200.00, 'https://picsum.photos/seed/sports6/600/400', 5, 1),
('Hiking Backpack 30L', '30L hiking backpack with multiple compartments.', 14500.00, 'https://picsum.photos/seed/sports7/600/400', 5, 1),
('Camping Lantern', 'Rechargeable LED camping lantern with hook.', 6200.00, 'https://picsum.photos/seed/sports8/600/400', 5, 1),
('Cycling Gloves', 'Padded cycling gloves for better grip and comfort.', 3600.00, 'https://picsum.photos/seed/sports9/600/400', 5, 1),
('Fitness Tracker Band', 'Fitness tracker band with heart rate monitor.', 9800.00, 'https://picsum.photos/seed/sports10/600/400', 5, 1);

-- Seed inventory (one row per product, product_id 1..50)
INSERT INTO inventory (product_id, quantity_available, quantity_reserved) VALUES
(1,  120, 10),
(2,  80,  5),
(3,  60,  4),
(4,  150, 12),
(5,  90,  6),
(6,  70,  3),
(7,  140, 8),
(8,  110, 7),
(9,  95,  5),
(10, 75,  4),

(11, 130, 9),
(12, 85,  5),
(13, 65,  4),
(14, 50,  3),
(15, 95,  6),
(16, 105, 7),
(17, 60,  3),
(18, 120, 8),
(19, 55,  2),
(20, 90,  5),

(21, 200, 15),
(22, 140, 10),
(23, 110, 8),
(24, 95,  7),
(25, 160, 9),
(26, 100, 6),
(27, 180, 12),
(28, 70,  4),
(29, 220, 16),
(30, 150, 11),

(31, 130, 9),
(32, 125, 8),
(33, 140, 10),
(34, 140, 10),
(35, 115, 7),
(36, 210, 15),
(37, 80,  5),
(38, 75,  4),
(39, 60,  3),
(40, 95,  6),

(41, 160, 11),
(42, 55,  3),
(43, 190, 13),
(44, 85,  5),
(45, 90,  6),
(46, 200, 14),
(47, 70,  4),
(48, 65,  3),
(49, 120, 8),
(50, 100, 7);
