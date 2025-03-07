import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import { renderer } from './renderer'
import { index } from './routes/index'
import { posts } from './routes/posts'
import { user } from './routes/user'
import { tags } from './routes/tags'
import { profile } from './routes/profile'
import { D1Database } from '@cloudflare/workers-types'

// 定义 Bindings 类型
export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  ASSETS?: { fetch: (request: Request) => Promise<Response> }
}

const app = new Hono<{ Bindings: Bindings }>()

// 添加静态文件处理
// serveStatic 中间件会自动处理开发环境和生产环境的差异
// 在生产环境中使用 ASSETS 绑定，在开发环境中 Wrangler 会自动处理
app.use('/static/*', serveStatic())

// 添加 JSX 渲染器
app.get('*', renderer)
app.post('*', renderer)

// 添加路由
app.route('/', index)
app.route('/posts', posts)
app.route('/user', user)
app.route('/tags', tags)
app.route('/profile', profile)

export default app
