# xclone — X (Twitter) Clone with FastAPI + ScyllaDB + React

- **Ad Soyad:** <HÜSEYİN ELMUHAMMED>
- **Öğrenci No:** <22080410209>
- **Ders/Lab:** <NoSQL >

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

- Frontend bir nginx image olarak servis edilir (`frontend/Dockerfile`).
- Backend başlarken Scylla hazır olana kadar retry ile bekler ve `schema.cql`
  dosyasını keyspace/tablolar için otomatik uygular (`backend/app/db.py`).
- Tweet atıldığında fan-out on write yapılır: yazarın `tweets_by_user`ına,
  takipçilerin `home_timeline`ına ve parse edilen hashtag'ler için
  `tweets_by_hashtag`e yazılır.

## Frontend X Clone Olarak Tasarlandı

Frontend bilinçli olarak X arayüzüne yakın hissettirecek şekilde kurgulandı:

- Üç kolonlu grid (sol nav / orta feed / sağ trend paneli)
- Koyu tema, yuvarlatılmış kartlar, 𝕏 logo, "Post" butonu, composer 280 char counter
- Nav: Home, Explore, Notifications, Bookmarks, Profile
- Tweet kartı: avatar, display name, @handle, timestamp, içerik, like butonu,
  hashtag/mention'lar otomatik link
- Profil sayfası: gradient cover, büyük avatar, bio, followers/following, tweet listesi
- Explore + hashtag sayfası (bucket günü seçilebilir)
- Demo auth: `/login` kullanıcı adı girer, `/register` yeni hesap açar, kimlik
  `localStorage`'da tutulur. Gerçek parola/JWT yok — lab scope'u için yeterli.
- Responsive: 1100px altında sol nav ikonlu, 800px altında sağ panel gizlenir.

## ScyllaDB — Query-Driven Design

Cassandra/Scylla'da tablolar sorgulara göre tasarlanır. Aynı veriyi birden çok
tabloda denormalize tutarız, okuma tarafında tek partition okuyarak O(1)'e yakın
latency elde ederiz. JOIN yoktur.

### Tablolar

| Tablo | Partition Key | Clustering | Amaç |
|---|---|---|---|
| `users` | `user_id` | — | Kullanıcı canonical kaydı |
| `users_by_username` | `username` | — | Username unique + login lookup |
| `tweets_by_user` | `user_id` | `tweet_id DESC` | Profil sayfasında kullanıcının tweet'leri |
| `home_timeline` | `user_id` | `tweet_id DESC` | Takipçi timeline'ı (fan-out) |
| `following` | `user_id` | `followee_id` | Kimi takip ediyorum |
| `followers` | `user_id` | `follower_id` | Beni kim takip ediyor |
| `tweets_by_hashtag` | `(tag, bucket)` | `tweet_id DESC` | Hashtag akışı |
| `tweet_likes` | `tweet_id` | — | Counter — like sayısı |

### Denormalization neden?

- Aynı tweet hem `tweets_by_user`, hem her takipçinin `home_timeline`ında, hem
  hashtag tablosunda tutulur. Okuma tarafı tek partition scan, JOIN yok.
- `users_by_username` ayrı tablo çünkü username ile lookup yapmak için ikincil
  indeks yerine ayrı primary key kullanmak performanslıdır.
- `following`/`followers` iki yönlü ayrı tablolar — her iki yönden de hızlı sorgu.

### Hashtag bucketing neden?

Popüler bir hashtag tek partition altında milyonlarca satır biriktirebilir — bu
Scylla'da "wide row" problemine yol açar. `(tag, bucket='YYYY-MM-DD')` compound
partition key ile her gün yeni partition açarız → partition boyutu sınırlı,
sorgular hızlı. `GET /hashtags/{tag}` bugünün bucket'ından okur;
`GET /hashtags/{tag}?date=YYYY-MM-DD` belirli bir günü getirir.

### Counter tablosu neden ayrı?

Cassandra/Scylla'da counter column'lar non-counter column'larla aynı tabloda
bulunamaz. Ayrıca counter'lar idempotent değildir ve farklı consistency
semantiğine sahiptir. Bu yüzden `tweet_likes` sadece `tweet_id` + `like_count`
counter içeren minimal bir tablodur.

### TIMEUUID

`tweet_id timeuuid`: hem unique ID hem doğal zaman sıralaması. DESC clustering
ile en yeni tweet en üstte.

## Kurulum

Gereksinim: Docker + Docker Compose.

