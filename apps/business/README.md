# MGL Business

Next.js App Router дээрх бизнесийн танилцуулга, барилгын удирдлага, ажиллах хүчний удирдлагын веб апп. Workspace package: `@mgl/business`, development port: `3005`.

## Бүтэц

```text
business/
├── public/                         # URL-аар шууд үйлчлэх зураг, PDF, брэндийн asset
├── eslint/                         # Модулийн хамаарлын дүрэм, түүний тест
├── src/
│   ├── app/                        # Next.js routing, metadata, layout, route boundary
│   │   ├── _components/            # Аппын түвшинд feature-үүдийг холбох UI
│   │   ├── api/                    # Feature-ийн server handler-ийг экспортлох route
│   │   ├── attendance/             # Workforce URL-ууд
│   │   └── building/               # Building URL-ууд
│   ├── features/
│   │   ├── business-intro/         # Нүүр хуудас, үйлчилгээний танилцуулга
│   │   │   ├── components/         # Танилцуулгын reusable section-ууд
│   │   │   ├── content/            # Танилцуулга болон maintenance контент
│   │   │   ├── model/              # Статусын төрөл, pure normalization
│   │   │   ├── server/             # Үйлчилгээний статус унших
│   │   │   └── styles/             # Feature-ийн CSS
│   │   ├── building/
│   │   │   ├── api/                # Browser-оос same-origin API дуудах client
│   │   │   ├── components/         # Building дотор нийтлэг shell, card, illustration
│   │   │   ├── model/              # URL үүсгэх, block resolve хийх pure логик
│   │   │   ├── server/             # Backend уншилт, cookie/session
│   │   │   │   └── handlers/       # Proxy, session, registration handler
│   │   │   ├── home/               # Төсөл сонгох нүүр
│   │   │   ├── management/         # Төсөл, блок, давхар, inventory удирдлага
│   │   │   ├── blocks/             # Блокийн тойм, workspace
│   │   │   ├── website/            # Төслийн веб контент, facade, public viewer
│   │   │   ├── plans/              # Давхрын план засварлах студи
│   │   │   ├── masterplan/         # Ерөнхий төлөвлөгөөний editor ба viewer
│   │   │   ├── units/              # Байрны мэдээлэл, зураг, төлбөрийн нөхцөл
│   │   │   ├── customers/          # Худалдан авагчийн мэдээлэл
│   │   │   ├── purchases/          # Гэрээ, худалдан авалт, төлбөрийн хуваарь
│   │   │   ├── dashboard/          # Удирдлагын үзүүлэлтүүд
│   │   │   ├── finance/            # Мөнгөн урсгал, авлага, санхүүгийн workspace
│   │   │   ├── notifications/      # Мэдэгдлүүд
│   │   │   ├── project-site/       # Төслийн танилцуулга, demo experience
│   │   │   ├── sales/              # Борлуулалтын inventory, байр сонголт
│   │   │   ├── viewer/             # Интерактив давхар, байрны viewer
│   │   │   ├── euro-plaza/         # Euro Plaza-ийн тусгай контент, план
│   │   │   └── styles/             # Building-ийн суурь CSS
│   │   └── workforce/
│   │       ├── components/         # Workforce-ийн нийтлэг UI, dialog
│   │       ├── hooks/              # Controller, task болон resource hook
│   │       ├── model/              # Navigation, task, addon, billing төрөл ба логик
│   │       ├── server/handlers/    # Cookie/session болон API proxy
│   │       ├── views/              # Сонгосон section-ийн дэлгэцүүд
│   │       ├── analytics/          # Тооцоолол, chart, attendance matrix
│   │       ├── reports/            # Тайлангийн filter, хүснэгт, хугацааны логик
│   │       └── locations/          # Газрын зураг, байршлын dialog
│   └── shared/
│       ├── hooks/                  # Домэйнээс хамааралгүй hook
│       ├── ui/                     # Password input, loading visualization
│       └── server/                 # Backend URL, request origin policy
├── next.config.ts
├── eslint.config.mjs
├── tsconfig.json
└── package.json
```

