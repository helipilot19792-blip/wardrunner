# WardRunner – Developer Quick Start

This file is your memory reset button.
If you forget what’s running or how this project works, start here.

---

# 🧠 What Makes WardRunner Work

WardRunner is built with:

- Next.js (App Router) – Frontend + API routes
- Supabase – Auth, Database, Realtime, RPC functions
- Git – Version control
- Vercel – Hosting / deployment
- VS Code – Code editor
- Node (npm) – Local development server

---

# 🖥 What You Usually Have Open

## 1️⃣ Visual Studio Code
This is where all code lives.

Important folders:

/app                → Pages & routes  
/app/api            → Backend API routes  
/lib                → Supabase client  
/public             → Images, sound files  

Important files:

- app/order/page.tsx → Customer order builder  
- app/runner/page.tsx → Runner dashboard  
- app/api/.../route.ts → Backend endpoints  

Helpful shortcuts:

- Ctrl + P → Jump to file  
- Ctrl + Shift + F → Search entire project  

---

## 2️⃣ Command Prompt (Terminal)

Usually open in:

C:\Users\helip\Desktop\wardrunner

Start dev server:

npm run dev

Check git:

git status

Commit & push:

git add .
git commit -m "your message"
git push

---

## 3️⃣ Supabase Dashboard

Controls:

- Users (Authentication)
- Tables (orders, order_items, profiles, runner_allowlist, etc.)
- RPC functions (accept_order, expire_orders)
- Realtime subscriptions

If something breaks with:
- Customer name
- Order not updating
- Push notifications

Check Supabase first.

---

## 4️⃣ Vercel

Hosts the live site.

When you run:

git push

Vercel automatically:
- Builds the project
- Deploys a new version

If live site doesn’t update:
Check Vercel → Deployments → Build logs

---

## 5️⃣ Public Folder (Static Files)

Anything in:

/public

Is available at:

/filename

Examples:

- public/new-order.mp3 → /new-order.mp3
- public/quickpicks/image.jpg → /quickpicks/image.jpg

IMPORTANT:
There is only ONE public folder.
It must be at the project root.

---

# 🔔 Realtime (Runner Push Notifications)

Runner page subscribes to:

postgres_changes → orders

If pushes stop after idle:
- Browser may suspend connection
- Realtime channel may disconnect
- Supabase token may expire

This is a known improvement task.

---

# 🛒 Customer Order Builder

File:

app/order/page.tsx

Cart behavior:
- Stored in sessionStorage
- Draft keys:
  - wardrunner_draft
  - wardrunner_draft_v2

Cart button scrolls to:

cartRef.current?.scrollIntoView()

---

# 🏃 Runner Dashboard

File:

app/runner/page.tsx

Sections:
- Queue
- In Progress
- History

Sound plays when:
- Queue length increases
- /new-order.mp3 exists

---

# 🚨 If Something Breaks

1. Run git status
2. Restart dev server
3. Hard refresh browser (Ctrl + Shift + R)
4. Check Supabase logs
5. Check browser console

---

# 🔄 Normal Workflow

1. Edit code in VS Code
2. Test locally at:

http://localhost:3000

3. When good:

git add .
git commit -m "message"
git push

4. Vercel auto-deploys

---

# 🧭 If You Forget Everything

You need:
- VS Code open
- Terminal in project folder
- npm run dev running
- Supabase dashboard open
- Browser at localhost

That’s it.