# Asystent AI – aplikacja na telewizory LG (webOS)

Aplikacja webOS TV: czat z asystentem AI sterowany pilotem. Działa też w przeglądarce telefonu (zob. [Na telefonie](#na-telefonie)). Odpowiedzi generuje serwer Genkit z katalogu [`../my-genkit-app`](../my-genkit-app) (model Gemini).

## Funkcje

- Czat z AI na ekranie 1920×1080, duże czcionki czytelne z kanapy.
- **Szybkie pytania**: kafelki, które wysyłają pytanie jednym kliknięciem OK, bez pisania.
- Własne pytania: pole tekstowe otwiera klawiaturę ekranową webOS.
- Pełna obsługa pilota: strzałki, OK, **Wstecz**, przyciski kolorowe (🔴 czyści rozmowę, 🟢 otwiera ustawienia), a także wskaźnik Magic Remote.
- Ustawienia z adresem serwera i przyciskiem „Testuj połączenie” (adres zapisywany na TV).
- Działa na webOS 4.0 i nowszych (kod w ES5 i proste CSS, bo starsze TV mają stary silnik Chromium).

## Struktura

```
webos-app/
├── app/                 ← to trafia do pakietu .ipk
│   ├── appinfo.json     ← id, wersja, ikony
│   ├── index.html
│   ├── css/app.css
│   ├── js/config.js     ← domyślny adres serwera
│   ├── js/navigation.js ← nawigacja strzałkami pilota
│   ├── js/api.js        ← komunikacja z serwerem (XHR)
│   ├── js/app.js        ← logika aplikacji
│   ├── icon.png         ← 80×80
│   └── largeIcon.png    ← 130×130
├── scripts/make-icons.py
└── package.json         ← skróty do webOS CLI
```

## 1. Uruchom serwer

Telewizor łączy się z serwerem Genkit w Twojej sieci (albo w internecie):

```bash
cd my-genkit-app
npm install
GOOGLE_API_KEY=twoj_klucz PORT=3000 npm run dev
```

Sprawdź w przeglądarce: `http://ADRES_KOMPUTERA:3000/api/status`.

Serwer udostępnia teraz:

| Metoda | Ścieżka       | Opis                                                        |
| ------ | ------------- | ----------------------------------------------------------- |
| GET    | `/api/status` | `{ ok, hasGoogleApiKey, model }`                            |
| POST   | `/api/chat`   | body `{ messages: [{ role: "user" \| "model", text }] }` → `{ reply, model }` |

## 2. Zainstaluj na telewizorze

1. Na TV zainstaluj aplikację **Developer Mode** ze sklepu LG Content Store, zaloguj się kontem [LG Developer](https://webostv.developer.lge.com/) i włącz **Dev Mode Status** oraz **Key Server**.
2. Na komputerze:
   ```bash
   cd webos-app
   npm install
   npx ares-setup-device            # dodaj TV pod nazwą "tv" (IP z aplikacji Developer Mode, port 9922, user prisoner)
   npx ares-novacom --device tv --getkey   # wpisz passphrase z ekranu TV
   ```
3. (Opcjonalnie) wpisz adres serwera w `app/js/config.js`, żeby nie wpisywać go pilotem.
4. Zbuduj, zainstaluj i uruchom:
   ```bash
   npm run deploy      # = package + install-tv + launch
   ```

Pozostałe komendy:

| Komenda              | Co robi                                         |
| -------------------- | ----------------------------------------------- |
| `npm run lint`       | sprawdza poprawność aplikacji (`ares-package --check`) |
| `npm run package`    | buduje `dist/com.msulikowski.aiassistant_1.0.0_all.ipk` |
| `npm run install-tv` | instaluje pakiet na TV                          |
| `npm run launch`     | uruchamia aplikację na TV                       |
| `npm run inspect`    | otwiera Web Inspector (debugowanie na TV)       |
| `npm run preview`    | podgląd w przeglądarce na komputerze            |

> Sesja Developer Mode na TV wygasa po ~50 godzinach. Przedłużysz ją przyciskiem **Extend** w aplikacji Developer Mode.

## Na telefonie

Serwer Genkit udostępnia tę samą aplikację pod adresem **`/tv/`**, z układem dopasowanym do telefonu:

1. Uruchom serwer (punkt 1 powyżej) na komputerze albo w chmurze.
2. Na telefonie otwórz w przeglądarce `http://ADRES_KOMPUTERA:3000/tv/`. Telefon musi być w tej samej sieci Wi-Fi. Jeśli serwer jest w internecie (np. po `specific deploy` albo na Replit), użyj jego publicznego adresu z dopiskiem `/tv/`.
3. Gotowe. Adres serwera ustawia się sam, nic nie trzeba konfigurować.

Wskazówka: w menu przeglądarki wybierz „Dodaj do ekranu głównego”, a aplikacja będzie miała własną ikonę.

Jeśli folder aplikacji leży gdzie indziej niż `../webos-app/app`, wskaż go serwerowi zmienną `TV_APP_DIR`.

## Podgląd bez telewizora

Otwórz `app/index.html` w przeglądarce (najlepiej w oknie 1920×1080). Strzałki, Enter i Esc (jako „Wstecz”) działają jak pilot.

## Dostosowanie

- **Szybkie pytania**: tablica `SUGGESTIONS` w `app/js/app.js`.
- **Styl odpowiedzi AI**: `TV_SYSTEM_PROMPT` w `my-genkit-app/src/index.ts`.
- **Ikony**: `python3 scripts/make-icons.py` (wymaga Pillow) albo podmień pliki PNG.
- **ID / wersja**: `app/appinfo.json` (przy zmianie zaktualizuj też nazwy w `package.json`).
