# 🎫 Discord Ticket Bot

Bot Discord avanzato per la gestione ticket con trascrizioni, valutazioni e configurazione completa.

---

## ✨ Funzionalità

- **Apertura ticket** tramite menu a tendina (Supporto / Acquisti / Partnership / Segnalazioni / Candidature / Altro)
- **Claim ticket** — lo staff può assegnarsi un ticket
- **Chiusura ticket** — invia automaticamente la transcript in DM e richiede una valutazione
- **Priorità** — `/priority low | medium | high` (solo staff)
- **Trascrizioni .txt** inviate in DM all'utente e nel canale log
- **Valutazioni** (1-5 stelle) inviate nel canale recensioni
- **Configurazione completa** tramite `/setup`

---

## 🚀 Installazione

### 1. Requisiti
- [Node.js](https://nodejs.org) **v18+**
- Un bot Discord con i seguenti **Privileged Gateway Intents** abilitati:
  - `SERVER MEMBERS INTENT`
  - `MESSAGE CONTENT INTENT`

### 2. Crea il bot su Discord
1. Vai su [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nuova applicazione
3. Vai su **Bot** → crea il bot → copia il **Token**
4. Abilita **SERVER MEMBERS INTENT** e **MESSAGE CONTENT INTENT**
5. Vai su **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Administrator` (o permessi specifici)
6. Invita il bot nel tuo server con il link generato

### 3. Configura il file .env
```bash
# Rinomina .env.example in .env
cp .env.example .env
```

Modifica `.env` con i tuoi dati:
```
BOT_TOKEN=il_tuo_token_qui
GUILD_ID=id_del_tuo_server
CLIENT_ID=id_applicazione_bot
```

**Come trovare gli ID:**
- Attiva la **Modalità Sviluppatore** in Discord (Impostazioni → Avanzate)
- Tasto destro sul server → "Copia ID Server" = GUILD_ID
- Developer Portal → la tua app → "Application ID" = CLIENT_ID

### 4. Installa le dipendenze
```bash
npm install
```

### 5. Registra i comandi slash
```bash
npm run deploy
```

### 6. Avvia il bot
```bash
npm start
```

---

## ⚙️ Configurazione tramite /setup

Una volta avviato il bot, usa `/setup` per configurare tutto:

| Comando | Descrizione |
|---|---|
| `/setup panel #canale` | Invia il pannello di apertura ticket |
| `/setup categoria #categoria` | Imposta la categoria per i canali ticket |
| `/setup log #canale` | Imposta il canale dei log |
| `/setup recensioni #canale` | Imposta il canale per le valutazioni |
| `/setup transcript #canale` | Imposta il canale per le transcript |
| `/setup staffrole @ruolo` | Imposta il ruolo Staff |
| `/setup info` | Visualizza la configurazione attuale |

> ⚠️ Il canale recensioni è già preimpostato su ID `1479192100770938962`

---

## 📋 Comandi disponibili

| Comando | Descrizione | Permesso |
|---|---|---|
| `/setup` | Configura il bot | Admin |
| `/priority` | Imposta priorità ticket (low/medium/high) | Staff |
| `/ticketinfo` | Info sul ticket corrente | Tutti |
| `/adduser @utente` | Aggiunge un utente al ticket | Staff |
| `/removeuser @utente` | Rimuove un utente dal ticket | Staff |

---

## 🗂️ Struttura file

```
discord-ticket-bot/
├── index.js              # Entry point
├── deploy-commands.js    # Registra i comandi slash
├── config.json           # Generato automaticamente
├── .env                  # Token e ID (NON condividere!)
├── commands/
│   ├── setup.js          # /setup
│   ├── priority.js       # /priority
│   ├── ticketinfo.js     # /ticketinfo
│   ├── adduser.js        # /adduser
│   └── removeuser.js     # /removeuser
├── events/
│   ├── ready.js          # Evento avvio bot
│   └── interactionCreate.js  # Gestione interazioni
└── utils/
    ├── config.js         # Lettura/scrittura configurazione
    └── transcript.js     # Generazione trascrizioni
```

---

## 🛡️ Note sulla sicurezza
- Non condividere mai il file `.env`
- Il file `config.json` viene generato automaticamente
- Aggiungi `.env` e `config.json` al `.gitignore` se usi Git

---

*Bot creato con ❤️ usando discord.js v14*
