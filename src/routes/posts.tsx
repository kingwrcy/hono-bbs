import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { adminOnly, jwtAuth, verify } from "../middleware/auth";
import { CommentService, PostService, TagService } from "../services";
import type { Bindings, Variables } from "../types/app";
import { ExtendedJWTPayload } from "../types/app";
import { parseMarkdown } from "../utils/markdown";

const posts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 获取所有帖子
posts.get("/", async (c) => {
  return c.redirect("/");
});

// 创建新帖子页面 - 需要登录
posts.get("/new", jwtAuth, async (c) => {
  const tagService = TagService.getInstance(c.env.DB);
  const tags = await tagService.getAllTags();
  const user = c.get("user");

  return c.render(
    <article>
      <header>发布新帖子</header>
      <form action="/posts" method="post" id="post-form">
        <div>
          <label for="title">标题</label>
          <input type="text" id="title" name="title" required />
        </div>
        <div>
          <label for="content">内容</label>
          <textarea
            id="content"
            name="content"
            required
            rows={20}
            placeholder="在此输入内容，支持 Markdown 格式..."
          ></textarea>
        </div>
        <div>
          <label for="tag">标签</label>
          <select id="tag" name="tag" required>
            <option value="">-- 选择标签 --</option>
            {tags.map((tag) => (
              <option value={tag.name}>{tag.name}</option>
            ))}
          </select>
        </div>
        <button type="submit">发布</button>
      </form>
    </article>,
    {
      title: "发布新帖子",
      user: user,
    }
  );
});

// 处理新帖子提交 - 需要登录
posts.post("/", jwtAuth, async (c) => {
  const formData = await c.req.formData();
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const tag = (formData.get("tag") as string)?.trim();

  // 使用JWT中的用户名作为作者
  const user = c.get("user");
  const author = user.username;

  if (!title || !content || !tag) {
    return c.render(
      <div>
        <h1>发布失败</h1>
        <p>标题和内容还有标签不能为空</p>
        <a href="/posts/new" className="button">
          返回
        </a>
      </div>,
      { title: "发布失败 - Hono BBS", user }
    );
  }

  // 解析 Markdown 内容为 HTML
  const parsedContent = parseMarkdown(content);

  const postService = PostService.getInstance(c.env.DB);
  const postId = await postService.createPost({
    title,
    content: parsedContent,
    rawContent: content, // 保存原始 Markdown
    author,
    tag,
  });

  return c.redirect(`/posts/${postId}`);
});

