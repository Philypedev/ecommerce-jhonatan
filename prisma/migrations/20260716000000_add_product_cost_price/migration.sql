-- Adiciona coluna nullable "costPrice" em Product.
-- Custo unitário exibido só no admin (alimenta lucro/margem no painel).
-- Nunca é exposto publicamente.
--
-- Migration aditiva: NÃO altera dados existentes. SQLite aceita ADD COLUMN
-- diretamente e preserva as demais colunas/registros intactos.
ALTER TABLE "Product" ADD COLUMN "costPrice" REAL;
