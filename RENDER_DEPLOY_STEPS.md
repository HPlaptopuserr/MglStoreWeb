# Render Blueprint Deploy - Алхам Алхмаар

## 1️⃣ **Blueprint Deployment Эхлүүлэх**

Render Dashboard дээр:

```
"Create new service" → "Blueprint"
```

## 2️⃣ **GitHub Repository Сонгох**

1. **"Connect account"** - GitHub холбок (хэрэв холбогдоогүй бол)
2. **Repositories** - `MglStoreWeb` сонгох
3. **Branch** - `main` сонговс

## 3️⃣ **Render.yaml Auto-Detection**

Render автоматик уншина:

- ✅ `mgl-web` (Frontend)
- ✅ `mgl-admin` (Admin Panel)
- ✅ `mgl-vendor` (Vendor Portal)
- ✅ `mgl-api` (Backend API)
- ✅ `mglstore` (PostgreSQL Database)

## 4️⃣ **Environment Variables Заполнить**

### Web Apps (mgl-web, mgl-admin, mgl-vendor):

```
NEXT_PUBLIC_API_URL = https://mgl-api-xxxxx.onrender.com
NODE_ENV = production
```

### API App (mgl-api):

```
DATABASE_URL = (Render үүсгэнэ автоматик)
NODE_ENV = production
```

**Note:** DATABASE_URL-г мэдэмүүний дараа дахин нэмэх хэрэгтэй!

## 5️⃣ **Deploy Товч Дарах**

Жижиг "Deploy" товч → Deployment эхлэнэ (⏱️ 10-15 минут)

## 6️⃣ **Build Progress Мониторинг**

Render Dashboard-ын дээр "Events" tab-д logs харагдана:

- 📦 `pnpm install --frozen-lockfile`
- 🔨 `pnpm build`
- 🚀 Service deployment

## 7️⃣ **Deployed URLs Авах**

Deployment дүрсэлд:

```
mgl-web  → https://mgl-web-[random].onrender.com
mgl-admin → https://mgl-admin-[random].onrender.com
mgl-vendor → https://mgl-vendor-[random].onrender.com
mgl-api  → https://mgl-api-[random].onrender.com
```

## 8️⃣ **Update Web Apps' NEXT_PUBLIC_API_URL**

Дараа API URL авсны дараа:

1. Each web service дээр дарах
2. **Environment** tab
3. `NEXT_PUBLIC_API_URL` ᠆ UPDATE хийх
4. **Redeploy** товч дарах

## 9️⃣ **Health Check**

```bash
# API эргүүлэп эсэх шалга
curl https://mgl-api-xxxxx.onrender.com/health

# Web app ачаалж буцаав
curl https://mgl-web-xxxxx.onrender.com
```

## ✅ **Success Signs**

- ✅ "Live" статус гарсан всех services
- ✅ API응답 өгөнө
- ✅ Web page loading байна
- ✅ Logs-д errors байхгүй

---

**Чит Sheet:**

- Render free: $0.10/hour compute
- Auto-deploy бүх push-ыг
- PostgreSQL үйлдэл хийнэ Render өөрс
