# 📸 Mikeys Fotobox

Eine selbstgebaute Fotobox für Partys, Hochzeiten & Co. – komplett im Browser.
Ein Laptop (oder Raspberry Pi) mit Webcam und Bildschirm genügt: Gäste drücken
den großen roten Knopf, lächeln in den Countdown und können ihr Foto sofort per
QR-Code aufs Handy holen.

## Features

- **Fotobox-Ansicht** – Live-Webcam-Bild, großer Auslöser, 3-2-1-Countdown im Vollbild und eine Vorschau des Fotos
- **Fotos lokal speichern** – alle Bilder landen als Datei auf der Fotobox (Standard: `public/images/`), kein Cloud-Dienst nötig
- **QR-Codes**
  - nach jedem Foto erscheint ein QR-Code, der genau dieses Foto auf dem Handy öffnet
  - in der Fußleiste führt ein QR-Code zur Galerie mit allen Fotos
- **Galerie** (`/gallery`) – für Handy und Desktop optimiert, mit Großansicht, Wischen/Pfeiltasten und Download einzelner Fotos; aktualisiert sich automatisch
- **ZIP-Download** (`/download.zip`) – alle Fotos auf einmal herunterladen
- **Slideshow** (`/slideshow`) – Vollbild-Diashow für einen zweiten Bildschirm oder Beamer; neue Fotos werden sofort eingeblendet
- **Fotostream** – auf der Fotobox selbst laufen die bisherigen Fotos als Endlos-Band durchs Bild
- **Kamerawahl** – bei mehreren Webcams lässt sich die gewünschte auswählen
- **Mailingliste** – Gäste können ihre E-Mail-Adresse hinterlassen, um benachrichtigt zu werden, wenn die Fotos öffentlich sind

## Schnellstart

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 18 und eine Webcam.

```bash
git clone https://github.com/Hydrair/Fotobox.git
cd Fotobox
pnpm install     # oder: npm install
pnpm start       # oder: npm start
```

Beim Start zeigt der Server alle wichtigen Adressen an:

```
Fotobox:   http://localhost:3000
Galerie:   http://192.168.178.53:3000/gallery
Slideshow: http://192.168.178.53:3000/slideshow
Fotos werden gespeichert in: /home/mikey/Fotobox/public/images
```

1. Öffne **http://localhost:3000** im Browser auf dem Fotobox-Rechner und erlaube den Kamerazugriff.
2. Drücke <kbd>F11</kbd> für den Vollbildmodus.
3. Fertig – Gäste können loslegen. 🎉

> **Wichtig:** Browser erlauben den Kamerazugriff nur über `localhost` oder HTTPS.
> Die Fotobox-Ansicht muss daher auf dem Rechner selbst über `localhost` geöffnet
> werden. Galerie und Slideshow funktionieren von jedem Gerät im Netzwerk.

## Gäste-Zugriff per Handy

Damit die QR-Codes funktionieren, müssen die Handys der Gäste die Fotobox im
Netzwerk erreichen können, z. B. weil alle im selben WLAN sind oder die Fotobox
einen eigenen Hotspot aufmacht.

Die Adresse in den QR-Codes wird automatisch aus der IP-Adresse des Rechners
ermittelt, typische WLAN-Adressen (`192.168.x.x`) werden dabei bevorzugt. Ist die
falsche Adresse eingetragen (z. B. bei mehreren Netzwerkkarten, VPN oder einem
Reverse-Proxy), lässt sie sich über `PUBLIC_URL` festlegen:

```bash
PUBLIC_URL=http://fotobox.local:3000 pnpm start
```

Unter Windows (PowerShell): `$env:PUBLIC_URL="http://192.168.0.10:3000"; pnpm start`

## Konfiguration

Alle Einstellungen erfolgen über Umgebungsvariablen:

| Variable      | Standard          | Beschreibung                                                    |
| ------------- | ----------------- | --------------------------------------------------------------- |
| `PORT`        | `3000`            | Port des Webservers                                             |
| `IMAGES_DIR`  | `public/images`   | Ordner, in dem die Fotos gespeichert werden (wird automatisch angelegt) |
| `PUBLIC_URL`  | automatisch       | Adresse, unter der Gäste die Fotobox erreichen (für QR-Codes)   |
| `MAILS_FILE`  | `mails.txt`       | Datei, in der die E-Mail-Adressen der Mailingliste landen       |

Die Slideshow lässt sich über URL-Parameter anpassen:

| Parameter     | Standard | Beschreibung                                  |
| ------------- | -------- | --------------------------------------------- |
| `interval`    | `6`      | Anzeigedauer pro Foto in Sekunden             |
| `qr`          | `1`      | `0` blendet den QR-Code zur Galerie aus       |

Beispiel: `http://localhost:3000/slideshow?interval=10&qr=0`. Ein Klick auf die
Slideshow schaltet in den Vollbildmodus.

## Seiten & Schnittstellen

| Route                          | Beschreibung                                         |
| ------------------------------ | ---------------------------------------------------- |
| `GET /`                        | Fotobox-Ansicht mit Webcam und Auslöser              |
| `GET /gallery`                 | Galerie; `/gallery#<dateiname>` öffnet direkt ein Foto |
| `GET /slideshow`               | Vollbild-Slideshow                                   |
| `GET /download.zip`            | Alle Fotos als ZIP-Archiv                            |
| `GET /images/<dateiname>`      | Einzelnes Foto; mit `?download` als Datei-Download   |
| `GET /api/images`              | Liste aller Fotos (JSON, neueste zuerst)             |
| `GET /api/config`              | Öffentliche Adresse und Galerie-URL (JSON)           |
| `GET /qr.svg?path=<pfad>`      | QR-Code (SVG) für einen Pfad auf der Fotobox         |
| `POST /upload`                 | Foto als Base64-Data-URL (`{ "image": "data:image/jpeg;base64,..." }`) speichern |
| `POST /submit-email`           | E-Mail-Adresse zur Mailingliste hinzufügen           |

## Projektstruktur

```
├── server.js         # Express-Server: Speichern, Galerie-API, ZIP, QR-Codes
├── index.html        # Fotobox-Ansicht
├── gallery.html      # Galerie
├── slideshow.html    # Slideshow
├── js/               # Frontend-Skripte (index.js, gallery.js, slideshow.js)
├── css/              # Stylesheets
└── public/           # Hintergrundbilder und (standardmäßig) die Fotos in images/
```

## Tipps für den Einsatz

- **Fotos sichern:** Nach der Feier einfach `/download.zip` aufrufen oder den Ordner `public/images` kopieren.
- **Zweiter Bildschirm:** Die Slideshow auf einem Fernseher oder Beamer zeigen und so alle an den Fotos teilhaben lassen.
- **Datenschutz:** Jede Person im selben Netzwerk kann Galerie und Fotos abrufen. Die Fotobox daher nur in vertrauenswürdigen Netzwerken (z. B. eigenem Hotspot) betreiben. Die gesammelten E-Mail-Adressen in `mails.txt` werden nicht ins Git-Repository übernommen.

## Lizenz

ISC
