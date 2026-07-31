import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import type { CreateJobKeywordInput } from '../../common/validators/job-keyword.validators.js';

export async function addKeywords(jobPostId: string, keywords: CreateJobKeywordInput[]) {
  const job = await prisma.jobPost.findUnique({ where: { id: jobPostId } });
  if (!job) throw new AppError('Job post not found.', 404);

  await prisma.jobKeyword.createMany({
    data: keywords.map((k) => ({ ...k, jobPostId })),
    skipDuplicates: true,
  });

  return prisma.jobKeyword.findMany({
    where: { jobPostId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getKeywords(jobPostId: string) {
  return prisma.jobKeyword.findMany({
    where: { jobPostId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateKeyword(
  jobPostId: string,
  keywordId: string,
  data: Partial<Pick<CreateJobKeywordInput, 'type' | 'weight' | 'keyword'>>,
) {
  const keyword = await prisma.jobKeyword.findFirst({
    where: { id: keywordId, jobPostId },
  });
  if (!keyword) throw new AppError('Job keyword not found.', 404);

  return prisma.jobKeyword.update({
    where: { id: keywordId },
    data,
  });
}

export async function removeKeyword(jobPostId: string, keywordId: string) {
  const keyword = await prisma.jobKeyword.findFirst({
    where: { id: keywordId, jobPostId },
  });
  if (!keyword) throw new AppError('Job keyword not found.', 404);

  await prisma.jobKeyword.delete({ where: { id: keywordId } });
  return { message: 'Keyword removed successfully.' };
}
