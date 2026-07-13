-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "position" INTEGER NOT NULL DEFAULT 0,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "fullDescription" TEXT NOT NULL DEFAULT '',
    "price" REAL NOT NULL DEFAULT 0,
    "oldPrice" REAL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "sku" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "warranty" TEXT NOT NULL DEFAULT '',
    "packageContent" TEXT NOT NULL DEFAULT '',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductSpecification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductSpecification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductFAQ" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductFAQ_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductBenefit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductBenefit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "storeName" TEXT NOT NULL DEFAULT 'NovaTech Drones',
    "shortName" TEXT NOT NULL DEFAULT 'NovaTech',
    "tagline" TEXT NOT NULL DEFAULT 'Tecnologia, drones e eletrônicos com atendimento especializado',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "whatsappNumber" TEXT NOT NULL DEFAULT '5511999999999',
    "whatsappDisplay" TEXT NOT NULL DEFAULT '(11) 99999-9999',
    "email" TEXT NOT NULL DEFAULT 'contato@novatechdrones.com.br',
    "phone" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "facebook" TEXT NOT NULL DEFAULT '',
    "tiktok" TEXT NOT NULL DEFAULT '',
    "youtube" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT 'Av. Paulista, 1000 — São Paulo/SP',
    "businessHours" TEXT NOT NULL DEFAULT 'Seg. a Sáb. — 9h às 19h',
    "primaryColor" TEXT NOT NULL DEFAULT '#0c2540',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0369a1',
    "accentColor" TEXT NOT NULL DEFAULT '#22c55e',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f8fafc',
    "textColor" TEXT NOT NULL DEFAULT '#0f172a',
    "heroTitle" TEXT NOT NULL DEFAULT 'Tecnologia, drones e eletrônicos com atendimento especializado',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Compra rápida, atendimento humano e envio para todo o Brasil.',
    "heroImageUrl" TEXT,
    "heroPrimaryButtonText" TEXT NOT NULL DEFAULT 'Ver produtos',
    "heroSecondaryButtonText" TEXT NOT NULL DEFAULT 'Comprar pelo WhatsApp',
    "shippingNote" TEXT NOT NULL DEFAULT 'Frete e disponibilidade serão confirmados pelo WhatsApp.',
    "paymentMethodsJson" TEXT NOT NULL DEFAULT '["pix","cartao-credito","cartao-debito","boleto","dinheiro","a-combinar"]',
    "footerText" TEXT NOT NULL DEFAULT 'Loja especializada em drones, câmeras e eletrônicos premium.',
    "defaultMetaTitle" TEXT NOT NULL DEFAULT 'NovaTech Drones — Tecnologia, drones e eletrônicos',
    "defaultMetaDescription" TEXT NOT NULL DEFAULT 'Drones, câmeras e eletrônicos com atendimento especializado e finalização segura pelo WhatsApp.',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RotatingMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL DEFAULT '',
    "buttonLink" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerDocument" TEXT,
    "deliveryType" TEXT NOT NULL,
    "cep" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "observations" TEXT,
    "subtotal" REAL NOT NULL,
    "total" REAL NOT NULL,
    "whatsappMessage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "LeadOrderItem_leadOrderId_fkey" FOREIGN KEY ("leadOrderId") REFERENCES "LeadOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_status_featured_idx" ON "Product"("status", "featured");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductSpecification_productId_position_idx" ON "ProductSpecification"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductFAQ_productId_position_idx" ON "ProductFAQ"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductBenefit_productId_position_idx" ON "ProductBenefit"("productId", "position");

-- CreateIndex
CREATE INDEX "RotatingMessage_active_position_idx" ON "RotatingMessage"("active", "position");

-- CreateIndex
CREATE INDEX "HomeBanner_active_position_idx" ON "HomeBanner"("active", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_slug_key" ON "PageContent"("slug");

-- CreateIndex
CREATE INDEX "LeadOrder_status_createdAt_idx" ON "LeadOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeadOrderItem_leadOrderId_idx" ON "LeadOrderItem"("leadOrderId");
