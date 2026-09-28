# Vendor POS — бэлэн мөнгө ба хариултын шинэчилсэн төлөвлөгөө

2026-09-28 · Суурь commit: `cd2d02d9` · Branch: `codex/vendor-cash-change`

## Ажлын тусгаарлалт

Үндсэн MglStoreWeb checkout-д өөр agent-ийн чат/reel, visual-search, package болон lockfile өөрчлөлтүүд байна. Энэ ажлыг тусдаа Git worktree-д хийсэн. Үндсэн checkout-ийн branch, файл, dependency, ажиллаж буй процессуудыг өөрчлөөгүй. App-ийн managed worktree үүсгэх хэрэгсэл projectless чат дээр Git repository олоогүй тул Git worktree ашиглав. Shared package-ийн build, Prisma client generation мөн тусгаарласан dependency-д хийгдсэн; DB schema migration ажиллуулаагүй.

## Хүрээ ба үндсэн шийдвэр

Эхний хувилбар нь Vendor POS-ийн ердийн борлуулалтын cash tender юм. Org Restaurant POS болон зээлийн эргэн төлөлтийн урсгалыг дараагийн тусдаа ажлаар өргөтгөнө. Эдгээрийг энэ өөрчлөлтөөр хэрэгжсэн гэж үзэхгүй.

`amount` үргэлж борлуулалтад тооцох цэвэр дүн хэвээр байна. `cash.receivedAmount` нь авсан мөнгө, `cash.changeAmount` нь хариулт. Сервер клиентээс ирсэн хариултыг ашиглахгүй, авсан мөнгө ба тухайн CASH мөрийн `amount`-оос дахин бодно. `receivedAmount >= amount > 0`; metadata бусад төлбөрийн аргад зөвшөөрөгдөхгүй. Тооцооллыг бүхэл жижиг нэгжээр хийнэ. Орлого, eBarimt болон ээлжийн тооцоо авсан нийт мөнгөөр нэмэгдэхгүй.

## Хэрэгжүүлсэн хэсэг

- Shared domain helper: decimal оролт, finite/range/precision validation, цэвэр дүн, хариулт, historic metadata унших болон олон CASH мөрийн нийлбэр.
- `CashPaymentPanel` ба `useCashPayment`: авсан мөнгөний input, «Яг дүнгээр», том хариулт, invalid/empty/submitting/error төлөв, давхар submit-ийн lock.
- M Point асуулт авсан мөнгийг хадгална. Асуултыг хаахад cash автоматаар нэмэгдэхгүй; өөрчлөгдсөн үлдэгдэл/хариултыг хараад дахин батална.
- Хэсэгчилсэн CASH болон картын дараах үлдэгдэлд CASH ашиглах боломж. Бүх төлөлтийн нийлбэр төлөх дүнтэй жижиг нэгжээр яг таараагүй үед finalize хаалттай.
- Checkout entry → sale serializer → API normalization → JSON persistence → response/idempotency snapshot → receipt history гэсэн замд metadata дамжина.
- Баримт, дахин хэвлэлтэд цэвэр бэлэн төлөлт, авсан мөнгө, хариулт гарна. Metadata-гүй хуучин баримтад авсан мөнгө/хариултыг таамгаар харуулахгүй.
- Амжилтын дараа кассчин хаах эсвэл дараагийн checkout эхлэх хүртэл хариултын самбар үлдэнэ. Хэрэглэгчийн дэлгэцийн амжилтын мэдээлэлд хариулт орно.
- Cash API алдаа checkout дээр харагдана. Cash metadata-тай хүсэлтийн HTTP 404-ийг хуурамч local receipt болгон хувиргахгүй.

## Баталгаажуулалт

- `pnpm --filter @mgl/database build` — Prisma client үүсгэх, package build; DB-тэй холбогдохгүй.
- `pnpm --filter @mgl/types build`.
- Vendor болон API TypeScript шалгалт.
- Нийт 23 unit/regression тест тэнцсэн. Domain validation, хуурамч change metadata, legacy мөр, JSON round trip, олон CASH мөр, холимог төлбөр, ээлжийн цэвэр орлого, баримт/дахин хэвлэлтийн unit/regression тест.
- Browser дээр тусгаарласан React checkout harness: 5,500₮ төлбөрт 20,000₮ авбал 14,500₮ хариулт; M Point асуултын дараа дүн хадгалагдах/тусдаа батлах; 3,000₮ хэсэгчилсэн төлөлтөд 2,500₮ үлдэх; «Яг дүнгээр»; сөрөг дүнгийн алдаа ба disabled батлах товч. Бодит stylesheet-тэй 1280×720 харагдах байдлыг шалгасан.

Browser harness нь UI логикийг шалгасан бөгөөд бодит сервер, хэвлэгч, картын терминал, QPay, eBarimt эсвэл production DB-ийн end-to-end тест биш. Бодит мөнгөн гүйлгээ хийгээгүй.

## Дараагийн хэрэгжүүлэлт ба release gate

1. Test DB-тэй HTTP integration: create → idempotent retry → history/reprint, transaction rollback, хуурамч/дутуу metadata, discount/M Point payable total. Давтан хүсэлт ижил sale ID болон ижил cash metadata буцаахыг батлах.
2. Checkout recovery-г тусдаа төлбөрийн snapshot загварт шилжүүлэх: cart/discount/loyalty өөрчлөлт, checkout-оос буцах, reload, QR recovery үед баталсан CASH-ийг алдахгүй хадгалах; өөрчлөгдсөн нийтэд дахин баталгаа шаардах. Одоогийн retry нь баталсан payment entries болон `clientSaleId`-г ашигладаг; ерөнхий reload/offline persistence шинээр нэмээгүй.
3. Хэрэглэгч бэлнээр төлөх хэсгээ тусад нь заах өргөтгөл. Энэ хувилбарт `applied = min(received, remaining)`; жишээ нь 5,500₮ үлдэгдлээс зөвхөн 3,000₮-ийг бэлнээр тооцох атлаа 20,000₮ авч 17,000₮ буцаах тусдаа allocation input хараахан байхгүй.
4. Алдаа/retry/double-click, M Point redemption, хэвлэгч ба customer-display дээр staging end-to-end тест; жижиг дэлгэц, keyboard/focus, урт тоо, олон payment row-ийн нэмэлт UI шалгалт.
5. Backend-ийг эхэлж байршуулж optional metadata хадгалж байгааг батлаад Vendor frontend-ийг байршуулна. Cash-only, card+cash болон legacy receipt-ийн smoke test хийнэ. Сервер metadata дэмждэгийг батлахаас өмнө шинэ frontend нэвтрүүлэхгүй.
6. Org Restaurant ба credit repayment-ийг тусдаа handler/API/receipt contract-аар өргөтгөнө. Shared helper дахин ашиглана; repayment-ийн дүнг ердийн sale замд оруулахгүй.

## Нэгтгэх зарчим

Тусдаа branch-ийг хянаж, тухайн үеийн main дээр conflict шалгасны дараа нэгтгэнэ. Нөгөө agent-ийн өөрчлөлтийг overwrite/revert хийхгүй. Энэ ажлын хүрээнд main руу merge, push, deploy хийгээгүй.
