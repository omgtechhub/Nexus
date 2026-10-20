import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AiInsightStatus, AiMessageRole, AiUsageKind } from '@prisma/client';
import { getAiProvider } from '../services/ai/index.js';
import { regenerateInsights, buildMerchantContext } from '../services/ai/insights.service.js';
import { getUsage, recordUsage } from '../services/ai/usage.service.js';

const messageSchema = z.object({
  content: z.string().min(1, 'A message is required').max(4000),
});

/** Every response says which provider answered, so stub output is never passed off as a model's. */
function providerInfo() {
  const provider = getAiProvider();
  return { provider: provider.name, model: provider.model, isLive: provider.isLive };
}

/* ------------------------------------------------------------------ insights */

export async function listInsights(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const insights = await prisma.aiInsight.findMany({
      where: { merchantId, status: AiInsightStatus.READY },
      orderBy: [{ severity: 'desc' }, { generatedAt: 'desc' }],
    });

    res.json({ success: true, data: insights, meta: providerInfo() });
  } catch (err) {
    next(err);
  }
}

export async function refreshInsights(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const count = await regenerateInsights(merchantId);
    const insights = await prisma.aiInsight.findMany({
      where: { merchantId, status: AiInsightStatus.READY },
      orderBy: [{ severity: 'desc' }, { generatedAt: 'desc' }],
    });

    res.json({
      success: true,
      message: `Generated ${count} insight${count === 1 ? '' : 's'}`,
      data: insights,
      meta: providerInfo(),
    });
  } catch (err) {
    next(err);
  }
}

export async function dismissInsight(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    // Scoped to the caller's store, so another store's insight simply does not match.
    const updated = await prisma.aiInsight.updateMany({
      where: { id, merchantId },
      data: { status: AiInsightStatus.DISMISSED, dismissedAt: new Date() },
    });

    if (updated.count === 0) {
      res.status(404).json({ success: false, error: 'Insight not found' });
      return;
    }

    res.json({ success: true, message: 'Insight dismissed' });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------- conversations */

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const conversations = await prisma.aiConversation.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { _count: { select: { messages: true } } },
    });

    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
}

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.aiConversation.create({
      data: { merchantId: req.merchant!.id, userId: req.user!.id },
      include: { messages: true },
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    res.json({ success: true, data: conversation, meta: providerInfo() });
  } catch (err) {
    next(err);
  }
}

export async function deleteConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await prisma.aiConversation.deleteMany({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (deleted.count === 0) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { content } = messageSchema.parse(req.body);

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: req.params.id, merchantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const provider = getAiProvider();
    const system = await buildMerchantContext(merchantId);

    const turns = [
      ...conversation.messages.map(m => ({
        role: m.role === AiMessageRole.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content },
    ];

    const answer = await provider.complete({ system, turns });

    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.aiMessage.create({
        data: { conversationId: conversation.id, role: AiMessageRole.USER, content },
      }),
      prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiMessageRole.ASSISTANT,
          content: answer.text,
          provider: answer.provider,
          model: answer.model,
          tokensIn: answer.tokensIn,
          tokensOut: answer.tokensOut,
        },
      }),
      prisma.aiConversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
          // The first question names the thread; a thread called "New
          // conversation" forever is useless once there are several.
          ...(conversation.messages.length === 0
            ? { title: content.slice(0, 60) + (content.length > 60 ? '…' : '') }
            : {}),
        },
      }),
    ]);

    await recordUsage({
      merchantId,
      kind: AiUsageKind.CHAT,
      provider: answer.provider,
      model: answer.model,
      tokensIn: answer.tokensIn,
      tokensOut: answer.tokensOut,
    });

    res.status(201).json({
      success: true,
      data: { userMessage, assistantMessage },
      meta: providerInfo(),
    });
  } catch (err) {
    next(err);
  }
}

/* --------------------------------------------------------------------- usage */

export async function getUsageSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const usage = await getUsage(req.merchant!.id);
    res.json({ success: true, data: usage, meta: providerInfo() });
  } catch (err) {
    next(err);
  }
}
