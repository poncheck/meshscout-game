# MeshScout Game

Wieloosobowa gra terenowa oparta na sieci Meshtastic. Gracze zdobywają punkty wysyłając pakiety traceroute - im dalej przejdzie pakiet, tym wyższy wynik.

## 🎮 Funkcjonalności

- **Real-time MQTT ingestion** - pobieranie pakietów z sieci Meshtastic
- **Dekodowanie Meshtastic** - automatyczne rozszyfrowywanie pakietów publicznym kluczem
- **Wysokowydajna baza** - TimescaleDB obsługująca ~300 zapisów/s i odczytów/s
- **Mapa H3** - wizualizacja aktywności na siatce H3 (rozdzielczość 8)
- **Mapbox** - interaktywna mapa z trasami pakietów i węzłami
- **Leaderboard** - ranking graczy w czasie rzeczywistym

## 🏗️ Architektura

```
meshscout-game/
├── services/
│   ├── ingestion/     # MQTT → Dekoder → Database
│   ├── api/           # REST API Backend
│   └── web/           # Next.js Frontend
├── packages/
│   ├── shared/        # Wspólne typy i utilities
│   └── database/      # Prisma schema i migracje
└── docker-compose.yml
```

## 🚀 Quick Start

### Wymagania
- Docker & Docker Compose
- Node.js 20+ (do lokalnego developmentu)
- Mapbox Access Token

### Instalacja

1. **Sklonuj repozytorium**
```bash
git clone https://github.com/poncheck/meshscout-game.git
cd meshscout-game
```

2. **Skonfiguruj zmienne środowiskowe**
```bash
cp .env.example .env
# Edytuj .env i ustaw:
# - DATABASE_PASSWORD
# - MQTT_BROKER (adres lokalnego brokera MQTT)
# - NEXT_PUBLIC_MAPBOX_TOKEN
```

3. **Uruchom projekt**
```bash
docker-compose up -d
```

4. **Aplikacja dostępna:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Database: localhost:5432

## 📦 Stack Technologiczny

- **Database**: TimescaleDB (PostgreSQL + time-series)
- **Ingestion**: Node.js + MQTT.js + Meshtastic Protobuf
- **API**: Node.js + Express + Prisma
- **Frontend**: Next.js + React + Mapbox GL + H3-js
- **Deployment**: Docker + Docker Compose

## 🔧 Development

### Lokalne uruchomienie bez Dockera

```bash
# Install dependencies
npm install

# Start database
docker-compose up timescaledb -d

# Run migrations
npm run db:migrate

# Start services
cd services/ingestion && npm run dev &
cd services/api && npm run dev &
cd services/web && npm run dev
```

### Database Management

```bash
# Prisma Studio
npm run db:studio

# Create migration
cd packages/database
npm run migrate:dev

# Reset database
npm run db:reset
```

## 📊 Database Schema

- **nodes** - węzły Meshtastic
- **packets** - wszystkie pakiety
- **traceroutes** - śledzenie tras pakietów
- **players** - gracze i ich statystyki
- **scores** - historia punktów
- **h3_grid** - agregacja danych w siatce H3

## 🗺️ H3 Grid

Projekt wykorzystuje H3 (Uber's Hexagonal Hierarchical Spatial Index) z rozdzielczością 8:
- Rozmiar heksagonu: ~0.46 km²
- Idealny do wizualizacji aktywności w terenie

## 📝 License

MIT

## 🤝 Contributing

Pull requests are welcome!
