import { Link } from "react-router-dom";
import { mailLink } from "./shared";

/**
 * The German legal texts. Same shape as en.jsx, checked by
 * `npm run legal:check` - see scripts/legal-parity.mjs.
 *
 * ⚠️ Binding text, not UI copy. Both language versions carry equal weight.
 * Change German first, then English, in the same commit, and update
 * LEGAL_UPDATED in ./shared.jsx.
 *
 * All four pages are Julia's own translations (2026-09-17 / 2026-09-18).
 * ⚠️ They must not reach users before she has signed the pages off.
 */

const contactLink = (
  <Link to="/contact" className="link link-primary">
    Kontaktseite
  </Link>
);

const privacyLink = (
  <Link to="/privacy" className="link link-primary">
    Datenschutzerklärung
  </Link>
);

const content = {
  about: {
    title: "Über Lomir",
    intro:
      "Lomir ist eine kostenlose Team-Matching-App für Menschen, die Mitstreiter finden, Teams bilden und Nachrichten rund um gemeinsame Interessen, Schwerpunkte, Badges, Rollen und Standortpräferenzen austauschen möchten.",
    sections: [
      {
        title: "Projektstatus",
        paragraphs: [
          "Lomir wird aktuell als nicht-kommerzielles Portfolio- und Lernprojekt betrieben. Die App ist mit Datenschutz als Standard konzipiert: Neue Profile bleiben privat, bis Nutzer sie aktiv öffentlich machen.",
          "Die App kann sich im im Verlauf des Projekts weiterentwickeln. Falls sich wesentliche Funktionen ändern, sollten die rechtlichen und Datenschutzinformationen vor der öffentlichen Veröffentlichung überprüft und aktualisiert werden.",
        ],
      },
      {
        title: "Kontakt",
        paragraphs: [
          <>Fragen zu Lomir kannst du über die {contactLink} oder per E-Mail an {mailLink} senden.</>,
        ],
      },
    ],
  },
  privacy: {
    title: "Datenschutzerklärung",
    intro:
      "Diese Datenschutzerklärung erklärt, wie Lomir personenbezogene Daten verarbeitet. Sie ist für eine App mit Sitz in Deutschland verfasst und an der DSGVO, dem Bundesdatenschutzgesetz und den deutschen Regelungen zu technisch notwendiger Browser-Speicherung nach dem TDDDG ausgerichtet.",
    sections: [
      {
        title: "1. Verantwortliche Stelle",
        paragraphs: [
          "Verantwortliche für die Datenverarbeitung bei Lomir ist:",
          <>
            Julia Baur
            <br />
            Walpodenstraße 16
            <br />
            55116 Mainz
            <br />
            Deutschland
            <br />
            E-Mail: {mailLink}
          </>,
          "Ein Datenschutzbeauftragter wurde nicht bestellt, da dies für das Projekt derzeit rechtlich nicht erforderlich ist.",
        ],
      },
      {
        title: "2. Was ist Lomir?",
        paragraphs: [
          "Lomir hilft Nutzern, Menschen, Teams und offene Rollen basierend auf Profilinformationen, Schwerpunkten, Badges, Standortpräferenzen und Teammitgliedschaften zu finden. Die App bietet zudem Direkt- und Team-Chats, Dateifreigabe, Benachrichtigungen, Kontaktformulare und Account-Verwaltung.",
          "Profile sind standardmäßig privat. Öffentliche Profilinformationen werden nur in öffentlichen Suchergebnissen und Profilansichten angezeigt, wenn ein Nutzer seinen Profilstatus aktiv auf öffentlich ändert.",
        ],
      },
      {
        title: "3. Mindestalter",
        paragraphs: [
          "Lomir ist nicht für Nutzer unter 16 Jahren bestimmt. Bei der Registrierung musst du separat bestätigen, dass du mindestens 16 Jahre alt bist.",
          <>Lomir sammelt wissentlich keine personenbezogenen Daten von Nutzern unter 16 Jahren. Falls du glaubst, dass eine Person unter 16 Jahren einen Account erstellt hat, kontaktiere uns bitte unter {mailLink}, damit wir den Account prüfen und ggf. löschen können.</>,
        ],
      },
      {
        title: "4. Von uns verarbeitete Daten",
        items: [
          "Account-Daten: Benutzername, E-Mail-Adresse, Passwort-Hash, E-Mail-Bestätigungsstatus, Zeitstempel und Account-Einstellungen.",
          "Rechtliche Bestätigungsdaten: Zeitstempel und Dokumentenversionen für akzeptierte Nutzungsbedingungen, bestätigte Datenschutzerklärung und die separate Bestätigung, dass du mindestens 16 Jahre alt bist.",
          "Profildaten: Optionaler Vor- und Nachname, Bio, Avatar, Schwerpunkte, Badges, optionale Standortangaben wie Postleitzahl, Stadt, Bezirk, Bundesland und Land sowie der öffentliche/private Sichtbarkeitsstatus.",
          "Team- und Rollendaten: Teamnamen, Beschreibungen, Avatare, Mitglieder, Rollen, Bewerbungen, Einladungen und Team-Standortpräferenzen.",
          "Nachrichten und Benachrichtigungen: Direktnachrichten, Teamnachrichten, Erwähnungen, Tipp-/Lesebestätigungen, Systemnachrichten, Benachrichtigungsprotokolle und Nachrichten-Metadaten.",
          "Uploads: Profil-Avatare, Team-Avatare, Chat-Bilder, Chat-Dateien und Anhangsdateien aus dem Kontaktformular.",
          "Standortdaten: Postleitzahl, Stadt, Bezirk, Bundesland, Land und Koordinaten, die aus den von dir angegebenen Standortdaten abgeleitet werden. Lomir fragt keine Straßenadresse ab. Postleitzahl und andere Standortdetails werden als ungefähre Standortinformationen für Suche, entfernungsbasiertes Matching, Empfehlungen und die Anzeige von Profil-/Team-/Rollen-Standorten verwendet. Je nach Sichtbarkeitseinstellungen und Kontext können Postleitzahl, Stadt, Bezirk, Bundesland oder Land für andere Nutzer sichtbar sein. Öffentliche Suchergebnisse und Kartenansichten zeigen gerundete ungefähre Koordinaten, nicht die exakt gespeicherten Koordinaten.",
          "Kontakt- und Meldedaten: Name, E-Mail-Adresse, Betreff, Nachricht, optionale Anhangsdateien aus dem Kontaktformular, Vorgangs-IDs für Meldungen, Meldestatus, E-Mail-Weiterleitungsstatus und Anhangs-Metadaten für Missbrauchs- oder illegalen Inhaltsmeldungen.",
          "Sicherheits- und technische Daten: IP-bezogene Anfragedaten, die von Hosting-Anbietern verarbeitet werden, Browser- und Geräte-Metadaten in Server-Logs, Rate-Limit-Daten, CAPTCHA-Überprüfungsdaten (falls aktiviert), Sitzungs- und Authentifizierungsdaten sowie Browser-Speicherung, die für den Betrieb der App erforderlich ist.",
        ],
      },
      {
        title: "5. Quellen der Daten",
        paragraphs: [
          "Die meisten personenbezogenen Daten, die Lomir verarbeitet, werden direkt von dir bereitgestellt, z. B. während der Registrierung, Profilbearbeitung, Teamerstellung, Nachrichtenversand, Bewerbungen, Einladungen, Uploads oder Kontaktanfragen.",
          "Einige Daten können von der App generiert oder von anderen Nutzern im Rahmen der Zusammenarbeit bereitgestellt werden, z. B. Teammitgliedschaftsaufzeichnungen, Einladungen, Bewerbungen, Badge-Verleihungen, Nachrichten, Erwähnungen, Benachrichtigungen, Eigentumsübertragungen und Systemnachrichten.",
          "Standortdetails können aus Postleitzahl, Stadt, Bezirk, Bundesland oder Land, die du angibst, unter Verwendung von OpenStreetMap/Nominatim abgeleitet werden.",
        ],
      },
      {
        title: "6. Zwecke und Rechtsgrundlagen",
        items: [
          "Account-Erstellung, Anmeldung, Profilverwaltung, optionales standortbasiertes Matching, Team-Matching, Chat, Benachrichtigungen und App-Betrieb: Art. 6 Abs. 1 lit. b DSGVO.",
          "Rechtliche Bestätigungen, Altersbestätigung und Dokumentation akzeptierter rechtlicher Dokumente: Art. 6 Abs. 1 lit. c und Art. 6 Abs. 1 lit. f DSGVO.",
          "Öffentliche Profilsichtbarkeit und optionale Profilinhalte, die Nutzer veröffentlichen (einschließlich optionaler ungefähre Standortdetails): Art. 6 Abs. 1 lit. a DSGVO und, wo relevant, Art. 6 Abs. 1 lit. b DSGVO.",
          "Sicherheit, Missbrauchsprävention, Rate-Limiting, CAPTCHA-Prüfungen, Betrugsprävention, Debugging und Zuverlässigkeit des Dienstes: Art. 6 Abs. 1 lit. f DSGVO.",
          "Kontaktanfragen und Support-Kommunikation: Art. 6 Abs. 1 lit. b DSGVO, wo die Anfrage einen Account oder potenziellen Account betrifft, sonst Art. 6 Abs. 1 lit. f DSGVO.",
          "Rechtliche Compliance und Beweissicherung, falls erforderlich: Art. 6 Abs. 1 lit. c und Art. 6 Abs. 1 lit. f DSGVO.",
        ],
      },
      {
        title: "7. Berechtigte Interessen",
        blocks: [
          {
            paragraph:
              "Wo Lomir sich auf Art. 6 Abs. 1 lit. f DSGVO stützt, liegen die berechtigten Interessen in:",
          },
          {
            list: [
              "dem Betrieb einer sicheren und zuverlässigen App,",
              "der Verhinderung von Missbrauch und Spam,",
              "dem Schutz von Nutzern und dem Dienst,",
              "dem Debugging von Fehlern,",
              "der Durchsetzung der Regeln,",
              "der Beweissicherung, falls erforderlich,",
              "der Beantwortung von Support-Anfragen,",
              "der Verteidigung oder Geltendmachung von Rechtsansprüchen.",
            ],
          },
        ],
      },
      {
        title: "8. Erforderliche und optionale Daten",
        paragraphs: [
          "Es besteht keine gesetzliche Verpflichtung, einen Lomir-Account zu erstellen. Account-Daten, rechtliche Bestätigungen, Altersbestätigung und sicherheitsrelevante Daten sind jedoch notwendig, um einen Account zu erstellen und zu verwalten sowie den Nutzungsvertrag abzuschließen oder zu erfüllen. Ohne diese Daten kann Lomir keinen Account bereitstellen.",
          "Profildetails, Avatare, Schwerpunkte, Teams, Rollen, Bewerbungen, Nachrichten, Uploads und Standortdetails werden in der Regel freiwillig bereitgestellt. Einige davon sind jedoch für die jeweilige Funktion erforderlich. Falls optionale Daten nicht bereitgestellt werden, kann die entsprechende Funktion nicht verfügbar oder weniger nützlich sein.",
          "Standortfelder wie Postleitzahl, Stadt und Land sind optional. Du kannst sie leer lassen oder später in deinen Profileinstellungen entfernen. Ohne Standortdaten können Suche in der Nähe, entfernungsbasiertes Matching und standortbasierte Empfehlungen weniger präzise oder nicht verfügbar sein.",
        ],
      },
      {
        title: "9. Öffentliche Sichtbarkeit",
        paragraphs: [
          "Lomir ist so konzipiert, dass Nutzer keine Profildetails versehentlich veröffentlichen. Neue Accounts bleiben nach der E-Mail-Bestätigung privat, es sei denn, du änderst die Einstellung.",
          "Wenn dein Profil öffentlich ist, können andere Nutzer Profildetails wie Benutzername, Name, Bio, Avatar, Schwerpunkte, Badges und ungefähre Standortdetails sehen, die du hinzugefügt hast. Ungefähre Standortdetails können Postleitzahl, Stadt, Bezirk, Bundesland oder Land umfassen.",
          "Wenn dein Profil privat ist, wird es nicht in öffentlichen Suchergebnissen oder Profilansichten angezeigt. Teammitglieder und Gesprächsteilnehmer können jedoch weiterhin Informationen sehen, die für die Teamzusammenarbeit, Nachrichten, Bewerbungen, Einladungen, Badge-Kontext und sicherheitsrelevante Systemnachrichten erforderlich sind.",
          "Du kannst die Sichtbarkeit deines Profils in den Einstellungen ändern. Wenn du dein Profil auf privat setzt, betrifft dies nur die zukünftige öffentliche Sichtbarkeit. Bereits von anderen Nutzern gesehene Informationen oder in Team-/Chat-Kontexten enthaltene Daten werden dadurch nicht entfernt.",
        ],
      },
      {
        title: "10. Empfänger und Weitergabe von Daten",
        items: [
          "Andere Lomir-Nutzer können personenbezogene Daten erhalten, wenn die App-Funktion dies erfordert, z. B. öffentliche Profilansichten, Suchergebnisse, Teamseiten, Bewerbungen, Einladungen, Nachrichten, Badge-Kontext und Benachrichtigungen.",
          "Teammitglieder, Team-Eigentümer, Eingeladene, Bewerber und Gesprächsteilnehmer können Informationen erhalten, die für den jeweiligen Zusammenarbeitskontext erforderlich sind.",
          "Die Betreiber des Lomir-Projekts können auf personenbezogene Daten zugreifen, soweit dies für den Betrieb der App, Support, Missbrauchsuntersuchungen, Fehlerbehebung, Sicherheitswartung oder die Einhaltung rechtlicher Verpflichtungen erforderlich ist.",
          "Hosting-, Datenbank-, Upload-, E-Mail-, CAPTCHA-, Geocoding-, Karten- und Infrastruktur-Anbieter verarbeiten personenbezogene Daten, soweit dies für die Bereitstellung der App erforderlich ist. Je nach Anbieter und Kontext handeln sie entweder als Auftragsverarbeiter im Auftrag von Lomir oder als unabhängige Anbieter nach ihren eigenen Datenschutzbestimmungen.",
          "E-Mail-Anbieter können E-Mail-Adressen, Nachrichteninhalte, E-Mail-Metadaten, Bestätigungs-E-Mails, Passwort-Zurücksetzungs-E-Mails und Kontaktformular-Nachrichten (einschließlich Anhänge) verarbeiten, soweit dies für die E-Mail-Zustellung oder Support-Kommunikation erforderlich ist.",
          "Geocoding- und Kartenanbieter können Standortanfragen, Kartenanfragen, IP-Adressen, Browser- oder Gerätedaten und Anfrage-Metadaten erhalten, wenn Standortabfragen oder Kartenansichten genutzt werden.",
          "Behörden, Gerichte, Rechtsberater oder andere Dritte können Daten erhalten, soweit dies gesetzlich vorgeschrieben oder notwendig ist, um Rechte, Sicherheit, Nutzer oder den Dienst zu schützen.",
        ],
      },
      {
        title: "11. Matching, Empfehlungen und automatisierte Entscheidungen",
        paragraphs: [
          "Lomir berechnet Matching- und Überschneidungswerte aus Tags, Badges und Entfernungsinformationen, um Personen, Teams und Rollen zu sortieren oder zu empfehlen. Die Logik vergleicht gemeinsame Schwerpunkte, Badge-Kontexte, Rolleninformationen und ungefähre Entfernungen (falls verfügbar). Postleitzahl, Stadt, Bezirk, Bundesland, Land und abgeleitete Koordinaten können zur Berechnung ungefähre Entfernungen verwendet werden.",
          "Diese Werte dienen nur als Hilfsfunktionen. Lomir verwendet keine automatisierte Entscheidungsfindung, die rechtliche Wirkungen oder ähnlich bedeutende Auswirkungen im Sinne von Art. 22 DSGVO hat.",
        ],
      },
      {
        title: "12. Browser-Speicherung, Cookies und ähnliche Technologien",
        paragraphs: [
          "Lomir verwendet ein technisch notwendiges, httpOnly-Session-Cookie, um dich nach der Anmeldung angemeldet zu halten. Dieses Cookie enthält Sitzungsauthentifizierungsdaten, ist nicht durch JavaScript lesbar und wird an das Lomir-Backend gesendet, um deine Anfragen und Echtzeit-Chat-Verbindungen zu authentifizieren. Lomir verwendet zudem technisch notwendige Browser-Speicherung wie sessionStorage, z. B. für den Status von In-App-Benachrichtigungen.",
          "Dieses Cookie und die Speicherung sind unbedingt erforderlich, um Authentifizierung, API-Zugriff, Echtzeit-Chat und Benachrichtigungsfunktionen bereitzustellen, und erfordern daher keine Einwilligung nach § 25 Abs. 2 TDDDG. Lomir verwendet derzeit keine Werbe-Cookies, Marketing-Tracker oder Analysetools Dritter.",
          "Falls Cloudflare Turnstile für die Registrierung oder das Kontaktformular aktiviert ist, kann Cloudflare technische Daten verarbeiten, um zu überprüfen, dass eine Anfrage von einem Menschen stammt. Dies dient der Missbrauchsprävention.",
        ],
      },
      {
        title: "13. Dienste Dritter",
        items: [
          "Vercel hostet und liefert das Frontend und leitet API- und Echtzeit-Anfragen der App an das Backend weiter (damit Frontend und Backend eine Adresse teilen). Vercel kann daher IP-Adressen, Browser- und Gerätedaten, Anfrage- und API-Metadaten, Sitzungsauthentifizierungsdaten während der Übertragung, Bereitstellungsdaten und technische Logs verarbeiten, die für die Bereitstellung, Weiterleitung und Sicherung der App erforderlich sind.",
          "Render hostet die Backend-API. Render kann IP-Adressen, Browser- und Gerätedaten, API-Anfrage-Metadaten, Server-Logs, Fehlerinformationen und Daten verarbeiten, die an das Backend gesendet oder von diesem empfangen werden.",
          "Neon, jetzt Teil von Databricks, stellt die PostgreSQL-Datenbank bereit. In der Datenbank gespeicherte App-Daten können Account-Daten, Profildaten, Team- und Rollendaten, Nachrichten, Benachrichtigungen, Aufzeichnungen rechtlicher Bestätigungen, Standortdaten und zugehörige Metadaten umfassen.",
          "ImageKit speichert, transformiert, optimiert und liefert hochgeladene Medien und Dateien, einschließlich Profil-Avatare, Team-Avatare, Chat-Bilder, Chat-Dateien und zugehörige Liefer-Logs oder Metadaten.",
          "Brevo (betrieben von Sendinblue SAS, Frankreich) wird zum Versand von Transaktions-E-Mails der App verwendet – z. B. Account-Bestätigung, Passwort-Zurücksetzung, Benachrichtigungen über Account-Änderungen sowie Kontaktformular- und Missbrauchs- oder illegalen Inhaltsmeldungen. Brevo kann E-Mail-Adressen, E-Mail-Inhalte, E-Mail-Metadaten und Anhangsdateien aus dem Kontaktformular im Rahmen der E-Mail-Zustellung verarbeiten. Kontaktformular- und Meldenachrichten werden zusätzlich im Google/Gmail-Postfach der Lomir-Betreiber empfangen; Google kann diese E-Mail-Inhalte und Metadaten als Postfachbetreiber verarbeiten.",
          "Cloudflare Turnstile kann für CAPTCHA-Prüfungen bei der Registrierung und im Kontaktformular verwendet werden. Cloudflare kann technische Daten wie IP-Adresse, Browser- und Geräteinformationen, Challenge-Daten und Überprüfungstokens verarbeiten, um Missbrauch zu erkennen und zu bestätigen, dass eine Anfrage wahrscheinlich von einem Menschen stammt.",
          "OpenStreetMap/Nominatim wird verwendet, um von Nutzern bereitgestellte Standortinformationen wie Postleitzahl, Stadt, Bezirk, Bundesland oder Land aufzulösen. OpenStreetMap-Kartenkacheln können geladen werden, wenn die Kartenansicht geöffnet wird. OpenStreetMap-bezogene Dienste können Standortanfragen, IP-Adressen, Browser- oder Gerätedaten und Anfrage-Metadaten erhalten.",
        ],
      },
      {
        title: "14. Internationale Datenübermittlungen",
        blocks: [
          {
            paragraph:
              "Einige Anbieter haben ihren Sitz außerhalb des Europäischen Wirtschaftsraums oder können Daten in den USA, dem Vereinigten Königreich, Indien oder anderen Ländern verarbeiten, insbesondere wenn Infrastruktur, Support, Sicherheit, E-Mail-Zustellung, Inhaltsbereitstellung oder globale Netzwerkdienste international bereitgestellt werden.",
          },
          {
            paragraph:
              "Falls personenbezogene Daten in ein Land übermittelt werden, für das kein EU-Angemessenheitsbeschluss vorliegt, stützt sich Lomir auf die verfügbaren Übermittlungsmechanismen und Garantien, die der jeweilige Anbieter anbietet. Dazu können gehören:",
          },
          {
            list: [
              "EU-US Data Privacy Framework,",
              "UK-Erweiterung des EU-US Data Privacy Framework,",
              "Schweiz-US Data Privacy Framework,",
              "EU-Standardvertragsklauseln,",
              "Datenverarbeitungsvereinbarungen,",
              "ergänzende technische und organisatorische Maßnahmen.",
            ],
          },
          {
            paragraph:
              "Vercel, Render, Databricks/Neon, Cloudflare, Brevo und ImageKit veröffentlichen Informationen zur Datenverarbeitung, Übermittlungsgarantien oder Unterauftragsverarbeiter in ihren rechtlichen oder Vertrauensdokumentationen. Brevo, das den E-Mail-Versand abwickelt, hat seinen Sitz in der EU. Google/Gmail und OpenStreetMap-bezogene Dienste verarbeiten Daten nach ihren eigenen Datenschutzbestimmungen, soweit sie als unabhängige Anbieter oder Betreiber öffentlicher Infrastruktur agieren.",
          },
          {
            paragraph: (
              <>Nutzer können Lomir unter {mailLink} kontaktieren, um weitere Informationen zu den Garantien in Bezug auf einen bestimmten Anbieter anzufordern.</>
            ),
          },
        ],
      },
      {
        title: "15. Speicherdauern",
        items: [
          "Account- und Profildaten werden gespeichert, solange der Account existiert. Wenn du deinen Account löschst, werden dein Profil und Direktnachrichten, an denen du beteiligt bist, sofort nach Bestätigung gelöscht, während begrenzte Team- und Badge-Referenzen in anonymisierter Form erhalten bleiben können.",
          "Wenn ein Einzelteam gelöscht wird, werden das Team, sein Chat, Mitglieder, Einladungen, Bewerbungen, Badges, Benachrichtigungen und Team-Avatar sofort gelöscht. Wenn ein Team mit anderen verbleibenden Mitgliedern gelöscht wird, wird es zunächst archiviert, damit die verbleibenden Mitglieder die Löschbenachrichtigung sehen und den Teamverlauf einsehen können. Es wird dauerhaft gelöscht, wenn das letzte Mitglied das Team verlässt oder nach der konfigurierten Archivierungsfrist, derzeit standardmäßig 14 Tage.",
          "Aufzeichnungen rechtlicher Bestätigungen werden gespeichert, solange der Account existiert, und können ggf. behalten werden, um die Compliance zu dokumentieren oder Rechtsansprüche zu verteidigen.",
          "Nicht bestätigte Accounts werden zur Löschung vorgesehen, nachdem der Bestätigungslink abgelaufen ist, mit einer Pufferzeit von einer Stunde. Die Bereinigung erfolgt periodisch und einmalig beim Serverstart.",
          "Passwort-Zurücksetzungstokens laufen nach einer Stunde ab und werden durch die geplante Bereinigung gelöscht.",
          "Chat-Dateien und Bild-Uploads laufen nach 60 Tagen ab und werden durch die geplante Bereinigung entfernt, soweit möglich. Nachrichtenaufzeichnungen können mit gelöschten Dateireferenzen erhalten bleiben.",
          "Avatare und Team-Avatare werden gespeichert, bis sie ersetzt, entfernt oder mit dem jeweiligen Account oder Team gelöscht werden, soweit technisch möglich.",
          "Kontaktformular-Nachrichten, Missbrauchs- oder illegalen Inhaltsmeldungen, Meldestatus-Aufzeichnungen und zugehörige E-Mails werden so lange aufbewahrt, wie es erforderlich ist, um die Anfrage zu beantworten, die Meldung zu prüfen, den Bearbeitungsprozess zu dokumentieren und ggf. rechtlichen Verpflichtungen nachzukommen oder Ansprüchen zu verteidigen.",
          "Technische Logs werden nur so lange aufbewahrt, wie es für Sicherheit, Fehlerbehebung und Hosting-Betrieb erforderlich ist, abhängig von den Einstellungen des jeweiligen Anbieters.",
        ],
      },
      {
        title: "16. Account-Löschung",
        paragraphs: [
          "Du kannst deinen Account aus der App heraus löschen. Nach der Bestätigung wird dein Account und alle Direktnachrichten, an denen du beteiligt bist, sofort gelöscht. Einige Team-Kontexte können in anonymisierter Form erhalten bleiben, z. B. als „Ehemaliger Lomir-Nutzer“, damit verbleibende Teams, Badge-Verläufe, Eigentumsübertragungen und Rollenstatus verständlich bleiben.",
          "Hochgeladene Avatare werden nach erfolgreicher Account-Löschung nach bestem Bemühen aus ImageKit gelöscht.",
        ],
      },
      {
        title: "17. Deine Rechte",
        blocks: [
          {
            paragraph: (
              <>Du kannst Lomir unter {mailLink} kontaktieren, um folgende Rechte geltend zu machen:</>
            ),
          },
          {
            list: [
              "Auskunft über deine gespeicherten Daten,",
              "Berichtigung unrichtiger Daten,",
              "Löschung deiner Daten,",
              "Einschränkung der Verarbeitung,",
              "Datenübertragbarkeit,",
              "Widerspruch gegen die Verarbeitung auf Basis berechtigter Interessen,",
              "Widerruf einer erteilten Einwilligung für die Zukunft.",
            ],
          },
          {
            paragraph:
              "Ein Widerruf der Einwilligung berührt nicht die Rechtmäßigkeit der Verarbeitung, die auf der Einwilligung vor dem Widerruf beruhte. Beispiel: Du kannst ein öffentliches Profil später auf privat setzen, aber dies hebt nicht die Sichtbarkeit auf, die bereits vor der Änderung bestand.",
          },
          {
            paragraph:
              "Du hast zudem das Recht, Beschwerde bei einer Datenschutzaufsichtsbehörde einzureichen. In Rheinland-Pfalz ist dies die Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz. Du kannst dich auch an eine andere zuständige Aufsichtsbehörde wenden.",
          },
        ],
      },
      {
        title: "18. Sensible Daten",
        paragraphs: [
          "Bitte gib keine besonderen Kategorien personenbezogener Daten, vertrauliche Informationen oder Geheimnisse Dritter in dein Profil, Teams, Nachrichten, Uploads oder das Kontaktformular ein, es sei denn, dies ist absolut notwendig und du hast das Recht, diese Daten weiterzugeben.",
        ],
      },
      {
        title: "19. Aktualisierungen und weitere Verarbeitung",
        paragraphs: [
          "Diese Datenschutzerklärung kann aktualisiert werden, wenn sich Lomir, die Anbieter oder die rechtlichen Anforderungen ändern. Wesentliche Aktualisierungen sollten veröffentlicht werden, bevor sie auf neue Verarbeitungsaktivitäten angewendet werden.",
          "Falls Lomir beabsichtigt, personenbezogene Daten für einen neuen Zweck zu verarbeiten, der nicht mit dem Zweck vereinbar ist, für den die Daten erhoben wurden, werden die Nutzer vor dieser weiteren Verarbeitung informiert, sofern dies gesetzlich erforderlich ist.",
        ],
      },
    ],
  },
  terms: {
    title: "Nutzungsbedingungen",
    intro:
      "Diese Nutzungsbedingungen regeln die Nutzung von Lomir. Durch das Erstellen eines Accounts oder die Nutzung der App stimmst du diesen Bedingungen zu.",
    sections: [
      {
        title: "1. Anbieter",
        paragraphs: [
          <>Lomir wird bereitgestellt von Julia Baur, Walpodenstraße 16, 55116 Mainz, Deutschland. Kontakt: {mailLink}.</>,
        ],
      },
      {
        title: "2. Dienstleistung",
        paragraphs: [
          "Lomir ist eine kostenlose, nicht-kommerzielle App für Team-Matching und Zusammenarbeit. Nutzer können Profile erstellen, Teams und offene Rollen finden, Teams verwalten, Nachrichten austauschen, Avatare oder Chat-Dateien hochladen sowie das Lomir-Team kontaktieren.",
          "Die App wird als Portfolio- und Lernprojekt bereitgestellt. Sie kann sich ändern, unterbrochen oder eingestellt werden, insbesondere während der aktiven Entwicklung.",
        ],
      },
      {
        title: "3. Berechtigung",
        paragraphs: [
          "Du darfst einen Account erstellen und Lomir nutzen, nur wenn du mindestens 16 Jahre alt bist. Du musst korrekte Account-Daten angeben und deine Anmeldedaten sicher aufbewahren.",
        ],
      },
      {
        title: "4. Account-Regeln",
        items: [
          "Erstelle keine Accounts für andere Personen ohne deren Erlaubnis.",
          "Gib kein Passwort, Anmeldelinks, Bestätigungscodes oder andere Account-Daten weiter.",
          "Nutze Lomir nicht, um andere zu belästigen, zu täuschen, Spam zu versenden, zu bedrohen oder gegen Gesetze zu diskriminieren.",
          "Lade keine Malware, illegale Inhalte, vertrauliche Informationen Dritter oder Inhalte hoch, die Rechte an geistigem Eigentum verletzen.",
          "Versuche nicht, Sicherheitsvorkehrungen zu umgehen, private Daten abzugreifen oder ohne Autorisierung auf Accounts, Teams, Nachrichten oder API-Endpunkte zuzugreifen.",
        ],
      },
      {
        title: "5. Profile, Teams und Sichtbarkeit",
        paragraphs: [
          "Dein Profil ist standardmäßig privat. Du entscheidest, ob du es öffentlich machst. Öffentliche Profilinhalte können für andere Lomir-Nutzer sichtbar sein und in Suchergebnissen, Profilen, Karten, Listen oder Übersichten angezeigt werden.",
          "Fügst du Standortdaten hinzu, können diese für Matching und Empfehlungen genutzt werden. Je nach Sichtbarkeitseinstellungen und Kontext können ungefähre Standortangaben wie Postleitzahl, Stadt, Bezirk, Bundesland oder Land für andere Nutzer sichtbar sein.",
          "Die Sichtbarkeit von Teams und Rollen hängt von den Team-Einstellungen und dem Mitgliedschaftskontext ab. Selbst wenn dein Profil privat ist, können Informationen, die für Teams, Bewerbungen, Einladungen, Nachrichten oder Benachrichtigungen erforderlich sind, den relevanten Teilnehmern angezeigt werden.",
        ],
      },
      {
        title: "6. Nutzerinhalte",
        paragraphs: [
          "Du behältst die Rechte an den von dir in Lomir hochgeladenen Inhalten. Durch das Hochladen von Inhalten räumst du Lomir ein begrenztes, nicht-ausschließliches Recht ein, diese Inhalte zu speichern, anzuzeigen, zu übertragen und zu verarbeiten, soweit dies für den Betrieb der App erforderlich ist.",
          "Du bist für die von dir bereitgestellten Inhalte verantwortlich. Gib keine sensiblen persönlichen Daten, vertrauliche Informationen oder Daten über andere Personen ein, es sei denn, du hast eine rechtliche Grundlage und deren Erlaubnis, falls erforderlich.",
        ],
      },
      {
        title: "7. Meldung von illegalen Inhalten und Missbrauch",
        paragraphs: [
          <>Falls du der Meinung bist, dass Inhalte, ein Account, ein Team, eine Nachricht oder ein Upload auf Lomir rechtswidrig, missbräuchlich, belästigend, Spam, Malware, rechtsverletzend, die Privatsphäre verletzend oder sonst gegen diese Nutzungsbedingungen verstößt, melde dies bitte über die {contactLink} oder per E-Mail an {mailLink}.</>,
          "Meldungen sollten ausreichend Informationen enthalten, um das Problem zu lokalisieren und zu prüfen, z. B. Benutzernamen, Teamnamen, Nachrichtenkontext, Links, Screenshots, den Grund der Meldung und eine Kontakt-E-Mail. Bitte reichst du Meldungen in gutem Glauben ein.",
          "Meldungen, die über das Kontaktformular eingereicht werden, werden mit einer Vorgangs-ID aufgezeichnet, damit Lomir sie auch dann empfangen und nachverfolgen kann, wenn die E-Mail-Weiterleitung vorübergehend nicht verfügbar ist.",
          "Lomir kann gemeldete Inhalte oder Accounts prüfen und Inhalte einschränken, entfernen oder löschen; Accounts sperren oder löschen; betroffene Nutzer kontaktieren; Informationen speichern, falls erforderlich; oder Angelegenheiten an zuständige Behörden melden, falls dies gesetzlich vorgeschrieben oder notwendig ist, um Nutzer, die App oder Dritte zu schützen.",
          <>Falls dein Inhalt oder Account eingeschränkt wurde und du der Meinung bist, dass dies ein Fehler war, kannst du Lomir über die {contactLink} oder per E-Mail an {mailLink} kontaktieren.</>,
        ],
      },
      {
        title: "8. Nachrichten und Uploads",
        paragraphs: [
          "Nachrichten sind für die relevanten Direktnachrichten-Teilnehmer oder Teammitglieder sichtbar. Hochgeladene Chat-Dateien und Bilder sind für die temporäre Zusammenarbeit gedacht und laufen derzeit nach 60 Tagen ab.",
          "Anhänge aus dem Kontaktformular werden per E-Mail an das Lomir-Postfach gesendet. Sende keine sensiblen oder vertraulichen Materialien über das Kontaktformular, es sei denn, dies ist für deine Anfrage erforderlich.",
        ],
      },
      {
        title: "9. Account-Löschung",
        paragraphs: [
          "Du kannst deinen Account in der App löschen. Die Löschung des Accounts ist endgültig intendiert: Dein Profil und Direktnachrichten, an denen du beteiligt bist, werden sofort nach Bestätigung gelöscht. Einige Team- und Badge-Kontexte können in anonymisierter Form oder als Systemnachricht erhalten bleiben, damit die Teamhistorie und der Zusammenarbeitskontext anderer Nutzer verständlich bleiben.",
        ],
      },
      {
        title: "10. Verfügbarkeit und Änderungen",
        paragraphs: [
          "Lomir wird kostenlos und ohne Garantie auf unterbrechungsfreie Verfügbarkeit bereitgestellt. Funktionen können geändert, eingeschränkt oder entfernt werden. Wartungsarbeiten, Hosting-Beschränkungen, Anbieterausfälle, Sicherheitsvorfälle oder Projektänderungen können die App beeinflussen.",
        ],
      },
      {
        title: "11. Sperrung und Entfernung",
        paragraphs: [
          "Accounts oder Inhalte können eingeschränkt, entfernt oder gelöscht werden, wenn sie gegen diese Nutzungsbedingungen verstoßen, andere Nutzer schädigen, rechtliche Risiken darstellen, die Sicherheit der App gefährden oder gesetzlich entfernt werden müssen.",
        ],
      },
      {
        title: "12. Haftung",
        paragraphs: [
          "Nichts in diesen Nutzungsbedingungen schränkt die Haftung für Vorsatz, grobe Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit oder eine andere Haftung ein, die nach geltendem Recht nicht eingeschränkt werden kann.",
          "Für die kostenlose Nutzung von Lomir ist die Haftung für einfache Fahrlässigkeit auf die Verletzung wesentlicher vertraglicher Pflichten und auf typische, vorhersehbare Schäden beschränkt, sofern das zwingende Recht nichts anderes vorsieht.",
        ],
      },
      {
        title: "13. Datenschutz",
        paragraphs: [
          <>Informationen zur Verarbeitung personenbezogener Daten findest du in der {privacyLink}.</>,
        ],
      },
      {
        title: "14. Anwendbares Recht",
        paragraphs: [
          "Es gilt deutsches Recht, vorbehaltlich zwingender Verbraucherschutzvorschriften des Landes, in dem du deinen gewöhnlichen Aufenthalt hast.",
        ],
      },
      {
        title: "15. Kontakt",
        paragraphs: [
          <>Fragen zu diesen Nutzungsbedingungen kannst du über die {contactLink} oder per E-Mail an {mailLink} senden.</>,
        ],
      },
    ],
  },
  legalNotice: {
    title: "Impressum",
    intro:
      "Angaben gemäß § 18 Abs. 1 des Medienstaatsvertrags (MStV) und, soweit anwendbar, § 5 des Digitale-Dienste-Gesetzes (DDG).",
    sections: [
      {
        title: "Anbieter",
        paragraphs: [
          <>
            Julia Baur
            <br />
            Walpodenstraße 16
            <br />
            55116 Mainz
            <br />
            Deutschland
          </>,
        ],
      },
      {
        title: "Kontakt",
        paragraphs: [<>E-Mail: {mailLink}</>],
      },
      {
        title: "Journalistisch-redaktionelle Inhalte",
        paragraphs: [
          "Lomir bietet derzeit keine journalistisch-redaktionellen Inhalte im Sinne von § 18 Abs. 2 MStV an. Daher wird keine verantwortliche Person nach § 18 Abs. 2 MStV benannt. Sollten in Zukunft solche Inhalte angeboten werden, wird dieses Impressum entsprechend aktualisiert.",
        ],
      },
      {
        title: "Art des Projekts",
        paragraphs: [
          "Lomir wird derzeit als kostenloses, nicht-kommerzielles Portfolio- und Lernprojekt betrieben. Falls sich der rechtliche oder kommerzielle Status der App ändert, sollte dieses Impressum überprüft und aktualisiert werden.",
        ],
      },
      {
        title: "Verbraucherstreitbeilegung",
        paragraphs: [
          "Wir sind weder bereit noch verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
        ],
      },
      {
        title: "Haftung für Inhalte",
        paragraphs: [
          "Wir bemühen uns, unsere eigenen Inhalte korrekt und aktuell zu halten. Nutzererstellte Inhalte werden von den Nutzern selbst erstellt. Falls dir rechtswidrige Inhalte oder Rechtsverletzungen auffallen, kontaktiere uns bitte, damit wir diese prüfen können.",
        ],
      },
      {
        title: "Externe Links",
        paragraphs: [
          "Lomir kann Links zu externen Websites oder Diensten enthalten. Wir haben keine Kontrolle über deren Inhalte und übernehmen keine Verantwortung für die Inhalte Dritter. Externe Links werden bei der Hinzufügung geprüft. Falls uns rechtswidrige Inhalte bekannt werden, entfernen wir den entsprechenden Link, soweit möglich.",
        ],
      },
      {
        title: "Urheberrecht",
        paragraphs: [
          "Inhalte und Assets, die für Lomir erstellt wurden, unterliegen dem geltenden Urheberrecht. Von Nutzern eingereichte Inhalte bleiben in der Verantwortung des jeweiligen Nutzers. Jede Nutzung, die über die Grenzen des geltenden Rechts hinausgeht, erfordert die Erlaubnis des jeweiligen Rechteinhabers.",
        ],
      },
    ],
  },
};

export default content;
