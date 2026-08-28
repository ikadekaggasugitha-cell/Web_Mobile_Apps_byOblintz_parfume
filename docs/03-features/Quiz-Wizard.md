# Quiz/Wizard

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Quiz/Wizard |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Quiz/Wizard adalah fitur personalisasi untuk membantu pengguna menemukan parfum yang sesuai dengan preferensi mereka.

---

## 2. Features

### 2.1 Quiz Steps

| Step | Question | Options |
|------|----------|---------|
| 1 | Mood | Romantic, Fresh, Elegant, Bold, Mysterious |
| 2 | Occasion | Daily, Formal, Party, Date Night, Special Event |
| 3 | Notes Preference | Floral, Citrus, Woody, Oriental, Fresh, Gourmand |
| 4 | Intensity | Light, Medium, Strong |
| 5 | Budget | < 200rb, 200-500rb, 500rb-1jt, > 1jt |
| 6 | Size Preference | Travel (10-30ml), Regular (50ml), Large (100ml) |
| 7 | Gender | Unisex, Female, Male |

### 2.2 Output

- Rekomendasi 3-5 parfum
- Skor kecocokan (0-100%)
- Penjelasan singkat per rekomendasi

### 2.3 History

- Simpan hasil quiz
- Lihat quiz sebelumnya
- Bandingkan hasil

---

## 3. User Flow

```
Start Quiz
   │
   ▼
┌─────────────┐
│  Step 1:    │
│  Mood       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Step 2:    │
│  Occasion   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Step 3:    │
│  Notes      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Step 4:    │
│  Intensity  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Step 5:    │
│  Budget     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Results    │
│  - 3-5      │
│  products   │
└─────────────┘
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /quiz/start | Start new quiz session |
| POST | /quiz/answer | Submit answer for a step |
| GET | /quiz/result/:sessionId | Get quiz results |
| POST | /quiz/save | Save quiz to user profile |

---

## 5. Algorithm

```
1. User answers questions
2. System calculates match score per product:
   - Mood match: 25%
   - Occasion match: 20%
   - Notes match: 30%
   - Budget match: 15%
   - Other preferences: 10%
3. Sort products by score
4. Return top 3-5 recommendations
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