## Байршуулах дүрэм

- `app`: URL, metadata, redirect, access boundary, layout ба feature composition. API-ийн хэрэгжүүлэлтийг тухайн feature-ийн `server/handlers` хэсэгт байрлуулна. Одоогийн URL-уудыг өөрчлөөгүй.
- `features`: бизнесийн үүргээр кодоо эзэмшинэ. Feature нь өөрийн код, `shared`, workspace package-уудаас хамаарна. Өөр feature болон `app`-аас импортлохгүй.
- `shared`: бизнесийн домэйнээс хамааралгүй код. `app` болон `features`-ээс хамаарахгүй. Зөвхөн нэг feature-д хэрэгтэй кодыг энд байрлуулахгүй.
- `server`: cookie, backend credential, request-origin policy болон серверийн fetch. Client Component-оос runtime импорт хийхгүй. Server/client экспорт хольсон barrel файл үүсгэхгүй.
- `api`: browser-оос route handler дуудах код. Backend session credential энд байрлуулахгүй.
- `model`: React-ээс хамааралгүй төрөл, validation, transformation. API хооронд хуваалцах домэйн contract `@mgl/types` package-д үлдэнэ.
- Том feature-ийн дэд хэсэгт компонент, hook, pure model, CSS, тестээ хамт байрлуулна. Зөвхөн төрөл тус бүрээр бүх файлыг нэг том хавтсанд цуглуулахгүй; нэг файлтай хавтсыг механикаар олшруулахгүй.
- Feature-ээс гадуурх импортод `@/` alias, ойролцоох модульд relative import ашиглана. Хэрэглэж буй файлыг шууд импортлож server/client bundle-ийг санамсаргүй холихоос сэргийлнэ.
- Анхдагчаар Server Component. Browser API, interaction, React state шаардсан компонент ба hook-д `"use client"` хэрэглэнэ.

Аппын `BusinessLoading` нь pathname-оос workforce loader сонгодог тул `app/_components`-т байна. Харин loading дүрслэл ба password input нь `shared/ui`-д байна. Ингэснээр shared код feature-ээс хамаарахгүй.

## Хамаарлыг хамгаалах

`eslint/architecture.mjs` нь alias, relative import, re-export, literal dynamic import-ыг шалгана:

```text
app → features → shared
app → shared
feature → тухайн feature-ийн өөрийн дэд хэсгүүд
```

Client Component-оос `server` хавтасны хэрэгжүүлэлт импортлоход мөн алдаа өгнө. Энэ нь шууд импортын шалгалт; серверийн транзитив boundary-г Next.js compilation мөн шалгана.

## Шалгах команд

Repository root-оос:

```sh
pnpm --filter @mgl/business dev
pnpm --filter @mgl/business type-check
pnpm --filter @mgl/business lint
pnpm --filter @mgl/business test:architecture
pnpm --filter @mgl/business build
```

Pure логикийн `*.test.ts` файлууд хэрэгжүүлэлтийнхээ дэргэд байрлана. Repository-д байгаа `tsx` runner-аар ажиллуулах жишээ:

```sh
apps/api/node_modules/.bin/tsx --test \
  apps/business/src/features/building/model/*.test.ts \
  apps/business/src/features/building/plans/*.test.ts \
  apps/business/src/features/building/units/*.test.ts \
  apps/business/src/features/workforce/analytics/*.test.ts \
  apps/business/src/features/workforce/reports/*.test.ts \
  apps/business/src/shared/server/*.test.ts

apps/api/node_modules/.bin/tsx scripts/check-building-block-drafts.ts
```

`useWorkforceResource` нь resource, refresh token, revision солигдоход хуучин үр дүнг харуулахгүй; өмнөх хүсэлтийг цуцалж loading/error-оо тухайн сонголтод тааруулна. `useCurrentTime` нь hydration-ийн эхний render-ийг тогтвортой байлгаж, цаг хугацаанд хамаарсан UI-г минут тутам шинэчилнэ.

## Нууц үг шинэчлэх / Verify.mn