// 查看单个帖子
posts.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  // 获取当前页码
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = 100; // 每页显示的评论数量

  const postService = PostService.getInstance(c.env.DB);
  const commentService = CommentService.getInstance(c.env.DB);

  const post = await postService.getPostById(id);

  if (!post) {
    return c.render(
      <div>
        <h1>帖子不存在</h1>
        <p>您请求的帖子不存在或已被删除</p>
        <a href="/">返回首页</a>
      </div>,
      { title: "帖子不存在 - Hono BBS" }
    );
  }

  // 获取分页评论和总评论数
  const comments = await commentService.getCommentsByPostId(id, page, pageSize);
  const totalComments = await commentService.getCommentCountByPostId(id);
  const totalPages = Math.ceil(totalComments / pageSize);

  // 检查用户是否已登录
  const token = getCookie(c, "auth_token");
  let currentUser: ExtendedJWTPayload | null = null;

  if (token) {
    try {
      // 尝试从token中获取用户信息
      const payload = (await verify(
        token,
        c.env.JWT_SECRET
      )) as ExtendedJWTPayload;
      currentUser = payload;
    } catch (error) {
      // Token无效，忽略错误
    }
  }

  return c.render(
    <div>
      <article class="post">
        <header>
          <div class="post-header">
            <span class="post-title">{post.title}</span>
          </div>
        </header>

        <div
          class="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        ></div>

        <footer class="post-footer">
         
          <span class="post-author">
            <a href={`/posts?username=${post.author}`}>{post.author}</a>
          </span>

          {post.tag && (
            <span class="post-tag">
              <a href={`/posts?tag=${post.tag}`}>{post.tag}</a>
            </span>
          )}


          <span class="post-date" data-timestamp={post.created_at}>
            {new Date(post.created_at + "Z").toLocaleString()}
          </span>
          {currentUser && (
            <>
              {/* 管理员可以编辑和删除所有帖子 */}
              {currentUser.role === "admin" ? (
                <>
                  <svg
                    hx-get={`/posts/${id}/edit`}
                    hx-target="body"
                    hx-push-url="true"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 24 24"
                    class="icon-small"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"></path>
                      <path d="M9 15h3l8.5-8.5a1.5 1.5 0 0 0-3-3L9 12v3"></path>
                      <path d="M16 5l3 3"></path>
                    </g>
                  </svg>

                  <svg
                    hx-get={`/posts/${id}/delete`}
                    hx-target="body"
                    hx-push-url="true"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 32 32"
                    class="icon-small"
                  >
                    <path d="M12 12h2v12h-2z" fill="currentColor"></path>
                    <path d="M18 12h2v12h-2z" fill="currentColor"></path>
                    <path
                      d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20z"
                      fill="currentColor"
                    ></path>
                    <path d="M12 2h8v2h-8z" fill="currentColor"></path>
                  </svg>
                </>
              ) : (
                /* 普通用户只能编辑自己的帖子，不能删除 */
                currentUser.username === post.author && (
                  <svg
                    hx-get={`/posts/${id}/edit`}
                    hx-target="body"
                    hx-push-url="true"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 24 24"
                    class="icon-small"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"></path>
                      <path d="M9 15h3l8.5-8.5a1.5 1.5 0 0 0-3-3L9 12v3"></path>
                      <path d="M16 5l3 3"></path>
                    </g>
                  </svg>
                )
              )}
            </>
          )}
        </footer>
      </article>

      <section class="comments">
        {comments.length > 0 ? (
          <>
            <div class="comments-header">评论 ({totalComments})</div>
            <div class="comments-list">
              {comments.map((comment) => (
                <div key={comment.id}>
                  <article>
                    <header>
                      <div class="comment-header">
                        <span class="comment-author">
                          {comment.author_avatar && (
                            <img
                              src={`${c.env.GRAVATAR_BASE_URL}${comment.author_avatar}?d=identicon`}
                              alt={`${comment.author}'s avatar`}
                              class="avatar-small"
                            />
                          )}
                          <a href={`/posts?username=${comment.author}`}>
                            {comment.author}
                          </a>
                        </span>
                        {currentUser && (
                          <>
                            {/* 管理员可以编辑和删除所有评论 */}
                            {currentUser.role === "admin" ? (
                              <>
                                <svg
                                  hx-get={`/posts/${id}/comment/${comment.id}/edit`}
                                  hx-target="body"
                                  hx-push-url="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  xmlns:xlink="http://www.w3.org/1999/xlink"
                                  viewBox="0 0 24 24"
                                  class="icon-small"
                                >
                                  <g
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"></path>
                                    <path d="M9 15h3l8.5-8.5a1.5 1.5 0 0 0-3-3L9 12v3"></path>
                                    <path d="M16 5l3 3"></path>
                                  </g>
                                </svg>

                                <svg
                                  hx-get={`/posts/${id}/comment/${comment.id}/delete`}
                                  hx-target="body"
                                  hx-push-url="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  xmlns:xlink="http://www.w3.org/1999/xlink"
                                  viewBox="0 0 32 32"
                                  class="icon-small"
                                >
                                  <path d="M12 12h2v12h-2z" fill="currentColor"></path>
                                  <path d="M18 12h2v12h-2z" fill="currentColor"></path>
                                  <path
                                    d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20z"
                                    fill="currentColor"
                                  ></path>
                                  <path d="M12 2h8v2h-8z" fill="currentColor"></path>
                                </svg>
                              </>
                            ) : (
                              /* 普通用户只能编辑自己的评论，不能删除 */
                              currentUser.username === comment.author && (
                                <svg
                                  hx-get={`/posts/${id}/comment/${comment.id}/edit`}
                                  hx-target="body"
                                  hx-push-url="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  xmlns:xlink="http://www.w3.org/1999/xlink"
                                  viewBox="0 0 24 24"
                                  class="icon-small"
                                >
                                  <g
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"></path>
                                    <path d="M9 15h3l8.5-8.5a1.5 1.5 0 0 0-3-3L9 12v3"></path>
                                    <path d="M16 5l3 3"></path>
                                  </g>
                                </svg>
                              )
                            )}
                          </>
                        )}
                        <span class="comment-date" data-timestamp={comment.created_at}>
                          {new Date(comment.created_at + "Z").toLocaleString()}
                        </span>
                        <span class="comment-floor">#{comment.floor_number}楼</span>
                      </div>
                    </header>
                    <div
                      class="comment-content"
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(comment.content),
                      }}
                    ></div>
                  </article>
                </div>
              ))}
            </div>
            <div class="pagination">
              {totalPages > 1 &&
                Array.from({ length: totalPages }, (_, index) => (
                  <a
                    key={index}
                    href={`/posts/${id}?page=${index + 1}`}
                    class={`page-item ${page === index + 1 ? "active" : ""}`}
                  >
                    {index + 1}
                  </a>
                ))}
            </div>
          </>
        ) : (
          <p>暂无评论</p>
        )}

        {currentUser ? (
          <article>
            <form
              action={`/posts/${id}/comment`}
              method="post"
              class="comment-form"
              id="comment-form"
            >
              <h4>发表评论</h4>
              <div>
                <textarea
                  id="content"
                  name="content"
                  rows={5}
                  required
                  placeholder="在此输入评论内容..."
                ></textarea>
              </div>
              <button type="submit">提交评论</button>
            </form>
          </article>
        ) : (
          <p>
            <a href={`/user/login?redirect=/posts/${id}`}>登录</a> 后才能发表评论
          </p>
        )}
      </section>
    </div>,
    {
      title: `${post.title} - Hono BBS`,
      user: currentUser,
    }
  );
});