```bash
docker compose up -d
```

İlk açılışta Scylla'nın ayağa kalkması 30-60 sn sürebilir. Backend bu süre
boyunca retry eder ve hazır olunca `schema.cql`'i uygular.

### Erişim

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **Backend docs (Swagger):** http://localhost:3000/docs
- **ScyllaDB CQL:** `localhost:9042`

### Loglar

```bash
docker compose logs -f backend
docker compose logs -f scylla
```

### Durdur / reset

```bash
docker compose down           # container'ları kapat
docker compose down -v        # veriyi de sil (scylla-data volume)
```

## Endpoint Listesi

| Method | Path | Açıklama |
|---|---|---|
| GET | `/health` | Scylla bağlantısını kontrol eder |
| POST | `/register` | Yeni kullanıcı (409 duplicate username) |
| GET | `/users/{username}` | Profil + follower/following sayısı |
| POST | `/tweets` | Tweet oluştur (280 char max, hashtag parse, fan-out) |
| GET | `/users/{username}/tweets` | Kullanıcının tweet'leri (DESC) |
| GET | `/timeline/{user_id}` | Home timeline |
| POST | `/follow` | Follow işlemi (following + followers) |
| POST | `/tweets/{tweet_id}/like` | Counter increment |
| GET | `/tweets/{tweet_id}/likes` | Like sayısı |
| GET | `/hashtags/{tag}` | Bugünün bucket'ı |
| GET | `/hashtags/{tag}?date=YYYY-MM-DD` | Belirli bir gün |

## Örnek curl'ler

```bash
# Health
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","display_name":"Alice","bio":"hello"}'

curl -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","display_name":"Bob"}'

# Tweet (user_id'yi register cevabından al)
curl -X POST http://localhost:3000/tweets \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<ALICE_UUID>","content":"hello #scylladb world"}'

# Follow: bob, alice'i takip ediyor
curl -X POST http://localhost:3000/follow \
  -H 'Content-Type: application/json' \
  -d '{"follower_id":"<BOB_UUID>","followee_id":"<ALICE_UUID>"}'

# Bob'un timeline'ı
curl http://localhost:3000/timeline/<BOB_UUID>

# Like
curl -X POST http://localhost:3000/tweets/<TWEET_ID>/like
curl http://localhost:3000/tweets/<TWEET_ID>/likes

# Hashtag
curl http://localhost:3000/hashtags/scylladb
curl "http://localhost:3000/hashtags/scylladb?date=$(date -u +%Y-%m-%d)"

# Profil
curl http://localhost:3000/users/alice
curl http://localhost:3000/users/alice/tweets
```

## Demo kullanım akışı

1. `docker compose up -d`
2. http://localhost:5173/register → `alice` hesabını aç
3. Tarayıcıda başka bir profil/incognito → `bob` hesabı
4. `bob` ile giriş yap → `/u/alice` → **Follow**
5. `alice` ile giriş yap, bir tweet at: `Scylla rocks #scylladb`
6. `bob` ile giriş yap → Home timeline'da Alice'in tweet'i görünür
7. Tweet'in 🤍'sine tıkla → counter artar
8. `#scylladb` linkine tıkla → hashtag sayfası bugünün bucket'ını getirir
9. Sağ üstteki tarih input'u ile başka bir güne bak (muhtemelen boş)

## Varsayımlar ve Trade-Off'lar

- **Auth:** Lab scope'u için demo auth yeterli. `localStorage`'da sadece kimlik
  tutulur, parola/JWT yok. Gerçek üretimde bu bcrypt + JWT ile yapılırdı.
- **Fan-out on write:** Kullanıcı başına takipçi sayısı düşük olduğu sürece bu
  yaklaşım optimal. Çok büyük takipçi sayısında "fan-out on read" veya hibrit
  stratejiye geçilmelidir.
- **Follower count:** `SELECT COUNT(*)` kullanılıyor — küçük ölçek için yeterli.
  Üretimde ayrı bir counter tablosu ile tutulurdu.
- **Tweet silme / edit:** Kapsam dışı.
- **Replication factor:** `SimpleStrategy` RF=1, tek DC geliştirme için. Üretimde
  `NetworkTopologyStrategy` + RF≥3 gerekir.
- **Hashtag regex:** Basit `#(\w+)` kullanılıyor, Türkçe karakterler Python'un
  `\w` Unicode modunda yakalanır.
- **CORS:** `*` — geliştirme kolaylığı için. Üretimde kısıtlanmalı.
