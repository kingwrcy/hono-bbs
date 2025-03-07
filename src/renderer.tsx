import { jsxRenderer } from 'hono/jsx-renderer'
import { ExtendedJWTPayload } from './types';
import { generateClientScripts } from './utils/clientScripts';

// SVG图标组件
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const TagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
    <path d="M7 7h.01"></path>
  </svg>
);

const PostIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LoginIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
    <polyline points="10 17 15 12 10 7"></polyline>
    <line x1="15" y1="12" x2="3" y2="12"></line>
  </svg>
);

const RegisterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <line x1="19" y1="8" x2="19" y2="14"></line>
    <line x1="16" y1="11" x2="22" y2="11"></line>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

interface HeaderProps {
  user?: ExtendedJWTPayload | null;
}

const Header = ({ user }: HeaderProps) => {
  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <header>
      <nav>
        <ul className="flex items-center space-x-2">
          <li><strong>Acme Corp</strong></li>
          <li>
            <a href="/" class="secondary flex items-center space-x-2">
              <span class="flex items-center justify-center"><HomeIcon /></span>
              <span class="hidden md:inline-block">首页</span>
            </a>
          </li>
          <li>
            <a href="/tags" class="secondary flex items-center space-x-2">
              <span class="flex items-center justify-center"><TagIcon /></span>
              <span class="hidden md:inline-block">标签</span>
            </a>
          </li>
          {isLoggedIn && (
            <>
              <li>
                <a href="/posts/new" class="secondary flex items-center space-x-2">
                  <span class="flex items-center justify-center"><PostIcon /></span>
                  <span class="hidden md:inline-block">发布</span>
                </a>
              </li>
              <li>
                <a href={`/profile/${user.username}`} class="secondary flex items-center space-x-2">
                  <span class="flex items-center justify-center"><UserIcon /></span>
                  <span class="hidden md:inline-block">{user.username}</span>
                </a>
              </li>             
            </>
          )}
          {!isLoggedIn && (
            <>
              <li>
                <a href="/user/reg" class="secondary flex items-center space-x-2">
                  <span class="flex items-center justify-center"><RegisterIcon /></span>
                  <span class="hidden md:inline-block">注册</span>
                </a>
              </li>
              <li>
                <a href="/user/login" class="secondary flex items-center space-x-2">
                  <span class="flex items-center justify-center"><LoginIcon /></span>
                  <span class="hidden md:inline-block">登录</span>
                </a>
              </li>
            </>
          )}
          {isLoggedIn && (
            <li>
              <a href="/user/logout" class="secondary flex items-center space-x-2">
                <span class="flex items-center justify-center"><LogoutIcon /></span>
                <span class="hidden md:inline-block">退出</span>
              </a>
            </li>
          )}
        </ul>
      </nav>
    </header>
  )
}

export const renderer = jsxRenderer(({ children, title, user }) => {
  return (
    <html lang="zh_CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>{title}</title>
        <link rel="stylesheet" href="/static/main.css?v=1.0.3" />
        <link rel="icon" href="/static/favicon.ico" />
        <script src="https://cdn.jsdelivr.net/npm/@unocss/runtime"></script>
        <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.4/dist/htmx.min.js"></script>
      </head>
      <body un-cloak>
        <main class="container ">
          <Header user={user} />
          {children}
        </main>
        <script src="/static/js/client.js"></script>
      </body>
    </html>
  )
})
