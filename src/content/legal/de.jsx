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
 * ⚠️ DRAFT - not yet signed off by Julia and must not reach users before.
 * `about` and `terms` are Julia's own translations (2026-09-17); `privacy`
 * and `legalNotice` are still the assistant's literal draft.
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
      "Diese Datenschutzerklärung erläutert, wie Lomir personenbezogene Daten verarbeitet. Sie ist für eine App verfasst, die von Deutschland aus betrieben wird, und an der DSGVO, dem Bundesdatenschutzgesetz und den deutschen Vorschriften zu technisch notwendigen Speicherungen im Browser nach dem TDDDG ausgerichtet.",
    sections: [
      {
        title: "1. Verantwortlicher",
        paragraphs: [
          "Verantwortlicher für Lomir ist:",
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
          "Ein Datenschutzbeauftragter wurde nicht benannt, da dies für das Projekt derzeit gesetzlich nicht vorgeschrieben ist.",
        ],
      },
      {
        title: "2. Was Lomir ist",
        paragraphs: [
          "Lomir hilft Nutzern, Personen, Teams und offene Rollen anhand von Profilinformationen, Fokusbereichen, Badges, Standort-Präferenzen und Team-Mitgliedschaften zu finden. Außerdem bietet Lomir Direkt- und Team-Chats, das Teilen von Dateien, Benachrichtigungen, Kontaktformulare und eine Account-Verwaltung.",
          "Profile sind standardmäßig privat. Öffentliche Profilinformationen werden nur dann in der öffentlichen Suche und in Profilansichten angezeigt, wenn ein Nutzer seinen Profilstatus aktiv auf öffentlich ändert.",
        ],
      },
      {
        title: "3. Mindestalter",
        paragraphs: [
          "Lomir ist nicht für Nutzer unter 16 Jahren bestimmt. Bei der Registrierung müssen Nutzer gesondert bestätigen, dass sie mindestens 16 Jahre alt sind.",
          <>Lomir erhebt nicht wissentlich personenbezogene Daten von Nutzern unter 16 Jahren. Wenn du glaubst, dass eine Person unter 16 Jahren einen Account erstellt hat, kontaktiere uns bitte unter {mailLink}, damit wir den Account prüfen und gegebenenfalls löschen können.</>,
        ],
      },
      {
        title: "4. Daten, die wir verarbeiten",
        items: [
          "Account-Daten: Nutzername, E-Mail-Adresse, Passwort-Hash, Status der E-Mail-Verifizierung, Zeitstempel und Account-Einstellungen.",
          "Daten zu rechtlichen Bestätigungen: Zeitstempel und Dokumentversionen für akzeptierte Nutzungsbedingungen, die zur Kenntnis genommene Datenschutzerklärung und die gesonderte Bestätigung, dass der Nutzer mindestens 16 Jahre alt ist.",
          "Profildaten: optionaler Vor- und Nachname, Bio, Avatar, Fokusbereiche, Badges, optionale Standortangaben wie Postleitzahl, Stadt, Bezirk, Bundesland und Land sowie der Sichtbarkeitsstatus öffentlich/privat.",
          "Team- und Rollendaten: Teamnamen, Beschreibungen, Avatare, Mitglieder, Rollen, Bewerbungen, Einladungen und Standort-Präferenzen von Teams.",
          "Nachrichten und Benachrichtigungen: Direktnachrichten, Team-Nachrichten, Erwähnungen, Tipp- und Lesestatus-Anzeigen, Systemnachrichten, Benachrichtigungseinträge und Nachrichten-Metadaten.",
          "Uploads: Profil-Avatare, Team-Avatare, Chat-Bilder, Chat-Dateien und Anhänge des Kontaktformulars.",
          "Standortdaten: Postleitzahl, Stadt, Bezirk, Bundesland, Land und Koordinaten, die aus den von einem Nutzer angegebenen Standortdaten ermittelt werden. Lomir fragt nicht nach einer Straßenadresse. Postleitzahl und andere Standortangaben werden als ungefähre Standortinformationen für die Suche, entfernungsbasiertes Matching, Empfehlungen und die Standortanzeige bei Profilen, Teams und Rollen verwendet. Je nach Sichtbarkeitseinstellungen und Funktionskontext können Postleitzahl, Stadt, Bezirk, Bundesland oder Land für andere Nutzer sichtbar sein. Öffentliche Such- und Kartenergebnisse zeigen gerundete, ungefähre Koordinaten, nicht die exakt gespeicherten Koordinaten.",
          "Kontakt- und Meldedaten: Name, E-Mail-Adresse, Thema, Nachricht, optionale Anhänge des Kontaktformulars, Vorgangs-IDs von Meldungen, Meldestatus, Status der E-Mail-Weiterleitung und Metadaten von Anhängen bei Meldungen von Missbrauch oder rechtswidrigen Inhalten.",
          "Sicherheits- und technische Daten: IP-bezogene Anfragedaten, die von Hosting-Anbietern verarbeitet werden, Browser- und Gerätemetadaten in Server-Logs, Daten zur Ratenbegrenzung, CAPTCHA-Verifizierungsdaten, soweit aktiviert, Sitzungs- und Authentifizierungsdaten sowie Speicherungen im Browser, die für das Funktionieren der App erforderlich sind.",
        ],
      },
      {
        title: "5. Herkunft der Daten",
        paragraphs: [
          "Die meisten personenbezogenen Daten, die Lomir verarbeitet, werden direkt vom Nutzer bereitgestellt, zum Beispiel bei der Registrierung, der Profilbearbeitung, der Team-Erstellung, beim Schreiben von Nachrichten, bei Bewerbungen, Einladungen, Uploads und Kontaktanfragen.",
          "Einige Daten können von der App erzeugt oder im Rahmen der Zusammenarbeit von anderen Nutzern bereitgestellt werden, zum Beispiel Einträge zu Team-Mitgliedschaften, Einladungen, Bewerbungen, Badge-Auszeichnungen, Nachrichten, Erwähnungen, Benachrichtigungen, Übertragungen des Team-Eigentums und Systemnachrichten.",
          "Standortangaben können unter Verwendung von OpenStreetMap/Nominatim aus Angaben zu Postleitzahl, Stadt, Bezirk, Bundesland oder Land abgeleitet werden, die ein Nutzer macht.",
        ],
      },
      {
        title: "6. Zwecke und Rechtsgrundlagen",
        items: [
          "Account-Erstellung, Anmeldung, Profilverwaltung, optionales standortbasiertes Matching, Team-Matching, Chat, Benachrichtigungen und Betrieb der App: Art. 6 Abs. 1 lit. b DSGVO.",
          "Rechtliche Bestätigungen, Altersbestätigung und Dokumentation akzeptierter Rechtsdokumente: Art. 6 Abs. 1 lit. c und Art. 6 Abs. 1 lit. f DSGVO.",
          "Öffentliche Sichtbarkeit von Profilen und optionale Profilinhalte, die Nutzer zur Veröffentlichung auswählen, einschließlich optionaler ungefährer Standortangaben: Art. 6 Abs. 1 lit. a DSGVO und, soweit relevant, Art. 6 Abs. 1 lit. b DSGVO.",
          "Sicherheit, Missbrauchsverhinderung, Ratenbegrenzung, CAPTCHA-Prüfungen, Betrugsprävention, Fehleranalyse und Zuverlässigkeit des Dienstes: Art. 6 Abs. 1 lit. f DSGVO.",
          "Kontaktanfragen und Support-Kommunikation: Art. 6 Abs. 1 lit. b DSGVO, soweit sich die Anfrage auf einen Account oder einen möglichen Account bezieht, andernfalls Art. 6 Abs. 1 lit. f DSGVO.",
          "Erfüllung rechtlicher Pflichten und Sicherung von Ansprüchen, soweit erforderlich: Art. 6 Abs. 1 lit. c und Art. 6 Abs. 1 lit. f DSGVO.",
        ],
      },
      {
        title: "7. Berechtigte Interessen",
        paragraphs: [
          "Soweit sich Lomir auf Art. 6 Abs. 1 lit. f DSGVO stützt, bestehen die berechtigten Interessen darin, eine sichere und zuverlässige App zu betreiben, Missbrauch und Spam zu verhindern, Nutzer und den Dienst zu schützen, Fehler zu analysieren, Regeln durchzusetzen, Beweise zu sichern, soweit erforderlich, Support-Anfragen zu beantworten sowie rechtliche Ansprüche abzuwehren oder geltend zu machen.",
        ],
      },
      {
        title: "8. Erforderliche und optionale Daten",
        paragraphs: [
          "Es besteht keine gesetzliche Pflicht, einen Lomir-Account zu erstellen. Account-Zugangsdaten, rechtliche Bestätigungen, die Altersbestätigung und sicherheitsbezogene Daten sind erforderlich, um einen Account zu erstellen und zu führen sowie um den Nutzungsvertrag abzuschließen oder zu erfüllen. Ohne diese Daten kann Lomir keinen Account bereitstellen.",
          "Profilangaben, Avatare, Fokusbereiche, Teams, Rollen, Bewerbungen, Nachrichten, Uploads und Standortangaben werden grundsätzlich freiwillig bereitgestellt, einige davon sind jedoch für die jeweilige Funktion erforderlich. Werden optionale Daten nicht bereitgestellt, ist die zugehörige Funktion möglicherweise nicht verfügbar oder weniger nützlich.",
          "Standortfelder wie Postleitzahl, Stadt und Land sind optional. Nutzer können sie leer lassen oder später in ihren Profileinstellungen entfernen. Ohne Standortdaten sind die Suche in der Nähe, entfernungsbasiertes Matching und standortbasierte Empfehlungen möglicherweise weniger genau oder nicht verfügbar.",
        ],
      },
      {
        title: "9. Öffentliche Sichtbarkeit",
        paragraphs: [
          "Lomir ist so gestaltet, dass Nutzer Profilangaben nicht unbeabsichtigt veröffentlichen. Neue Accounts bleiben nach der E-Mail-Verifizierung privat, sofern der Nutzer die Einstellung nicht ändert.",
          "Ist ein Profil öffentlich, können andere Nutzer Profilangaben wie Nutzername, Name, Bio, Avatar, Fokusbereiche, Badges und vom Nutzer hinzugefügte ungefähre Standortangaben sehen. Ungefähre Standortangaben können Postleitzahl, Stadt, Bezirk, Bundesland oder Land umfassen. Ist ein Profil privat, wird es nicht in der öffentlichen Suche oder in öffentlichen Profilansichten angezeigt. Team-Mitglieder und Gesprächsteilnehmer können dennoch Informationen sehen, die für die Zusammenarbeit im Team, Nachrichten, Bewerbungen, Einladungen, den Badge-Kontext und sicherheitsbezogene Systemnachrichten erforderlich sind.",
          "Nutzer können die Profilsichtbarkeit in den Einstellungen ändern. Wird ein Profil auf privat gestellt, wirkt sich das auf die künftige öffentliche Sichtbarkeit aus, entfernt aber möglicherweise keine Informationen, die andere Nutzer bereits gesehen haben oder die im Team- oder Chat-Kontext enthalten sind.",
        ],
      },
      {
        title: "10. Empfänger und Offenlegung",
        items: [
          "Andere Lomir-Nutzer können personenbezogene Daten erhalten, soweit eine Funktion der App dies erfordert, zum Beispiel bei öffentlichen Profilansichten, Suchergebnissen, Team-Seiten, Bewerbungen, Einladungen, Nachrichten, im Badge-Kontext und bei Benachrichtigungen.",
          "Team-Mitglieder, Team-Eigentümer, Eingeladene, Bewerber und Gesprächsteilnehmer können Informationen erhalten, die für den jeweiligen Kontext der Zusammenarbeit erforderlich sind.",
          "Die Betreiber des Lomir-Projekts können auf personenbezogene Daten zugreifen, soweit dies erforderlich ist, um die App zu betreiben, Support zu leisten, Missbrauch zu untersuchen, Fehler zu analysieren, die Sicherheit aufrechtzuerhalten oder rechtliche Pflichten zu erfüllen.",
          "Anbieter für Hosting, Datenbank, Uploads, E-Mail, CAPTCHA, Geocoding, Karten und Infrastruktur verarbeiten personenbezogene Daten, soweit dies für die Bereitstellung der App erforderlich ist. Je nach Anbieter und Kontext können sie als Auftragsverarbeiter im Auftrag von Lomir oder als eigenständige Anbieter nach ihren eigenen Datenschutzbestimmungen handeln.",
          "E-Mail-Anbieter können E-Mail-Adressen, Nachrichteninhalte, E-Mail-Metadaten, Verifizierungs-E-Mails, E-Mails zum Zurücksetzen des Passworts und Nachrichten aus dem Kontaktformular einschließlich Anhängen verarbeiten, soweit die E-Mail-Zustellung oder die Support-Kommunikation dies erfordert.",
          "Geocoding- und Kartenanbieter können Standortabfragen, Kartenanfragen, IP-Adressen, Browser- oder Gerätedaten und Anfrage-Metadaten erhalten, wenn die Standortermittlung oder Kartenansichten verwendet werden.",
          "Behörden, Gerichte, Rechtsberater oder andere Dritte können Daten erhalten, soweit die Offenlegung gesetzlich vorgeschrieben oder zum Schutz von Rechten, der Sicherheit, von Nutzern oder des Dienstes erforderlich ist.",
        ],
      },
      {
        title: "11. Matching, Empfehlungen und automatisierte Entscheidungen",
        paragraphs: [
          "Lomir berechnet Match- und Überschneidungswerte aus Tags, Badges und Entfernungsinformationen, um Personen, Teams und Rollen zu sortieren oder zu empfehlen. Die Logik vergleicht gemeinsame Fokusbereiche, den Badge-Kontext, Rolleninformationen und, soweit verfügbar, die ungefähre Entfernung. Postleitzahl, Stadt, Bezirk, Bundesland, Land und daraus abgeleitete Koordinaten können zur Berechnung ungefährer Entfernungen verwendet werden.",
          "Diese Werte sind ausschließlich Hilfsfunktionen. Lomir setzt keine automatisierte Entscheidungsfindung ein, die rechtliche Wirkungen oder ähnlich erhebliche Wirkungen im Sinne von Art. 22 DSGVO entfaltet.",
        ],
      },
      {
        title: "12. Speicherung im Browser, Cookies und ähnliche Technologien",
        paragraphs: [
          "Lomir verwendet ein technisch notwendiges httpOnly-Sitzungscookie, damit du nach der Anmeldung angemeldet bleibst. Dieses Cookie enthält Daten zur Sitzungsauthentifizierung, ist für JavaScript nicht lesbar und wird an das Lomir-Backend gesendet, um deine Anfragen und die Echtzeit-Chat-Verbindung zu authentifizieren. Lomir verwendet außerdem technisch notwendige Speicherungen im Browser wie sessionStorage, zum Beispiel für den Benachrichtigungsstatus in der App.",
          "Dieses Cookie und diese Speicherungen sind unbedingt erforderlich, um Authentifizierung, API-Zugriff, Echtzeit-Chat und Benachrichtigungsfunktionen bereitzustellen, und bedürfen daher nach § 25 Abs. 2 TDDDG keiner Einwilligung. Lomir verwendet derzeit keine Werbe-Cookies, Marketing-Tracker oder Analyse-Tools von Drittanbietern.",
          "Soweit Cloudflare Turnstile für die Registrierung oder das Kontaktformular aktiviert ist, kann Cloudflare technische Daten verarbeiten, um zu prüfen, ob eine Anfrage von einem Menschen stammt. Dies dient der Missbrauchsverhinderung.",
        ],
      },
      {
        title: "13. Dienste von Drittanbietern",
        items: [
          "Vercel hostet und liefert das Frontend aus und leitet die API- und Echtzeit-Anfragen der App an das Backend weiter (sodass Frontend und Backend eine gemeinsame Adresse nutzen). Vercel kann daher IP-Adressen, Browser- und Gerätedaten, Anfrage- und API-Metadaten, Daten zur Sitzungsauthentifizierung während der Übertragung, Deployment-Daten und technische Logs verarbeiten, die erforderlich sind, um die App auszuliefern, ihre Anfragen weiterzuleiten und sie abzusichern.",
          "Render hostet die Backend-API. Render kann IP-Adressen, Browser- und Gerätedaten, Metadaten von API-Anfragen, Server-Logs, Fehlerinformationen sowie Daten verarbeiten, die an das Backend oder vom Backend übertragen werden.",
          "Neon, inzwischen Teil von Databricks, stellt die PostgreSQL-Datenbank bereit. In der Datenbank gespeicherte App-Daten können Account-Daten, Profildaten, Team- und Rollendaten, Nachrichten, Benachrichtigungen, Einträge zu rechtlichen Bestätigungen, Standortdaten und zugehörige Metadaten umfassen.",
          "ImageKit speichert, transformiert, optimiert und liefert hochgeladene Medien und Dateien aus, einschließlich Profil-Avataren, Team-Avataren, Chat-Bildern, Chat-Dateien sowie zugehöriger Auslieferungs-Logs oder Metadaten.",
          "Brevo (betrieben von Sendinblue SAS, Frankreich) wird verwendet, um die transaktionalen E-Mails der App zu versenden – Account-Verifizierung, Zurücksetzen des Passworts, Benachrichtigungen über Account-Änderungen sowie Nachrichten aus dem Kontaktformular und Meldungen von Missbrauch oder rechtswidrigen Inhalten. Brevo kann im Rahmen der E-Mail-Zustellung E-Mail-Adressen, E-Mail-Inhalte, E-Mail-Metadaten und Anhänge des Kontaktformulars verarbeiten. Nachrichten aus dem Kontaktformular und Meldungen gehen zusätzlich im Google/Gmail-Postfach der Lomir-Betreiber ein; Google kann diese E-Mail-Inhalte und Metadaten als Betreiber des Postfachs verarbeiten.",
          "Cloudflare Turnstile kann für CAPTCHA-Prüfungen bei der Registrierung und bei Kontaktformularen eingesetzt werden. Cloudflare kann technische Daten wie IP-Adresse, Browser- und Geräteinformationen, Challenge-Daten und Verifizierungs-Tokens verarbeiten, um Missbrauch zu erkennen und zu bestätigen, dass eine Anfrage wahrscheinlich von einem Menschen stammt.",
          "OpenStreetMap/Nominatim wird verwendet, um von Nutzern angegebene Standortinformationen wie Postleitzahl, Stadt, Bezirk, Bundesland oder Land aufzulösen. Beim Öffnen der Kartenansicht können Kartenkacheln von OpenStreetMap geladen werden. Mit OpenStreetMap verbundene Dienste können Standortabfragen, IP-Adressen, Browser- und Gerätedaten sowie Anfrage-Metadaten erhalten.",
        ],
      },
      {
        title: "14. Internationale Datenübermittlungen",
        paragraphs: [
          "Einige Anbieter haben ihren Sitz außerhalb des Europäischen Wirtschaftsraums oder verarbeiten Daten möglicherweise in den Vereinigten Staaten, im Vereinigten Königreich, in Indien oder in anderen Ländern, insbesondere soweit Infrastruktur, Support, Sicherheit, E-Mail-Zustellung, Content-Delivery oder globale Netzwerkdienste international erbracht werden.",
          "Werden personenbezogene Daten in ein Land ohne Angemessenheitsbeschluss der EU übermittelt, stützt sich Lomir, soweit erforderlich, auf die verfügbaren Übermittlungsmechanismen und Garantien, die der jeweilige Anbieter bietet. Dazu können das EU-U.S. Data Privacy Framework, die UK-Erweiterung zum EU-U.S. Data Privacy Framework, das Swiss-U.S. Data Privacy Framework, EU-Standardvertragsklauseln, Auftragsverarbeitungsverträge sowie ergänzende technische und organisatorische Maßnahmen gehören.",
          "Vercel, Render, Databricks/Neon, Cloudflare, Brevo und ImageKit veröffentlichen in ihrer Rechts- oder Trust-Dokumentation Informationen zur Datenverarbeitung, zu Übermittlungsgarantien oder zu Unterauftragsverarbeitern; Brevo, das die E-Mail-Zustellung übernimmt, hat seinen Sitz in der EU. Google/Gmail und mit OpenStreetMap verbundene Dienste verarbeiten Daten nach ihren eigenen Datenschutzbestimmungen, soweit sie als eigenständige Anbieter oder als Betreiber öffentlicher Infrastruktur handeln.",
          <>Nutzer können Lomir unter {mailLink} kontaktieren, um weitere Informationen über die Garantien anzufordern, die für einen bestimmten Anbieter maßgeblich sind.</>,
        ],
      },
      {
        title: "15. Speicherdauer",
        items: [
          "Account- und Profildaten werden gespeichert, solange der Account besteht. Löscht ein Nutzer seinen Account, werden der Datensatz des Nutzerprofils und Direktnachrichten, an denen dieser Nutzer beteiligt ist, unmittelbar nach der Bestätigung gelöscht, während begrenzte Team- und Badge-Bezüge nur in anonymisierter Form bestehen bleiben können.",
          "Wird ein Ein-Personen-Team gelöscht, werden das Team, sein Chat, seine Mitglieder, Einladungen, Bewerbungen, Badges, Benachrichtigungen und der Team-Avatar sofort gelöscht. Wird ein Team gelöscht, in dem weitere Mitglieder verbleiben, wird es zunächst archiviert, damit die verbleibenden Mitglieder den Löschhinweis sehen und den Team-Verlauf lesen können; es wird endgültig gelöscht, wenn das letzte Mitglied das Team verlässt oder nach Ablauf der eingestellten Archivierungsfrist, derzeit standardmäßig 14 Tage.",
          "Einträge zu rechtlichen Bestätigungen werden gespeichert, solange der Account besteht, und können aufbewahrt werden, soweit dies erforderlich ist, um die Einhaltung rechtlicher Vorgaben zu dokumentieren oder rechtliche Ansprüche abzuwehren.",
          "Nicht verifizierte Accounts werden nach Ablauf des Verifizierungslinks mit einem Puffer von einer Stunde zur Löschung vorgemerkt. Die Bereinigung läuft regelmäßig sowie einmal beim Serverstart.",
          "Tokens zum Zurücksetzen des Passworts laufen nach einer Stunde ab und werden durch eine geplante Bereinigung entfernt.",
          "Hochgeladene Chat-Dateien und -Bilder laufen nach 60 Tagen ab und werden, soweit möglich, durch eine geplante Bereinigung entfernt. Nachrichteneinträge können bestehen bleiben, wobei die Verweise auf gelöschte Dateien entfernt werden.",
          "Avatare und Team-Avatare werden gespeichert, bis sie ersetzt, entfernt oder, soweit technisch möglich, mit dem jeweiligen Account oder Team gelöscht werden.",
          "Nachrichten aus dem Kontaktformular, Meldungen von Missbrauch oder rechtswidrigen Inhalten, Einträge zum Meldestatus und zugehörige E-Mails werden so lange aufbewahrt, wie es erforderlich ist, um die Anfrage zu beantworten, die Meldung zu prüfen, den Bearbeitungsprozess zu dokumentieren und, soweit erforderlich, rechtliche Pflichten zu erfüllen oder Ansprüche abzuwehren.",
          "Technische Logs werden nur so lange aufbewahrt, wie es für Sicherheit, Fehlerbehebung und den Hosting-Betrieb erforderlich ist, vorbehaltlich der jeweiligen Einstellungen der Anbieter.",
        ],
      },
      {
        title: "16. Account-Löschung",
        paragraphs: [
          "Nutzer können ihren Account in der App löschen. Nach der Bestätigung entfernt die Löschung den Nutzerdatensatz und Direktnachrichten, an denen der Nutzer beteiligt ist, sofort. Ein Teil des Team-Kontexts kann in anonymisierter Form erhalten bleiben, zum Beispiel als „Ehemaliger Lomir-Nutzer“, damit verbleibende Teams, Badge-Verläufe, Übertragungen des Team-Eigentums und der Status von Rollen nachvollziehbar bleiben.",
          "Hochgeladene Avatare werden nach erfolgreicher Account-Löschung nach bestem Bemühen aus ImageKit gelöscht.",
        ],
      },
      {
        title: "17. Deine Rechte",
        paragraphs: [
          <>Du kannst Lomir unter {mailLink} kontaktieren, um Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch gegen die Verarbeitung auf Grundlage berechtigter Interessen und den Widerruf einer Einwilligung für die Zukunft zu verlangen.</>,
          "Durch den Widerruf einer Einwilligung wird die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung nicht berührt. Zum Beispiel können Nutzer ein öffentliches Profil für die Zukunft auf privat stellen, dies macht jedoch eine Sichtbarkeit, die bereits vor der Änderung bestand, nicht rückgängig.",
          "Du hast außerdem das Recht, Beschwerde bei einer Datenschutz-Aufsichtsbehörde einzulegen. In Rheinland-Pfalz ist dies der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz. Du kannst dich auch an eine andere zuständige Aufsichtsbehörde wenden.",
        ],
      },
      {
        title: "18. Sensible Daten",
        paragraphs: [
          "Bitte gib keine besonderen Kategorien personenbezogener Daten, keine vertraulichen Informationen und keine Geheimnisse Dritter in dein Profil, deine Teams, Nachrichten, Uploads oder das Kontaktformular ein, es sei denn, dies ist unbedingt erforderlich und du bist berechtigt, sie weiterzugeben.",
        ],
      },
      {
        title: "19. Aktualisierungen und Weiterverarbeitung",
        paragraphs: [
          "Diese Datenschutzerklärung kann aktualisiert werden, wenn sich Lomir ändert, wenn sich Anbieter ändern oder wenn sich rechtliche Anforderungen ändern. Wesentliche Aktualisierungen sollten veröffentlicht werden, bevor sie für neue Verarbeitungstätigkeiten gelten.",
          "Beabsichtigt Lomir, personenbezogene Daten für einen neuen Zweck zu verarbeiten, der mit dem Zweck, für den die Daten erhoben wurden, nicht vereinbar ist, werden Nutzer vor dieser Weiterverarbeitung informiert, soweit dies gesetzlich vorgeschrieben ist.",
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
      "Angaben zum Anbieter gemäß § 18 Abs. 1 des Medienstaatsvertrags (MStV) und, soweit anwendbar, § 5 des Digitale-Dienste-Gesetzes (DDG).",
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
          "Lomir bietet derzeit keine journalistisch-redaktionellen Inhalte im Sinne von § 18 Abs. 2 des Medienstaatsvertrags (MStV) an. Eine gesonderte verantwortliche Person nach § 18 Abs. 2 MStV wird daher nicht benannt. Sollten solche Inhalte künftig angeboten werden, wird dieses Impressum entsprechend aktualisiert.",
        ],
      },
      {
        title: "Art des Projekts",
        paragraphs: [
          "Lomir wird derzeit als kostenloses, nicht kommerzielles Portfolio- und Lernprojekt betrieben. Ändert sich der rechtliche oder kommerzielle Status der App, sollte dieses Impressum überprüft und aktualisiert werden.",
        ],
      },
      {
        title: "Verbraucherstreitbeilegung",
        paragraphs: [
          "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
        ],
      },
      {
        title: "Haftung für Inhalte",
        paragraphs: [
          "Wir bemühen uns in angemessenem Umfang, unsere eigenen Inhalte richtig und aktuell zu halten. Nutzergenerierte Inhalte werden von Nutzern erstellt. Wenn dir rechtswidrige Inhalte oder Rechtsverletzungen auffallen, kontaktiere uns bitte, damit wir sie prüfen können.",
        ],
      },
      {
        title: "Externe Links",
        paragraphs: [
          "Lomir kann Links zu externen Websites oder Diensten enthalten. Wir haben keinen Einfluss auf deren Inhalte und sind nicht für Websites Dritter verantwortlich. Externe Links werden beim Hinzufügen geprüft; wenn uns rechtswidrige Inhalte bekannt werden, entfernen wir den betreffenden Link, soweit möglich.",
        ],
      },
      {
        title: "Urheberrecht",
        paragraphs: [
          "Für Lomir erstellte Inhalte und Assets sind durch das geltende Urheberrecht geschützt. Von Nutzern übermittelte Inhalte bleiben in der Verantwortung des jeweiligen Nutzers. Jede Nutzung außerhalb der Grenzen des geltenden Rechts bedarf der Erlaubnis des jeweiligen Rechteinhabers.",
        ],
      },
    ],
  },
};

export default content;
