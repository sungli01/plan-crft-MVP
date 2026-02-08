'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { t } from '../lib/i18n';

interface Reply {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface Comment {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
  sectionIndex: number | null;
  replies: Reply[];
}

interface CommentPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return date.toLocaleDateString();
}

export default function CommentPanel({ projectId, isOpen, onClose }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, projectId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/projects/${projectId}/comments`);
      setComments(res.data.comments || []);
    } catch (e) {
      console.error('Failed to fetch comments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);

    // Optimistic update
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      userName: getCurrentUserName(),
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
      sectionIndex: null,
      replies: [],
    };
    setComments((prev) => [tempComment, ...prev]);
    setNewComment('');

    try {
      const res = await api.post(`/api/projects/${projectId}/comments`, {
        text: tempComment.text,
      });
      // Replace temp with real
      setComments((prev) =>
        prev.map((c) => (c.id === tempComment.id ? res.data.comment : c))
      );
    } catch (e) {
      console.error('Failed to add comment:', e);
      // Rollback
      setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);

    const tempReply: Reply = {
      id: `temp-reply-${Date.now()}`,
      userName: getCurrentUserName(),
      text: replyText.trim(),
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, tempReply] } : c
      )
    );
    setReplyText('');
    setReplyingTo(null);

    try {
      await api.post(`/api/projects/${projectId}/comments/${commentId}/reply`, {
        text: tempReply.text,
      });
      fetchComments(); // Refresh to get real data
    } catch (e) {
      console.error('Failed to reply:', e);
      // Rollback
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== tempReply.id) }
            : c
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const prev = [...comments];
    setComments((c) => c.filter((comment) => comment.id !== commentId));

    try {
      await api.delete(`/api/projects/${projectId}/comments/${commentId}`);
    } catch (e) {
      console.error('Failed to delete comment:', e);
      setComments(prev); // Rollback
    }
  };

  const getCurrentUserName = (): string => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.name || user.email || 'User';
      }
    }
    return 'User';
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[90] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-96 max-w-full bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-[95] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            💬 {t('comments.title')}
            {comments.length > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
                {comments.length}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Comment */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.placeholder')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleAddComment();
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">⌘+Enter</span>
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('comments.add')}
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💭</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {t('comments.noComments')}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {t('comments.firstComment')}
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition hover:bg-gray-100 dark:hover:bg-gray-700/70"
              >
                {/* Comment Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {comment.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {comment.userName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  {comment.userName === getCurrentUserName() && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition"
                    >
                      {t('comments.delete')}
                    </button>
                  )}
                </div>

                {/* Section badge */}
                {comment.sectionIndex !== null && (
                  <span className="inline-block mb-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    섹션 {comment.sectionIndex + 1}
                  </span>
                )}

                {/* Comment Text */}
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.text}
                </p>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-3 ml-4 border-l-2 border-gray-200 dark:border-gray-600 pl-3 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                            {reply.userName}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {timeAgo(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                          {reply.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Button & Input */}
                {replyingTo === comment.id ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t('comments.replyPlaceholder')}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleReply(comment.id);
                        if (e.key === 'Escape') {
                          setReplyingTo(null);
                          setReplyText('');
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyText.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {t('comments.reply')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                  >
                    ↩ {t('comments.reply')}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
