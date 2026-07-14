-- Adiciona coluna nullable "featuredCategoryId" em StoreSettings.
-- É a coleção que alimenta a vitrine "Novidades para sua viagem" da home.
-- null = nenhuma coleção configurada -> a vitrine some da página inicial.
--
-- Migration aditiva: NÃO altera dados existentes. O SQLite aceita ADD COLUMN
-- diretamente e preserva as demais colunas/registros intactos.
ALTER TABLE "StoreSettings" ADD COLUMN "featuredCategoryId" TEXT;
