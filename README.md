# Sposta l'auto v2
PWA React/Vite con GPS, AMIU Genova e Web Push.

## Deploy pulito
1. Crea un repository GitHub nuovo `sposta-auto-v2` e carica il contenuto di questa cartella (non la cartella contenitore).
2. Collega il repository a Netlify. `netlify.toml` imposta build `npm run build`, publish `dist`, functions `netlify/functions`.
3. Prima di testare le notifiche, genera una coppia VAPID NUOVA e aggiungi su Netlify: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
4. `VAPID_SUBJECT` può essere `mailto:tuo-indirizzo-email` oppure una URL HTTPS di contatto controllata da te. Non committare mai la chiave privata.
5. Deploy, installa la PWA da Safari con "Aggiungi a schermata Home", aprila dalla Home, premi "Attiva notifiche", poi "Invia notifica di prova".

## Generare VAPID
Con Node/npm sul PC: `npx web-push generate-vapid-keys`.

## Note
- Il job push gira ogni 5 minuti: il promemoria può arrivare qualche minuto dopo le 20:00.
- I dati del parcheggio restano nel localStorage della PWA; la subscription e i promemoria push sono salvati in Netlify Blobs.
- Controlla sempre la segnaletica stradale.
