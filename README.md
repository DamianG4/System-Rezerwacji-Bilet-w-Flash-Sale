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

Baza danych uruchamia się jako pusta. Aby utworzyć tabele i wgrać początkowe wydarzenia testowe, otwórz nowy terminal, przejdź do folderu backendu i wykonaj:

```bash
npx prisma db push
npm run seed
```

### 3. Gotowe!

Aplikacja jest dostępna pod adresami:

* **Frontend:** http://localhost:3000
* **Backend API:** http://localhost:4000

* Aby uruchomić test integracyjny sprawdzający zabezpieczenie przed overbookingiem, wpisz w folderze backendu:*

```bash
npm run test:race
```

