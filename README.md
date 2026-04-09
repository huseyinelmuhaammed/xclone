# xclone

**Ad Soyad:** HÜSEYİN ELMUHAMMED  
**Öğrenci No:** 22080410209  
**Ders/Lab:** NoSQL

## Özet

Full-stack mini Twitter/X klonu. Backend FastAPI + ScyllaDB (query-driven tablolar,
counter tablo, hashtag bucketing, fan-out on write home timeline).
Frontend React + Vite + TypeScript ile yazılmış, koyu temalı, üç kolonlu X benzeri
UI. Her şey `docker compose up -d` ile ayağa kalkar.

## Teknolojiler

- **Backend:** Python 3.11, FastAPI, cassandra-driver, Uvicorn
- **DB:** ScyllaDB 5.4 (CQL)
- **Frontend:** React 18 + Vite + TypeScript, React Router, custom CSS (koyu tema)
- **Orkestrasyon:** Docker Compose (scylla + backend + frontend)

## Mimari

```
[ React SPA :5173 ]  --HTTP-->  [ FastAPI :3000 ]  --CQL-->  [ ScyllaDB :9042 ]
```

## Kurulum

Gereksinim: Docker + Docker Compose.

```bash
docker compose up -d
```

### Erişim

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **Backend docs (Swagger):** http://localhost:3000/docs
- **ScyllaDB CQL:** `localhost:9042`

## Endpoint Listesi

| Method | Path | Açıklama |
|---|---|---|
| GET | `/health` | Scylla bağlantısını kontrol eder |
| POST | `/register` | Yeni kullanıcı (409 duplicate username) |
| GET | `/users/{username}` | Profil + follower/following sayısı |
| POST | `/tweets` | Tweet oluştur (280 char max, hashtag parse, fan-out) |
| GET | `/users/{username}/tweets` | Kullanıcının tweet'leri (DESC) |
| GET | `/timeline/{user_id}` | Home timeline |
| POST | `/follow` | Follow işlemi |
| POST | `/tweets/{tweet_id}/like` | Counter increment |
| GET | `/tweets/{tweet_id}/likes` | Like sayısı |
| GET | `/hashtags/{tag}` | Bugünün bucket'ı |
| GET | `/hashtags/{tag}?date=YYYY-MM-DD` | Belirli bir gün |