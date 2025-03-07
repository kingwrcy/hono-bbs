import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "../middleware/auth";
import { CommentService, PostService, UserService } from "../services";
import type { Bindings, Variables } from "../types/app";
import { ExtendedJWTPayload } from "../types/app";
import { Comment, Post } from "../types/db";

const profile = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 用户个人资料页面
profile.get("/:username", async (c) => {
  const username = c.req.param("username");
  const tab = c.req.query("tab") || "posts";
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = 10;

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

  // 获取用户信息
  const userService = UserService.getInstance(c.env.DB);
  const profileUser = await userService.getUserByUsername(username);

  if (!profileUser) {
    return c.render(
      <div>
        <h1>错误</h1>
        <p>用户不存在</p>
        <a href="/" class="button">
          返回首页
        </a>
      </div>,
      { title: "Hono BBS - 错误", user: currentUser }
    );
  }

  // 获取用户的帖子或评论
  const postService = PostService.getInstance(c.env.DB);
  const commentService = CommentService.getInstance(c.env.DB);

  let posts: Post[] = [];
  let comments: (Comment & { post_title?: string })[] = [];

  if (tab === "posts") {
    posts = await postService.getPostsByAuthor(username);
  } else if (tab === "comments") {
    // 获取用户的评论
    const { results } = await c.env.DB.prepare(
      `
      SELECT c.id, c.post_id, c.content, c.raw_content, c.author, c.created_at, p.title as post_title
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.author = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(username, pageSize, (page - 1) * pageSize)
      .all<Comment & { post_title: string }>();

    comments = results;
  }

  // 获取Gravatar头像URL
  const gravatarBaseUrl =
    process.env.GRAVATAR_BASE_URL || "https://www.gravatar.com/avatar/";
  const avatarUrl = `${gravatarBaseUrl}${
    profileUser.avatar || profileUser.email_hash
  }?d=identicon&s=200`;

  return c.render(
    <article class="profile-page">
      <header>用户资料</header>

      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-avatar">
            <img src={avatarUrl} alt={`${profileUser.username}的头像`} />
          </div>
          <div class="profile-info">
            <h2>{profileUser.username}</h2>
            <p class="profile-joined">
              加入时间: <span data-timestamp={profileUser.created_at}></span>
            </p>
            <p class="profile-bio">
              {profileUser.bio || "这个人很懒，什么都没写~"}
            </p>
          </div>
        </div>

        <div class="profile-tabs">
          <a
            href={`/profile/${username}?tab=posts`}
            class={tab === "posts" ? "active" : ""}
          >
            发帖记录
          </a>
          <a
            href={`/profile/${username}?tab=comments`}
            class={tab === "comments" ? "active" : ""}
          >
            评论记录
          </a>
        </div>

        <div>
          {tab === "posts" && (
            <div>
              {posts.length > 0 ? (
                <ul class="post-list">
                  {posts.map((post) => (
                    <li key={post.id} class="post-item">
                      <div class="post-title-row">
                        <a class="post-title" href={`/posts/${post.id}`}>
                          {post.title}
                          {post.comment_count !== undefined &&
                            post.comment_count > 0 && (
                              <span class="post-comments">
                                ({post.comment_count}条评论)
                              </span>
                            )}
                        </a>
                      </div>

                      <div class="post-meta-row">
                        <span
                          class="post-time"
                          data-timestamp={post.created_at}
                        >
                          {new Date(post.created_at + "Z").toLocaleString()}
                        </span>

                        {post.tag && (
                          <span class="post-tag">
                            <a href={`/posts?tag=${post.tag}`}>{post.tag}</a>
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>暂无发帖记录</p>
              )}
            </div>
          )}

          {tab === "comments" && (
            <div>
              {comments.length > 0 ? (
                <ul class="comment-list">
                  {comments.map((comment) => (
                    <li key={comment.id}>
                      <div style="margin-bottom:10px;">
                        <span
                          style="margin-right:10px;"
                          data-timestamp={comment.created_at}
                        ></span>
                        <a
                          href={`/posts/${comment.post_id}`}
                          class="comment-post-title"
                        >
                          评论于: {comment.post_title}
                        </a>
                      </div>
                      <div
                        class="comment-content"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                      ></div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>暂无评论记录</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>,
    {
      title: `${profileUser.username}的个人资料 - Hono BBS`,
      user: currentUser,
    }
  );
});

export { profile };
