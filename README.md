# TCF Admin

Trang quản lý sujets cho app **TCF Practice** — dùng chung Supabase.

## Setup

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/tcf-admin
cd tcf-admin
npm install
```

### 2. Tạo file `.env.local`
```bash
cp .env.local.example .env.local
```

Điền vào các giá trị — **dùng CÙNG Supabase project** với app tcf-practice:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=mat-khau-cua-ban
```

### 3. Chạy local
```bash
npm run dev
# → http://localhost:3001
```

### 4. Deploy Vercel
```bash
npx vercel
```
Nhớ set các environment variables trong Vercel dashboard.

---

## Tính năng

| Tab | Chức năng |
|-----|-----------|
| ➕ Ajouter | Nhập tay từng sujet + idées POUR/CONTRE |
| 📦 Import JSON | Upload file .json để thêm nhiều sujet cùng lúc |
| 📋 Liste | Xem, ẩn/hiện, xóa sujet |

## Format JSON để import

```json
{
  "taskType": "tache3",
  "topics": [
    {
      "question": "Pensez-vous que le télétravail est bénéfique ?",
      "theme": "Travail",
      "difficulty": "B2",
      "pour": [
        { "idea": "Meilleur équilibre vie pro/perso", "example": "On peut gérer son temps plus librement." }
      ],
      "contre": [
        { "idea": "Isolement social", "example": "On perd le contact avec ses collègues." }
      ],
      "sampleOpinion": "À mon avis, le télétravail est globalement positif."
    }
  ]
}
```

## Kiến trúc

```
tcf-practice.vercel.app     tcf-admin.vercel.app
(app học của học sinh)       (app quản lý của bạn)
         ↓                           ↓
         └─────── Supabase ──────────┘
                 (chung 1 DB)
```

Nhập đề mới ở admin → **hiện ngay lập tức** trên app học, không cần deploy lại.
