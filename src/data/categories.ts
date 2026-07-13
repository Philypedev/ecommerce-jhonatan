import type { Category } from '@/types';

export const categories: Category[] = [
  {
    slug: 'malas-bagagens',
    name: 'Malas e Bagagens',
    description: 'Malas rígidas, de bordo e despacho com tecnologia e durabilidade.',
    icon: 'luggage',
    highlight: true,
  },
  {
    slug: 'mochilas',
    name: 'Mochilas',
    description: 'Mochilas antifurto, com porta USB e compartimentos pensados para o viajante.',
    icon: 'backpack',
    highlight: true,
  },
  {
    slug: 'acessorios-viagem',
    name: 'Acessórios de Viagem',
    description: 'Travesseiros, cadeados TSA, balanças e itens indispensáveis para qualquer trip.',
    icon: 'accessories',
  },
  {
    slug: 'eletronicos-viagem',
    name: 'Eletrônicos para Viagem',
    description: 'Adaptadores universais, power banks e gadgets úteis em qualquer destino.',
    icon: 'plug',
  },
  {
    slug: 'organizadores',
    name: 'Organizadores',
    description: 'Cubes, necessaires e estojos para arrumar a mala em minutos.',
    icon: 'organizer',
  },
  {
    slug: 'ofertas',
    name: 'Ofertas',
    description: 'Promoções e descontos por tempo limitado.',
    icon: 'tag',
    highlight: true,
  },
];

export const getCategoryBySlug = (slug: string): Category | undefined =>
  categories.find((c) => c.slug === slug);
