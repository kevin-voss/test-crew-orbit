# SQL-Lern-App

Web-App zum Erlernen von SQL-Grundlagen für absolute Anfänger:innen — Konzept, Lektionen und Übungen mit steigender Schwierigkeit.

## Installation

```bash
npm install
```

## Lokal starten

Statische Dateien — im Projektordner einen einfachen HTTP-Server starten und die App im Browser öffnen:

```bash
npx --yes serve . -l 5173
```

Dann z. B. `http://localhost:5173` aufrufen. Ohne Server funktionieren ES-Module in vielen Browsern nicht zuverlässig.

## Tests

```bash
npm test
```

## Fortschritt speichern

- Abgeschlossene Einheiten und die zuletzt geöffnete Position werden **nur lokal** im Browser unter dem Schlüssel `sql-lern-app-progress-v1` gespeichert.
- Es ist **kein Konto** nötig; es werden keine personenbezogenen Daten übertragen.
- Beim ersten Besuch erscheint ein kurzer Hinweis auf die lokale Speicherung.
- Nach einem Neuladen der Seite wird der Lernstand wiederhergestellt und du landest bei der letzten **freigeschalteten** Einheit (nicht bei gesperrten Inhalten).
- Wenn du **Browserdaten löschst** oder den privaten Modus ohne Speicher nutzt, geht der gespeicherte Fortschritt verloren; die App funktioniert dann nur für die aktuelle Sitzung.
- Bei beschädigtem Speicher wird der Fortschritt zurückgesetzt und eine deutsche Meldung angezeigt.
