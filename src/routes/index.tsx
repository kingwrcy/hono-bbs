import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { PostService } from "../services/post.service";
import { UserService } from "../services/user.service";
import { TagService } from "../services/tag.service";
import type { Bindings, Variables } from "../types/app";
import { ExtendedJWTPayload } from "../types/app";

const index = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 统一的帖子列表路由，tag参数可选
index.get("/posts", async (c) => {
  const tagName = c.req.query("tag");
  const username = c.req.query("username");

  const postService = PostService.getInstance(c.env.DB);
  const userService = UserService.getInstance(c.env.DB);
  const tagService = TagService.getInstance(c.env.DB);

  // 获取所有标签及其帖子数量
  const allTags = await tagService.getAllTagsWithPostCount();

  let posts = [];
  if (username) {
    // 如果指定了用户名，获取该用户的帖子
    posts = await postService.getPostsByAuthor(username);
  } else if (tagName) {
    // 如果指定了标签，获取该标签的帖子
    posts = await postService.getPostsByTag(tagName);
  } else {
    // 否则获取所有帖子
    posts = await postService.getAllPosts();
  }

  // 获取所有帖子作者的用户信息
  const authorUsernames = [...new Set(posts.map((post) => post.author))];
  const authors = await userService.getUsersByUsernames(authorUsernames);

  // 创建用户名到头像的映射
  const usernameToAvatar: Record<string, string> = {};
  authors.forEach((author) => {
    usernameToAvatar[author.username] =
      c.env.GRAVATAR_BASE_URL + author.email_hash + "?d=identicon";
  });

  // 检查用户是否已登录
  const token = getCookie(c, "auth_token");
  let currentUser: ExtendedJWTPayload | null = null;
  if (token) {
    try {
      // 使用类型断言告诉 TypeScript 返回值是 ExtendedJWTPayload 类型
      currentUser = (await verify(
        token,
        c.env.JWT_SECRET
      )) as ExtendedJWTPayload;
    } catch (e) {
      // Token 无效，不做任何处理
    }
  }

  const isAdmin = currentUser?.role === "admin";

  // 构建页面标题
  let pageTitle = "所有帖子 - Hono BBS";
  if (tagName) {
    pageTitle = `标签: ${tagName} - Hono BBS`;
  } else if (username) {
    pageTitle = `${username} 的帖子 - Hono BBS`;
  }

  return c.render(
    <article>
      <header>
        <div class="tag-list">
          <a
            href="/posts"
            class={`tag-item ${
              !tagName && !username ? "active" : ""
            }`}
          >
            全部
          </a>
          {allTags.map((tag) => (
            <a
              key={tag.id}
              href={`/posts?tag=${tag.name}`}
              class={`tag-item ${
                tagName === tag.name ? "active" : ""
              }`}
            >
              {tag.name}({tag.post_count})
            </a>
          ))}
        </div>
      </header>
      {tagName && <h6>标签: {tagName}</h6>}
      {username && <h6>用户: {username} 的帖子</h6>}
      {posts.length > 0 ? (
        <ul class="post-list">
          {posts.map((post) => (
            <li key={post.id} class="post-item">
              <div class="post-title-row">
                <a
                  class="post-title"
                  href={`/posts/${post.id}`}
                >
                  {post.title}
                  {post.comment_count !== undefined && post.comment_count > 0 && (
                  <span class="post-comments">
                    ({post.comment_count}条评论)
                  </span>
                )}
                </a>
               
              </div>
              
              <div class="post-meta-row">
                <span class="post-time" data-timestamp={post.created_at}>
                  {new Date(post.created_at + "Z").toLocaleString()}
                </span>
                
               
                
                {post.tag && (
                  <span class="post-tag">
                    <a href={`/posts?tag=${post.tag}`}>{post.tag}</a>
                  </span>
                )}

                <span class="post-author">
                  {usernameToAvatar[post.author] && (
                    <img
                      src={usernameToAvatar[post.author]}
                      alt={`${post.author}'s avatar`}
                      class="avatar-small"
                    />
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {tagName
            ? `该标签下暂无帖子`
            : username
            ? `该用户暂无帖子`
            : `暂无帖子`}
        </p>
      )}
    </article>,
    {
      title: pageTitle,
      user: currentUser,
    }
  );
});

// 主页路由，重定向到/posts
index.get("/", (c) => {
  return c.redirect("/posts");
});

export { index };
