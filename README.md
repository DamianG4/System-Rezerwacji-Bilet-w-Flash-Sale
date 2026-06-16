# System Rezerwacji Biletów "Flash Sale"

Aplikacja stworzona w ramach zadania rekrutacyjnego dla Procforce.

## Technologie
* **Backend:** Node.js, Express, PostgreSQL, Prisma, Socket.io
* **Frontend:** Next.js, React, Tailwind CSS, SWR
* **Infrastruktura:** Docker, Docker Compose


## Jak uruchomić projekt lokalnie

Wymagania: zainstalowany **Docker** oraz **Docker Compose**.

### 1. Uruchomienie kontenerów
W głównym folderze projektu otwórz terminal i wykonaj komendę, która zbuduje i uruchomi bazę danych, backend oraz frontend:

```bash
docker compose up --build -d
```

### 2. Inicjalizacja bazy i wgranie danych (Seed)

Baza danych uruchamia się jako pusta. Aby zsynchronizować strukturę i wgrać dane testowe, należy skonfigurować lokalne połączenie:

1. W folderze `backend` utwórz plik o nazwie `.env` i wklej do niego poniższą zmienną:
```env
   DATABASE_URL="postgresql://postgres:password@localhost:5433/flash_sale"
```

2. Następnie otwórz nowy terminal w folderze backend i wykonaj kolejno polecenia:

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```

### 3. Gotowe

Aplikacja jest dostępna pod adresem:
http://localhost:3000

* Aby uruchomić test integracyjny sprawdzający zabezpieczenie przed overbookingiem, wpisz w folderze backendu:*

```bash
npm run test:race
```

