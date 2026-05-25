# Order Tracker

Aplikacja do trackowania zamówień na mapie. Stack: **React + Vite (client)**, **Node.js + Express + MongoDB (server)**, **Leaflet + OpenStreetMap** (mapa), **Nominatim** (geokodowanie), **Google Maps Directions URL** (eksport tras).

Dwie role:
- `user` – dodaje i zarządza własnymi zamówieniami, widzi tylko swoje pinezki.
- `admin` – widzi wszystkie zamówienia, filtruje, planuje trasę (drag&drop kolejności) i eksportuje do Google Maps.

---

## Uruchomienie

### 1. Wymagania
- Node.js 18+
- Konto MongoDB Atlas (darmowy klaster M0) lub lokalny MongoDB

### 2. Backend (`server/`)
```bash
cd server
npm install
cp .env.example .env
# uzupełnij MONGODB_URI i JWT_SECRET
npm run dev
```
Serwer startuje na `http://localhost:4000`.

### 3. Frontend (`client/`)
W drugim terminalu:
```bash
cd client
npm install
npm run dev
```
Klient startuje na `http://localhost:5173`.

### 4. Pierwszy admin
Po rejestracji nowego konta, w bazie MongoDB ustaw rolę admina:
```js
db.users.updateOne({ email: 'twoj@email.com' }, { $set: { role: 'admin' } })
```
Po wylogowaniu i ponownym logowaniu rola będzie aktywna.

---

## Funkcje

### User
- Rejestracja / logowanie
- Dodawanie zamówień: tytuł, imię, nazwisko, kod pocztowy, miasto, adres, data dostawy, szczegóły
- Automatyczne geokodowanie adresu przez Nominatim → pinezka na mapie
- Edycja, zmiana statusu (Nowe / W trasie / Dostarczone / Anulowane), usuwanie
- Mapa z własnymi zamówieniami, popup z danymi

### Admin
- Widok wszystkich zamówień z filtrami (użytkownik, status, data dostawy)
- Lista wszystkich użytkowników
- **Planowanie trasy**: zaznacz zamówienia checkboxami → drag&drop kolejności → eksport do Google Maps jako link nawigacyjny
- Auto-podział na kilka linków przy >10 punktach (limit Google Maps URL)

---

## Stack

| Warstwa | Technologia |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind, react-leaflet, @dnd-kit |
| Backend | Express, Mongoose, JWT, bcryptjs |
| Baza | MongoDB Atlas (free tier M0) |
| Mapa | Leaflet + OpenStreetMap |
| Geokodowanie | Nominatim (OSM) |
| Routing trasy | Google Maps Directions URL |

---

## Struktura

```
Order-tracker/
├─ server/        # Express API
├─ client/        # React + Vite SPA
└─ README.md
```