// 编辑帖子页面 - 需要是作者或管理员
posts.get("/:id/edit", jwtAuth, async (c) => {
  const id = parseInt(c.req.param("id"));
  const user = c.get("user");

  const postService = PostService.getInstance(c.env.DB);
  const tagService = TagService.getInstance(c.env.DB);

  const post = await postService.getPostById(id);
  if (!post) {
    return c.notFound();
  }

  // 检查权限 - 只有作者或管理员可以编辑
  if (user.username !== post.author && user.role !== "admin") {
    return c.render(
      <div>
        <h1>权限错误</h1>
        <p>您没有权限编辑此帖子</p>
        <a href={`/posts/${id}`} class="button">
          返回帖子
        </a>
      </div>,
      {
        title: "权限错误",
        user: user,
      }
    );
  }

  const tags = await tagService.getAllTags();

  // 使用原始 Markdown 内容
  const editContent = post.rawContent || post.content.replace(/<[^>]*>/g, "");

  return c.render(
    <article>
      <header>编辑帖子</header>
      <form action={`/posts/${id}/edit`} method="post" id="edit-post-form">
        <div>
          <label for="title">标题</label>
          <input
            type="text"
            id="title"
            name="title"
            value={post.title}
            required
          />
        </div>
        <div>
          <label for="content">内容</label>
          <textarea
            id="content"
            name="content"
            required
            rows={20}
            placeholder="在此输入内容，支持 Markdown 格式..."
          >
            {editContent.trim()}
          </textarea>
        </div>
        <div>
          <label for="tag">标签</label>
          <select id="tag" name="tag">
            <option value="">-- 选择标签 --</option>
            {tags.map((tag) => (
              <option value={tag.name} selected={post.tag === tag.name}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">更新</button>
      </form>
    </article>,
    {
      title: "编辑帖子",
      user: user,
    }
  );
});

// 处理帖子编辑 - 需要是作者或管理员
posts.post("/:id/edit", jwtAuth, async (c) => {
  const id = parseInt(c.req.param("id"));
  const user = c.get("user");

  const postService = PostService.getInstance(c.env.DB);
  const post = await postService.getPostById(id);

  if (!post) {
    return c.notFound();
  }

  // 检查权限 - 只有作者或管理员可以编辑
  if (user.username !== post.author && user.role !== "admin") {
    return c.render(
      <div>
        <h1>权限错误</h1>
        <p>您没有权限编辑此帖子</p>
        <a href={`/posts/${id}`} class="button">
          返回帖子
        </a>
      </div>,
      {
        title: "权限错误",
        user: user,
      }
    );
  }

  const formData = await c.req.formData();
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const tag = (formData.get("tag") as string)?.trim();

  // 解析 Markdown 内容为 HTML
  const parsedContent = parseMarkdown(content);

  if (!title || !content) {
    return c.render(
      <div>
        <h1>编辑失败</h1>
        <p>标题和内容不能为空</p>
        <a href={`/posts/${id}/edit`} class="button">
          返回
        </a>
      </div>,
      { title: "编辑失败 - Hono BBS", user }
    );
  }

  await postService.updatePost(id, {
    title,
    content: parsedContent,
    rawContent: content, // 保存原始 Markdown
    tag: tag || null,
  });

  return c.redirect(`/posts/${id}`);
});

// 删除帖子页面 - 需要是管理员
posts.get("/:id/delete", jwtAuth, async (c) => {
  const id = parseInt(c.req.param("id"));
  const user = c.get("user");

  const postService = PostService.getInstance(c.env.DB);
  const post = await postService.getPostById(id);

  if (!post) {
    return c.render(
      <div>
        <h1>帖子不存在</h1>
        <p>您请求的帖子不存在或已被删除</p>
        <a href="/">返回首页</a>
      </div>,
      { title: "帖子不存在 - Hono BBS" }
    );
  }

  // 检查权限 - 只有管理员可以删除任何帖子
  if (user.role !== "admin") {
    return c.render(
      <div>
        <h1>权限不足</h1>
        <p>您没有权限删除此帖子</p>
        <a href={`/posts/${id}`}>返回帖子</a>
      </div>,
      {
        title: "权限不足 - Hono BBS",
        user,
      }
    );
  }

  return c.render(
    <article>
      <header>删除帖子</header>
      <div class="card">
        <h3>{post.title}</h3>
        <p>作者: {post.author}</p>
        <p>发布时间:{new Date(post.created_at + "Z").toLocaleDateString()}</p>
        <p class="warning">确定要删除这篇帖子吗？此操作不可撤销。</p>
      </div>
      <footer class="flex space-x-2 items-center">
        <button
          hx-post={`/posts/${id}/delete`}
          hx-target="body"
          hx-push-url="true"
        >
          确认
        </button>
        <button
          hx-get={`/posts/${id}`}
          hx-target="body"
          hx-push-url="true"
          class="contrast"
        >
          取消
        </button>
      </footer>
    </article>,
    {
      title: "删除帖子 - Hono BBS",
      user,
    }
  );
});

// 处理帖子删除 - 需要是管理员
posts.post("/:id/delete", jwtAuth, adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"));

  const postService = PostService.getInstance(c.env.DB);
  await postService.deletePost(id);

  return c.redirect("/posts");
});

// 添加评论 - 需要登录
posts.post("/:id/comment", jwtAuth, async (c) => {
  const postId = parseInt(c.req.param("id"));

  const formData = await c.req.formData();
  const content = (formData.get("content") as string)?.trim();

  if (!content) {
    return c.redirect(`/posts/${postId}`);
  }

  const user = c.get("user");
  const commentService = CommentService.getInstance(c.env.DB);

  // 解析 Markdown
  const parsedContent = parseMarkdown(content);

  await commentService.createComment({
    post_id: postId,
    content: parsedContent,
    raw_content: content, // 保存原始 Markdown
    author: user.username,
  });

  return c.redirect(`/posts/${postId}`);
});

// 编辑评论页面 - 管理员可编辑任何评论，普通用户只能编辑自己的评论
posts.get(
  "/:postId/comment/:commentId/edit",
  jwtAuth,
  async (c) => {
    const postId = parseInt(c.req.param("postId"));
    const commentId = parseInt(c.req.param("commentId"));
    const user = c.get("user");

    const postService = PostService.getInstance(c.env.DB);
    const commentService = CommentService.getInstance(c.env.DB);

    const post = await postService.getPostById(postId);
    const comment = await commentService.getCommentById(commentId);

    if (!post || !comment) {
      return c.render(
        <div>
          <h1>评论不存在</h1>
          <p>您请求的评论不存在或已被删除</p>
          <a href={`/posts/${postId}`}>返回帖子</a>
        </div>,
        { title: "评论不存在 - Hono BBS" }
      );
    }

    // 检查权限 - 只有评论作者或管理员可以编辑
    if (user.username !== comment.author && user.role !== "admin") {
      return c.render(
        <div>
          <h1>权限错误</h1>
          <p>您没有权限编辑此评论</p>
          <a href={`/posts/${postId}`}>返回帖子</a>
        </div>,
        { title: "权限错误 - Hono BBS", user }
      );
    }

    return c.render(
      <article>
        <header>编辑评论</header>
        <p>
          帖子: <a href={`/posts/${postId}`}>{post.title}</a>
        </p>
        <form
          action={`/posts/${postId}/comment/${commentId}/edit`}
          method="post"
          class="form-card"
          id="comment-form"
        >
          <div class="form-group">
            <label htmlFor="content">评论内容:</label>
            <textarea
              id="content"
              name="content"
              rows={5}
              required
              placeholder="在此输入评论内容..."
            >
              {(comment.raw_content || comment.content).trim()}
            </textarea>
          </div>
          <button
            type="submit"
            class="bg-blue-500 text-white px-4 py-2 rounded"
          >
            更新评论
          </button>
        </form>
      </article>,
      {
        title: "编辑评论 - Hono BBS",
        user: c.get("user"),
      }
    );
  }
);

// 处理评论编辑 - 管理员可编辑任何评论，普通用户只能编辑自己的评论
posts.post(
  "/:postId/comment/:commentId/edit",
  jwtAuth,
  async (c) => {
    const postId = parseInt(c.req.param("postId"));
    const commentId = parseInt(c.req.param("commentId"));
    const user = c.get("user");

    const formData = await c.req.formData();
    const content = (formData.get("content") as string)?.trim();

    if (!content) {
      return c.render(
        <div>
          <h1>编辑评论失败</h1>
          <p>评论内容不能为空</p>
          <a href={`/posts/${postId}/comment/${commentId}/edit`}>返回</a>
        </div>,
        { title: "编辑评论失败 - Hono BBS" }
      );
    }

    const commentService = CommentService.getInstance(c.env.DB);
    
    // 获取评论信息，检查权限
    const comment = await commentService.getCommentById(commentId);
    
    if (!comment) {
      return c.render(
        <div>
          <h1>评论不存在</h1>
          <p>您请求的评论不存在或已被删除</p>
          <a href={`/posts/${postId}`}>返回帖子</a>
        </div>,
        { title: "评论不存在 - Hono BBS" }
      );
    }
    
    // 检查权限 - 只有评论作者或管理员可以编辑
    if (user.username !== comment.author && user.role !== "admin") {
      return c.render(
        <div>
          <h1>权限错误</h1>
          <p>您没有权限编辑此评论</p>
          <a href={`/posts/${postId}`}>返回帖子</a>
        </div>,
        { title: "权限错误 - Hono BBS", user }
      );
    }

    // 解析 Markdown
    const parsedContent = parseMarkdown(content);

    const success = await commentService.updateComment(
      commentId,
      parsedContent,
      content
    );

    if (!success) {
      return c.render(
        <div>
          <h1>编辑评论失败</h1>
          <p>评论更新失败，请稍后再试</p>
          <a href={`/posts/${postId}`}>返回帖子</a>
        </div>,
        { title: "编辑评论失败 - Hono BBS" }
      );
    }

    return c.redirect(`/posts/${postId}`);
  }
);

// 删除评论确认页面 - 仅管理员可用
posts.get(
  "/:postId/comment/:commentId/delete",
  jwtAuth,
  adminOnly,
  async (c) => {
    const postId = parseInt(c.req.param("postId"));
    const commentId = parseInt(c.req.param("commentId"));

    const postService = PostService.getInstance(c.env.DB);
    const commentService = CommentService.getInstance(c.env.DB);

    const post = await postService.getPostById(postId);
    const comment = await commentService.getCommentById(commentId);

    if (!post || !comment) {
      return c.render(
        <div>
          <h1>评论不存在</h1>
          <p>您请求的评论不存在或已被删除</p>
          <a href={`/posts/${postId}`}>返回帖子</a>
        </div>,
        { title: "评论不存在 - Hono BBS" }
      );
    }

    return c.render(
      <article>
        <header>确认删除评论</header>
        <p>您确定要删除这条评论吗？此操作不可撤销。</p>
        <p>
          帖子: <a href={`/posts/${postId}`}>{post.title}</a>
        </p>
        <p>评论作者: {comment.author}</p>
        <div class="p-4 border rounded my-4">
          <h4>评论内容:</h4>
          <div dangerouslySetInnerHTML={{ __html: comment.content }}></div>
        </div>

        <footer class="mt-4 space-x-4">
          <button
            hx-post={`/posts/${postId}/comment/${commentId}/delete`}
            hx-target="body"
            hx-push-url="true"
            class="contrast"
          >
            确认
          </button>
          <button
            hx-get={`/posts/${postId}`}
            hx-target="body"
            hx-push-url="true"
          >
            取消
          </button>
        </footer>
      </article>,
      {
        title: "删除评论 - Hono BBS",
        user: c.get("user"),
      }
    );
  }
);

// 处理评论删除 - 仅管理员可用
posts.post(
  "/:postId/comment/:commentId/delete",
  jwtAuth,
  adminOnly,
  async (c) => {
    const postId = parseInt(c.req.param("postId"));
    const commentId = parseInt(c.req.param("commentId"));

    const commentService = CommentService.getInstance(c.env.DB);
    const success = await commentService.deleteComment(commentId);

    if (!success) {
      return c.render(
        <div>
          <h1>删除评论失败</h1>
          <p>评论删除失败，请稍后再试</p>
          <a href={`/posts/${postId}`}>返回帖子</a>
        </div>,
        { title: "删除评论失败 - Hono BBS" }
      );
    }

    return c.redirect(`/posts/${postId}`);
  }
);

export { posts };
