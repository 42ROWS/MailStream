# Gmail Tool v0.5 - Client-Side Email Manager 🚀

Una applicazione javascript **100% client-side** per l'invio batch di email e il download massivo da Gmail.

![Version](https://img.shields.io/badge/version-0.5-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)

## ✨ Caratteristiche Principali

### 📤 Invio Batch Email
- Caricamento file CSV con email pronte all'invio
- CSV deve contenere: `destinatario`, `oggetto`, `contenuto`
- Rate limiting intelligente (35-75 secondi tra email)
- Pausa/Riprendi durante l'invio
- Tracking real-time del progresso
- Gestione automatica quota Gmail (500/2000 email al giorno)
- Export risultati in CSV

### 📥 Download Email
- Filtri avanzati di ricerca (data, mittente, oggetto, etichette, allegati)
- Download email con allegati in formato ZIP
- Export metadati in CSV
- Supporto fino a 10,000 email
- Progress tracking con pausa/riprendi
- Report HTML con statistiche

### 🔒 Sicurezza & Privacy
- **ZERO costi di audit OAuth** ($15,000-$75,000/anno risparmiati!)
- Nessun server richiesto - tutto nel browser
- Token OAuth temporanei (1 ora con auto-refresh)
- Dati rimangono sempre nel tuo browser
- Codice open source verificabile

## 🚀 Quick Start

### 1. Configurazione Google Cloud Console

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita **Gmail API**:
   - Menu → APIs & Services → Library
   - Cerca "Gmail API"
   - Click "Enable"

4. Crea credenziali OAuth 2.0:
   - Menu → APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Gmail Tool v0.5"
   - Authorized JavaScript origins:
     - `http://localhost:8000` (per development)
     - `https://tuodominio.com` (per produzione)
   - Click "Create"
   - Copia il **Client ID**

### 2. Configurazione Applicazione

#### Metodo 1: File config.json (Consigliato)
1. Copia `config.json.example` in `config.json`
2. Modifica il file con il tuo Client ID:
```json
{
  "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "debug": false
}
```

#### Metodo 2: LocalStorage (Per test rapidi)
Apri la console del browser e esegui:
```javascript
localStorage.setItem('gmail_tool_client_id', 'YOUR_CLIENT_ID.apps.googleusercontent.com');
```

#### Metodo 3: Variabile globale
Aggiungi in `index.html` prima degli script:
```html
<script>
  window.GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
</script>
```

### 3. Avvio Locale

#### Opzione A: Python (Consigliato)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Opzione B: Node.js
```bash
# Installa http-server globalmente
npm install -g http-server

# Avvia il server
http-server -p 8000
```

#### Opzione C: VS Code Live Server
- Installa l'estensione "Live Server"
- Click destro su `index.html` → "Open with Live Server"

4. Apri il browser: `http://localhost:8000`

## 📖 Guida Utilizzo

### Invio Batch Email

1. **Prepara il file CSV**:
   Il CSV deve contenere esattamente queste 3 colonne:
   - `destinatario` - Email del destinatario
   - `oggetto` - Oggetto dell'email
   - `contenuto` - Corpo dell'email (testo o HTML)
   
   Esempio CSV:
   ```csv
   destinatario,oggetto,contenuto
   mario.rossi@example.com,Importante: Aggiornamento Account,Gentile Mario...
   lucia.bianchi@example.com,Newsletter Mensile,Ecco le novità...
   ```

2. **Carica il CSV**:
   - Click su "Carica File CSV" o trascina il file
   - Il sistema verifica automaticamente le colonne richieste

3. **Verifica Anteprima**:
   - Controlla l'anteprima delle email
   - Verifica destinatari e contenuti

4. **Configura Opzioni**:
   - ✅ Ritardo tra email: Sempre consigliato (35-75 secondi)
   - ⚠️ Batch API: Più veloce ma meno controllo

5. **Inizia l'Invio**:
   - Click su "Inizia Invio"
   - Monitora il progresso in tempo reale
   - Puoi mettere in pausa/riprendere in qualsiasi momento

### Download Email

1. **Imposta i Filtri**:
   - Data: Seleziona range temporale
   - Mittente/Destinatario: Filtra per email specifiche
   - Oggetto: Cerca parole chiave
   - Opzioni: Solo con allegati, non lette, etc.

2. **Cerca Email**:
   - Click su "Cerca Email"
   - Rivedi i risultati nella tabella
   - Max 100 email per pagina (con paginazione)

3. **Seleziona Email**:
   - Seleziona singole email o "Seleziona Tutto"
   - Verifica la stima delle dimensioni

4. **Configura Download**:
   - Formato: ZIP (completo) o CSV (solo metadati)
   - Contenuto: Allegati, corpo email, headers

5. **Scarica**:
   - Click su "Inizia Download"
   - Monitora il progresso
   - Al termine, salva il file ZIP/CSV

## 🛠️ Configurazione Avanzata

### Limiti e Quote

I limiti sono configurati in `js/config.js`:

```javascript
RATE_LIMITS: {
    MIN_DELAY_MS: 35000,        // Delay minimo tra email (35 secondi)
    MAX_DELAY_MS: 75000,        // Delay massimo tra email (75 secondi)
    QUOTA_PER_DAY: 500,         // Gmail free
    QUOTA_PER_DAY_WORKSPACE: 2000, // Google Workspace
}
```

### Debug Mode

Per abilitare il debug, modifica `config.json`:

```json
{
  "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "debug": true,
  "logLevel": "debug"
}
```

## 📊 Limiti Tecnici

| Funzionalità | Limite | Note |
|--------------|--------|------|
| Email per giorno | 500 (free) / 2000 (workspace) | Limite Gmail |
| Email per batch | 100 | API Gmail |
| Dimensione allegati | 25 MB | Per singolo allegato |
| Email scaricabili | 10,000 | Limite browser memory |
| Dimensione ZIP | ~500 MB | Dipende dal browser |
| Token validità | 1 ora | Auto-refresh |

## 🔧 Troubleshooting

### "Tailwind CSS should not be used in production"
- **Questo è normale** - È solo un avviso per development
- L'app funziona perfettamente
- Il CDN Tailwind è usato solo per demo/prototipazione

### "Popup bloccato"
- Consenti popup per localhost:8000
- Chrome: Settings → Privacy → Site Settings → Popups

### "Quota exceeded"
- Limite giornaliero raggiunto (500 email per account free)
- Attendi 24 ore o usa account Workspace (2000 email/giorno)

### "Token expired"
- Normale dopo 1 ora di inattività
- Click su "Accedi" per rinnovare automaticamente

### "Failed to fetch"
- Verifica connessione internet
- Controlla che Gmail API sia abilitata
- Verifica Client ID configurato correttamente

### "CSV non valido"
- Il CSV deve avere esattamente 3 colonne: `destinatario`, `oggetto`, `contenuto`
- Verifica encoding UTF-8
- Controlla che non ci siano virgole nei contenuti (usa virgolette se necessario)

## 🤝 Contribuire

Contribuzioni sono benvenute! 

1. Fork il repository
2. Crea un branch (`git checkout -b feature/AmazingFeature`)
3. Commit modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 🙏 Crediti

### Librerie Utilizzate
- [Google Identity Services](https://developers.google.com/identity) - Autenticazione OAuth
- [Gmail API](https://developers.google.com/gmail/api) - Accesso Gmail
- [PapaParse](https://www.papaparse.com/) - Parsing CSV
- [zip.js](https://gildas-lormeau.github.io/zip.js/) - Creazione ZIP
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - Download files
- [Tailwind CSS](https://tailwindcss.com/) - Styling (via CDN)

## 📞 Supporto

Made with ☕ and 💻 by me. Feel free to contact us [https://42rows.com](https://42rows.com)

---

**⚠️ Disclaimer**: Questa applicazione NON è affiliata con Google. Usa le API ufficiali di Gmail nel rispetto dei termini di servizio. L'utente è responsabile del rispetto dei limiti di invio e delle policy anti-spam.

---

© 2024 42ROWS Srl - P.IVA: 18017981004
