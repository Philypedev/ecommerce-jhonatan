import { prisma } from '@/lib/prisma';

export const getPageContent = async (slug: string) =>
  prisma.pageContent.findUnique({ where: { slug } });

export const listPageContents = async () =>
  prisma.pageContent.findMany({ orderBy: { slug: 'asc' } });
