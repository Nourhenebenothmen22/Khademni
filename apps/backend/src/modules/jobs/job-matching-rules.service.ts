import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import type { CreateJobMatchingRuleInput, UpdateJobMatchingRuleInput } from '../../common/validators/job-matching-rule.validators.js';

export async function addRule(jobPostId: string, input: CreateJobMatchingRuleInput) {
  const job = await prisma.jobPost.findUnique({ where: { id: jobPostId } });
  if (!job) throw new AppError('Job post not found.', 404);

  return prisma.jobMatchingRule.create({
    data: { ...input, jobPostId },
  });
}

export async function getRules(jobPostId: string) {
  return prisma.jobMatchingRule.findMany({
    where: { jobPostId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateRule(
  jobPostId: string,
  ruleId: string,
  input: UpdateJobMatchingRuleInput,
) {
  const rule = await prisma.jobMatchingRule.findFirst({
    where: { id: ruleId, jobPostId },
  });
  if (!rule) throw new AppError('Matching rule not found.', 404);

  return prisma.jobMatchingRule.update({
    where: { id: ruleId },
    data: input,
  });
}

export async function removeRule(jobPostId: string, ruleId: string) {
  const rule = await prisma.jobMatchingRule.findFirst({
    where: { id: ruleId, jobPostId },
  });
  if (!rule) throw new AppError('Matching rule not found.', 404);

  await prisma.jobMatchingRule.delete({ where: { id: ruleId } });
  return { message: 'Matching rule removed successfully.' };
}