`/account/password?context=building|buyer|workforce` нь бүртгэлтэй утсаар нууц үг сэргээнэ. `&mode=change` нь тухайн ажлын орчны HttpOnly session болон одоогийн нууц үгээр солих горим. Барилга, худалдан авагч, цаг удирдлагын нэвтрэх дэлгэцээс сэргээх холбоос, удирдлагын цэснээс солих холбоос нээгдэнэ. Нууц үгийн өөрчлөлт нийт MGL бүртгэлд үйлчилнэ.

- Business серверт `BUSINESS_PASSWORD_SECRET` (дор хаяж 32 тэмдэгт, `openssl rand -hex 32`-оор үүсгэх) тохируулна. Render Blueprint нь шинэ secret-ийг `generateValue: true`-ээр үүсгэнэ; өөр орчинд гараар тохируулна. Production-д тохируулаагүй бол сэргээх хүсэлт 503 буцаана. `.env.password.example`-ийг үзнэ үү.
- API серверт `VERIFY_MN_API_KEY`, `VERIFY_MN_CALLBACK_URL` эсвэл `API_PUBLIC_URL` тохируулна. Callback: `/auth/web/verify-mn/callback`. Одоо байгаа `/auth/forgot-password`, `/auth/forgot-password/verify-mn/complete`, `/auth/reset-password`, `/auth/web/change-password` endpoint-уудыг ашиглана.
- Хэрэглэгч Verify.mn-ээс буцсан дугаарт заасан текстийг SMS-ээр илгээж, дараа нь баталгаажуулах товч дарна. Сервер provider-ийн төлөвийг шалгана; callback дангаараа баталгаажуулалт болохгүй.
- Provider session болон утсыг хугацаатай HMAC гарын үсэгтэй HttpOnly cookie-д холбоно. Reset token browser JavaScript-д дамжихгүй; HttpOnly, SameSite=Strict cookie-д 10 минут хадгална. Mutating request бүр origin шалгана, хариу cache хийхгүй. Олон tab дээр сэргээхэд хамгийн сүүлийн хүсэлт хүчинтэй.
- Локал API нь түлхүүргүй үед development fallback ашигладаг. Энэ нь бодит SMS туршилт биш. Production шалгалтад Verify.mn түлхүүртэйгээр бүртгэлтэй дугаараас SMS илгээх, хугацаа дуусах, буруу одоогийн нууц үг, шинэ нууц үгээр дахин нэвтрэхийг шалгана.

## Байгууллагын ажилтны мэдээлэл

Ажилтан → Засах цонхонд овог нэр, регистр, төрсөн огноо, хүйс, холбоо барих утас/имэйл, хаяг, ажилтны код, албан тушаал, ажилд орсон огноо, яаралтай холбоо барих мэдээлэл болон тэмдэглэл оруулна.

Эдгээрийг `OrganizationMember`-ийн `WorkforceEmployeeProfile` бүртгэлд хадгална. `User` / `Profile`, MGLStore-ийн үндсэн мэдээлэл, өөр байгууллагын гишүүнчлэлийг өөрчлөхгүй. Хадгалсан байгууллагын нэр, холбоо барих мэдээлэл нь тухайн байгууллагын цаг удирдлага, тайланд ашиглагдана. Үндсэн бүртгэлээс анхны утгыг зөвхөн уншиж санал болгоно. Нэвтрэх имэйл өөрчлөгдөхгүй. Үндсэн MGL бүртгэл рүү автоматаар синк хийхгүй; хэрэглэгчийн шалгалт, баталгаажуулалт бүхий тусдаа урсгалгүйгээр үндсэн мэдээллийг шинэчлэхгүй.

Алба хэлтсийг бичиж эсвэл өмнөх нэрээс сонгож болно. Шинэ хэлтэс ба ажилтны мэдээлэл нэг transaction-д хадгалагдана. Нэрийн зай болон том/жижиг үсгийн ялгаагаар шинэ давхардал үүсгэхээс сэргийлнэ. Жагсаалт зөвхөн сонгосон байгууллагаас ирнэ. Ажилтны хэлтсийг хоослоход хадгалсан хэлтэс устахгүй.

