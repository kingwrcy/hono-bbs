import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { adminOnly, jwtAuth, verify } from "../middleware/auth";
import { TagService } from "../services";
import type { Bindings, Variables } from "../types/app";
import { ExtendedJWTPayload } from "../types/app";

const tags = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 标签列表
tags.get("/", async (c) => {
  const tagService = TagService.getInstance(c.env.DB);
  const allTags = await tagService.getAllTagsWithPostCount();

  // 检查用户是否已登录
  const token = getCookie(c, "auth_token");
  let currentUser: ExtendedJWTPayload | null = null;
  let isAdmin = false;

  if (token) {
    try {
      // 尝试从token中获取用户信息
      const payload = (await verify(
        token,
        c.env.JWT_SECRET
      )) as ExtendedJWTPayload;
      currentUser = payload;
      isAdmin = payload.role === "admin";
    } catch (error) {
      // Token无效，忽略错误
    }
  }

  return c.render(
    <article>
      {isAdmin && (
        <div class="mb-4">
          <button
            hx-get="/tags/new"
            hx-target="body"
            hx-push-url="true"
            class="secondary"
          >
            添加新标签
          </button>
        </div>
      )}

      {allTags.length > 0 ? (
        <div className="flex flex-col space-y-4">
          {allTags.map((tag) => (
            <div
             
              key={tag.id}
            >
              <div  >
                <a
                  href={`/posts?tag=${tag.name}`}
                  class={`py-1 px-2 color-[var(--primary-inverse)] rounded no-underline bg-gray-2`}
                >
                  {tag.name}({tag.post_count})
                </a>
                {isAdmin && (
                  <span class="space-x-2 ml-2">
                    <a style="margin-right:5px;" href={`/tags/edit/${tag.id}`}>编辑</a>
                    <a href={`/tags/delete/${tag.id}`}>删除</a>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>暂无标签</p>
      )}
    </article>,
    {
      title: "标签列表 - Hono BBS",
      user: currentUser,
    }
  );
});

// 添加新标签页面
tags.get("/new", jwtAuth, adminOnly, async (c) => {
  return c.render(
    <article>
      <header class="mb-2 text-xl font-bold">添加新标签</header>
      <form action="/tags/new" method="post" class="form-card">
        <div class="form-group">
          <label for="name">标签名称:</label>
          <input type="text" id="name" name="name" required />
        </div>
        <button
          type="submit"
          class="bg-blue-500 text-white px-4 py-2 rounded"
        >
          添加标签
        </button>
      </form>
    </article>,
    {
      title: "添加新标签 - Hono BBS",
      user: c.get("user"),
    }
  );
});

// 添加新标签
tags.post("/new", jwtAuth, adminOnly, async (c) => {
  const { name } = await c.req.parseBody();
  const user = c.get("user");

  if (!name) {
    return c.render(
      <div>
        <h1>添加标签失败</h1>
        <p>标签名称不能为空</p>
        <a href="/tags/new">返回</a>
      </div>,
      {
        title: "添加标签失败 - Hono BBS",
        user,
      }
    );
  }

  const tagService = TagService.getInstance(c.env.DB);

  // 检查标签是否已存在
  const existingTag = await tagService.getTagByName(name as string);

  if (existingTag) {
    return c.render(
      <div>
        <h1>添加标签失败</h1>
        <p>标签 "{name}" 已存在</p>
        <a href="/tags/new">返回</a>
      </div>,
      {
        title: "添加标签失败 - Hono BBS",
        user,
      }
    );
  }

  // 创建新标签
  await tagService.createTag(name as string);

  return c.redirect("/tags");
});

// 编辑标签页面
tags.get("/edit/:id", jwtAuth, adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"));

  const tagService = TagService.getInstance(c.env.DB);
  const tag = await tagService.getTagById(id);

  if (!tag) {
    return c.render(
      <div>
        <h1>标签不存在</h1>
        <p>您请求的标签不存在或已被删除</p>
        <a href="/tags">返回标签列表</a>
      </div>,
      {
        title: "标签不存在 - Hono BBS",
        user: c.get("user"),
      }
    );
  }

  const user = c.get("user");

  return c.render(
    <article>
      <header class="mb-2 text-xl font-bold">编辑标签</header>
      <form action={`/tags/edit/${id}`} method="post" class="form-card">
        <div class="form-group">
          <label for="name">标签名称:</label>
          <input type="text" id="name" name="name" value={tag.name} required />
        </div>
        <button
          type="submit"
          class="bg-blue-500 text-white px-4 py-2 rounded"
        >
          保存修改
        </button>
      </form>
    </article>,
    {
      title: "编辑标签 - Hono BBS",
      user,
    }
  );
});

// 处理标签编辑
tags.post("/edit/:id", jwtAuth, adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"));
  const { name } = await c.req.parseBody();

  if (!name) {
    return c.render(
      <div>
        <h1>编辑标签失败</h1>
        <p>标签名称不能为空</p>
        <a href={`/tags/edit/${id}`}>返回</a>
      </div>,
      {
        title: "编辑标签失败 - Hono BBS",
        user: c.get("user"),
      }
    );
  }

  const tagService = TagService.getInstance(c.env.DB);
  const tag = await tagService.getTagById(id);

  if (!tag) {
    return c.render(
      <div>
        <h1>标签不存在</h1>
        <p>您请求的标签不存在或已被删除</p>
        <a href="/tags">返回标签列表</a>
      </div>,
      {
        title: "标签不存在 - Hono BBS",
        user: c.get("user"),
      }
    );
  }

  // 检查新名称是否已被其他标签使用
  const existingTag = await tagService.getTagByName(name as string);

  if (existingTag && existingTag.id !== id) {
    return c.render(
      <div>
        <h1>编辑标签失败</h1>
        <p>标签名称 "{name}" 已被使用</p>
        <a href={`/tags/edit/${id}`}>返回</a>
      </div>,
      {
        title: "编辑标签失败 - Hono BBS",
        user: c.get("user"),
      }
    );
  }

  // 更新标签
  await tagService.updateTag(id, name as string);

  return c.redirect("/tags");
});

// 删除标签页面
tags.get("/delete/:id", jwtAuth, adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"));

  const tagService = TagService.getInstance(c.env.DB);
  const tag = await tagService.getTagById(id);

  if (!tag) {
    return c.render(
      <div>
        <h1>标签不存在</h1>
        <p>您请求的标签不存在或已被删除</p>
        <a href="/tags">返回标签列表</a>
      </div>,
      {
        title: "标签不存在 - Hono BBS",
        user: c.get("user"),
      }
    );
  }

  return c.render(
    <div>
      <h1>删除标签</h1>
      <div class="card">
        <h3>标签: {tag.name}</h3>
        <p>创建时间: {new Date(tag.created_at+"Z").toLocaleString()}</p>

        <p class="warning">确定要删除这个标签吗？此操作不可撤销。</p>

        <div class="grid">
          <a
            href="/tags"
            class="bg-gray-500 text-white px-4 py-2 rounded text-center"
          >
            取消
          </a>
          <form
            id="delete-form"
            method="post"
            action={`/tags/delete/${id}`}
            style={{ display: "none" }}
          >
            <input type="hidden" name="confirm" value="true" />
            <button
              type="submit"
              class="bg-red-500 text-white px-4 py-2 rounded text-center"
            >
              确认删除
            </button>
          </form>
        </div>
      </div>
    </div>,
    {
      title: "删除标签 - Hono BBS",
      user: c.get("user"),
    }
  );
});

// 处理标签删除
tags.post("/delete/:id", jwtAuth, adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"));

  const tagService = TagService.getInstance(c.env.DB);
  const tag = await tagService.getTagById(id);

  if (!tag) {
    return c.render(
      <div>
        <h1>标签不存在</h1>
        <p>您请求的标签不存在或已被删除</p>
        <a href="/tags">返回标签列表</a>
      </div>,
      {
        title: "标签不存在 - Hono BBS",
        user: c.get("user"),
      }
    );
  }

  // 删除标签
  await tagService.deleteTag(id);

  return c.redirect("/tags");
});

export { tags };
