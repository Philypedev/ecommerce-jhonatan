'use client';

import { createContext, useContext } from 'react';
import { siteConfig } from '@/config/site';

/**
 * Provê o número de WhatsApp configurado no admin para os componentes
 * client (ProductCard, ProductDetails, etc.). Sem isso, esses componentes
 * caíam no fallback estático de `siteConfig.whatsapp` e abriam o número
 * errado quando o admin trocava o número em /admin/configuracoes.
 */
const WhatsAppContext = createContext<string>(siteConfig.whatsapp);

export const WhatsAppProvider = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => (
  <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>
);

export const useWhatsApp = () => useContext(WhatsAppContext);
