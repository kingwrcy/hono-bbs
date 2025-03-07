import { D1Database } from '@cloudflare/workers-types'
import { Post } from '../types'

export class PostService {
  private static instance: PostService | null = null;
  
  // 单例模式实现
  static getInstance(db: D1Database): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService(db);
    }
    return PostService.instance;
  }

  constructor(private db: D1Database) {}

  async getAllPosts(): Promise<Post[]> {
    const { results } = await this.db.prepare(
      'SELECT id, title, content, raw_content as rawContent, author, tag, comment_count, created_at FROM posts ORDER BY created_at DESC'
    ).all<Post>()
    return results
  }

  async getPostsByTag(tag: string): Promise<Post[]> {
    const { results } = await this.db.prepare(
      'SELECT id, title, content, raw_content as rawContent, author, tag, comment_count, created_at FROM posts WHERE tag = ? ORDER BY created_at DESC'
    ).bind(tag).all<Post>()
    return results
  }

  async getPostById(id: number): Promise<Post | null> {
    const post = await this.db.prepare(
      'SELECT id, title, content, raw_content as rawContent, author, tag, comment_count, created_at FROM posts WHERE id = ?'
    ).bind(id).first<Post>()
    return post
  }

  async getPostsByAuthor(author: string): Promise<Post[]> {
    const { results } = await this.db.prepare(
      'SELECT id, title, content, raw_content as rawContent, author, tag, comment_count, created_at FROM posts WHERE author = ? ORDER BY created_at DESC'
    ).bind(author).all<Post>()
    return results
  }

  async createPost(post: Omit<Post, 'id' | 'created_at' | 'comment_count'>): Promise<number> {
    const result = await this.db.prepare(
      'INSERT INTO posts (title, content, raw_content, author, tag, comment_count) VALUES (?, ?, ?, ?, ?, 0) RETURNING id'
    ).bind(post.title, post.content, post.rawContent || null, post.author, post.tag || null).first<{ id: number }>()
    return result?.id || 0
  }

  async updatePost(id: number, post: Partial<Omit<Post, 'id' | 'created_at' | 'comment_count'>>): Promise<boolean> {
    const fields = Object.keys(post).map(key => {
      // 将 rawContent 转换为数据库字段 raw_content
      if (key === 'rawContent') return 'raw_content = ?';
      return `${key} = ?`;
    }).join(', ')
    
    const values = Object.values(post)
    
    const result = await this.db.prepare(
      `UPDATE posts SET ${fields} WHERE id = ?`
    ).bind(...values, id).run()
    
    return result.success
  }

  async deletePost(id: number): Promise<boolean> {
    // First delete all comments associated with this post
    await this.db.prepare(
      'DELETE FROM comments WHERE post_id = ?'
    ).bind(id).run()
    
    // Then delete the post
    const result = await this.db.prepare(
      'DELETE FROM posts WHERE id = ?'
    ).bind(id).run()
    
    return result.success
  }
}
