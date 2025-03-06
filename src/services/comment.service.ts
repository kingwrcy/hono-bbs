import { D1Database } from '@cloudflare/workers-types'
import { Comment } from '../types'

export class CommentService {
  private static instance: CommentService | null = null;
  
  // 单例模式实现
  static getInstance(db: D1Database): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService(db);
    }
    return CommentService.instance;
  }

  constructor(private db: D1Database) {}

  async getCommentsByPostId(postId: number, page: number = 1, pageSize: number = 20): Promise<(Comment & { author_avatar?: string, floor_number: number })[]> {
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 使用 ROW_NUMBER() 窗口函数添加楼层号
    const { results } = await this.db.prepare(
      `SELECT 
        c.id, c.post_id, c.content, c.raw_content, c.author, c.created_at, 
        u.email_hash as author_avatar,
        ROW_NUMBER() OVER (ORDER BY c.created_at ASC) as floor_number
      FROM comments c
      LEFT JOIN users u ON c.author = u.username
      WHERE c.post_id = ? 
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?`
    ).bind(postId, pageSize, offset).all<Comment & { author_avatar?: string, floor_number: number }>()
    
    return results
  }

  // 获取评论总数，用于分页
  async getCommentCountByPostId(postId: number): Promise<number> {
    const result = await this.db.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ?'
    ).bind(postId).first<{ count: number }>()
    
    return result?.count || 0
  }

  async createComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<number> {
    // 创建评论
    const result = await this.db.prepare(
      'INSERT INTO comments (post_id, content, raw_content, author) VALUES (?, ?, ?, ?) RETURNING id'
    ).bind(comment.post_id, comment.content, comment.raw_content, comment.author).first<{ id: number }>()
    
    // 评论计数由触发器自动更新，无需手动更新
    
    return result?.id || 0
  }

  async deleteComment(id: number): Promise<boolean> {
    // 删除评论，评论计数由触发器自动更新
    const result = await this.db.prepare(
      'DELETE FROM comments WHERE id = ?'
    ).bind(id).run()
    
    return result.success
  }

  async getCommentById(id: number): Promise<Comment | null> {
    const comment = await this.db.prepare(
      'SELECT id, post_id, content, raw_content, author, created_at FROM comments WHERE id = ?'
    ).bind(id).first<Comment>()
    return comment
  }

  async updateComment(id: number, content: string, rawContent: string): Promise<boolean> {
    const result = await this.db.prepare(
      'UPDATE comments SET content = ?, raw_content = ? WHERE id = ?'
    ).bind(content, rawContent, id).run()
    
    return result.success
  }
}