Дэлгэрэнгүй мэдээллийг зөвхөн ажилтны бүртгэл удирдах эрхтэй OWNER/ADMIN `/api/workforce/employees/:id` хүсэлтээр уншина. Регистр, хаяг, төрсөн огноо, тэмдэглэл нь ердийн ажилтны snapshot-д орохгүй. Өөрчлөлт audit түүхтэй.

Байршуулахдаа API-гаас өмнө `20261027050000_workforce_employee_profile` migration-ийг хэрэгжүүлнэ. Локал шинэ тестүүд:

```sh
apps/api/node_modules/.bin/tsx --test \
  apps/api/src/services/workforce/employee-profile.test.ts \
  apps/api/src/routes/workforce/employee-profile.integration.test.ts
```

Integration тест нь зөвхөн localhost PostgreSQL дээр тусдаа түр байгууллага үүсгэж ажиллана. Үндсэн бүртгэл болон өөр байгууллага өөрчлөгдөөгүй, шинэ хэлтэс дахин ашиглагдсан, зөвшөөрөлгүй хандалт хаагдсаныг шалгана.

Ажилтны жагсаалтын мөр эсвэл нэрийг дарахад зураг, сонгосон байгууллага, албан тушаал, хэлтэс, холбоо барих мэдээлэлтэй дэлгэрэнгүй цонх нээгдэнэ. Нэрийн товч keyboard-аар ажиллана. Удирдах эрхтэй хэрэглэгч тухайн цонхноос хувийн дэлгэрэнгүй мэдээллээ уншиж, засах горимд шилжинэ; бусад харах эрхтэй хэрэглэгч зөвхөн snapshot дахь байгууллагын үндсэн мэдээлэл харна. Бусад байгууллага дахь гишүүнчлэлийг жагсаахгүй.

Бүртгэлтэй хэрэглэгчийн зургийг зөвхөн уншиж харуулна. `/api/auth/profile/uploads/...` зургийн замыг `/api-proxy/auth/profile/uploads/...` болгон чиглүүлнэ. Зураггүй эсвэл ачаалах алдаатай үед нэрийн эхний үсэг гарна. Үндсэн зураг солих, өөр аппын профайлд бичих хүсэлт илгээхгүй.

### Цалингийн данс

Ажилтны дэлгэрэнгүй → **Цалингийн данс** табаас банк, дансны дугаар/IBAN, данс эзэмшигчийг харж, нэмэх эсвэл засах боломжтой. Нэмэх үйлдэл засах popup-ийн банкны талбарт шууд очно. Эдгээр 3 талбарыг хамтад нь бүртгэнэ; бүгдийг хоослоод хадгалбал бүртгэлээс цэвэрлэнэ. Дансны эхний тэгүүд хадгалагдана. Үсэг, тооны хэлбэр ба уртыг шалгах нь банкны баталгаажуулалт биш; энэ хэсэг дансны мэдээлэл хадгалдаг бөгөөд банкны API холболт, цалингийн шилжүүлэг хийхгүй.

Данс зөвхөн тухайн байгууллагын `WorkforceEmployeeProfile`-д хадгалагдаж, OWNER/ADMIN-ийн хамгаалсан дэлгэрэнгүй API-аар уншигдана. Ердийн snapshot-д дансны талбарууд нэмэгдээгүй. Дэлгэрэнгүй цонхонд дугаар халхлагдсан, товчоор бүтнээр нь харна. Audit snapshot-д зөвхөн сүүлийн 4 орон үлдэнэ. Хэрэглэгчийн үндсэн MGL бүртгэл, өөр байгууллагын дансыг өөрчлөхгүй.

Байршуулах дараалал: `20261027060000_workforce_payroll_account` migration → API → Business. Локал integration тест нь бүрэн бус дансыг буцаах, хадгалах/цэвэрлэх, хамааралгүй засварын дараа данс хэвээр үлдэх, audit-д дугаар халхлагдах, өөр байгууллага болон харах эрхтэй ажилтанд задрахгүйг шалгана.
