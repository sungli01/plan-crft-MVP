import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const commentsRouter = new Hono();
commentsRouter.use('/*', authMiddleware);

// In-memory comment store (replace with DB table in production)
const commentStore = new Map<string, any[]>();

// Add comment to a project
commentsRouter.post('/:projectId', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');
  const { text, sectionIndex, position } = await c.req.json();
  
  if (!text || text.trim().length === 0) {
    return c.json({ error: '댓글 내용을 입력해주세요' }, 400);
  }
  
  const comment = {
    id: crypto.randomUUID(),
    projectId,
    userId: user.id,
    userName: user.name || user.email,
    text: text.trim(),
    sectionIndex: sectionIndex || null,
    position: position || null,
    createdAt: new Date().toISOString(),
    replies: [],
  };
  
  const existing = commentStore.get(projectId) || [];
  existing.push(comment);
  commentStore.set(projectId, existing);
  
  return c.json({ comment }, 201);
});

// List comments for a project
commentsRouter.get('/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const comments = commentStore.get(projectId) || [];
  return c.json({ comments });
});

// Reply to a comment
commentsRouter.post('/:projectId/:commentId/reply', async (c) => {
  const user = c.get('user') as any;
  const { projectId, commentId } = c.req.param() as any;
  const { text } = await c.req.json();
  
  const comments = commentStore.get(projectId) || [];
  const comment = comments.find((cm: any) => cm.id === commentId);
  if (!comment) return c.json({ error: '댓글을 찾을 수 없습니다' }, 404);
  
  const reply = {
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.name || user.email,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  
  comment.replies.push(reply);
  return c.json({ reply }, 201);
});

// Delete comment
commentsRouter.delete('/:projectId/:commentId', async (c) => {
  const user = c.get('user') as any;
  const { projectId, commentId } = c.req.param() as any;
  
  const comments = commentStore.get(projectId) || [];
  const index = comments.findIndex((cm: any) => cm.id === commentId && cm.userId === user.id);
  if (index === -1) return c.json({ error: '삭제 권한이 없습니다' }, 403);
  
  comments.splice(index, 1);
  return c.json({ message: '댓글이 삭제되었습니다' });
});

export default commentsRouter;
