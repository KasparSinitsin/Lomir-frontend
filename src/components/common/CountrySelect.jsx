import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";

/**
 * CountrySelect Component
 * A searchable dropdown for selecting countries with:
 * - Common European countries at the top
 * - Multilingual search (English, German, French, Spanish, Italian, native names)
 * - Country flag emojis
 */

/**
 * Convert country code to flag emoji
 * Works by converting each letter to its regional indicator symbol
 * e.g., "DE" -> 🇩🇪
 */
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Common countries (shown at top of dropdown)
const COMMON_COUNTRIES = [
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
];

// All countries (alphabetical)
const ALL_COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "North Korea" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MK", name: "North Macedonia" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SZ", name: "Eswatini" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

/**
 * Alternative names for countries (German, French, Spanish, Italian, native, common variations)
 * Used for multilingual search - maps to country code
 */
const COUNTRY_ALIASES = {
  // German names
  DE: ["Deutschland", "BRD"],
  AT: ["Österreich", "Oesterreich"],
  CH: ["Schweiz", "Suisse", "Svizzera", "Svizra"],
  NL: ["Niederlande", "Holland", "Pays-Bas", "Paesi Bassi", "Nederland"],
  BE: ["Belgien", "Belgique", "België", "Belgio"],
  FR: ["Frankreich", "Francia"],
  GB: ["Großbritannien", "Grossbritannien", "Vereinigtes Königreich", "Vereinigtes Koenigreich", "England", "UK", "Britain", "Grande-Bretagne", "Gran Bretagna", "Reino Unido"],
  IT: ["Italien", "Italia", "Italie"],
  ES: ["Spanien", "España", "Espana", "Espagne", "Spagna"],
  PL: ["Polen", "Polska", "Pologne", "Polonia"],
  CZ: ["Tschechien", "Tschechische Republik", "Česko", "Cesko", "Tchéquie", "Tchequie", "Chequia", "Repubblica Ceca"],
  DK: ["Dänemark", "Daenemark", "Danmark", "Danemark", "Danimarca", "Dinamarca"],
  SE: ["Schweden", "Sverige", "Suède", "Suede", "Suecia", "Svezia"],
  NO: ["Norwegen", "Norge", "Norvège", "Norvege", "Noruega", "Norvegia"],
  FI: ["Finnland", "Suomi", "Finlande", "Finlandia"],
  US: ["USA", "Vereinigte Staaten", "Amerika", "États-Unis", "Etats-Unis", "Estados Unidos", "Stati Uniti", "America"],
  CA: ["Kanada", "Canadá"],
  AU: ["Australien", "Australie"],
  JP: ["Japan", "Japon", "Japón", "Giappone", "Nippon", "日本"],
  CN: ["China", "Chine", "Cina", "中国", "Zhongguo"],
  IN: ["Indien", "Inde", "India", "Bharat"],
  BR: ["Brasilien", "Brésil", "Bresil", "Brasil"],
  MX: ["Mexiko", "Méjico", "Mejico", "México"],
  RU: ["Russland", "Russie", "Rusia", "Россия", "Rossiya"],
  ZA: ["Südafrika", "Suedafrika", "Afrique du Sud", "Sudáfrica", "Sudafrica"],
  PT: ["Portugal", "Portogallo"],
  IE: ["Irland", "Irlande", "Irlanda", "Éire", "Eire"],
  GR: ["Griechenland", "Grèce", "Grece", "Grecia", "Ελλάδα", "Hellas"],
  HU: ["Ungarn", "Hongrie", "Hungría", "Hungria", "Ungheria", "Magyarország"],
  RO: ["Rumänien", "Rumaenien", "Roumanie", "Rumania", "România"],
  BG: ["Bulgarien", "Bulgarie", "България"],
  HR: ["Kroatien", "Croatie", "Croacia", "Croazia", "Hrvatska"],
  SK: ["Slowakei", "Slovaquie", "Eslovaquia", "Slovacchia", "Slovensko"],
  SI: ["Slowenien", "Slovénie", "Slovenie", "Eslovenia", "Slovenia", "Slovenija"],
  LT: ["Litauen", "Lituanie", "Lituania", "Lietuva"],
  LV: ["Lettland", "Lettonie", "Letonia", "Lettonia", "Latvija"],
  EE: ["Estland", "Estonie", "Estonia", "Eesti"],
  LU: ["Luxemburg", "Lussemburgo", "Lëtzebuerg"],
  IS: ["Island", "Islande", "Islandia", "Islanda", "Ísland"],
  TR: ["Türkei", "Tuerkei", "Turquie", "Turquía", "Turchia", "Türkiye"],
  UA: ["Ukraine", "Ucraina", "Україна", "Ukraina"],
  BY: ["Weißrussland", "Weissrussland", "Belarus", "Biélorussie", "Bielorrusia", "Bielorussia", "Беларусь"],
  RS: ["Serbien", "Serbie", "Serbia", "Србија", "Srbija"],
  BA: ["Bosnien", "Bosnien und Herzegowina", "Bosnie-Herzégovine", "Bosnia y Herzegovina", "Bosnia-Erzegovina", "Bosna i Hercegovina"],
  ME: ["Montenegro", "Crna Gora"],
  MK: ["Nordmazedonien", "Macédoine du Nord", "Macedonia del Norte", "Macedonia del Nord", "Северна Македонија"],
  AL: ["Albanien", "Albanie", "Albania", "Shqipëria"],
  KR: ["Südkorea", "Suedkorea", "Corée du Sud", "Corea del Sur", "Corea del Sud", "한국", "Hanguk"],
  KP: ["Nordkorea", "Corée du Nord", "Corea del Norte", "Corea del Nord", "조선"],
  TW: ["Taiwan", "Taïwan", "Taiwán", "臺灣", "台湾"],
  TH: ["Thailand", "Thaïlande", "Tailandia", "ประเทศไทย"],
  VN: ["Vietnam", "Viêt Nam", "Việt Nam"],
  ID: ["Indonesien", "Indonésie", "Indonesia"],
  MY: ["Malaysia", "Malaisie", "Malasia"],
  SG: ["Singapur", "Singapour", "Singapore", "新加坡"],
  PH: ["Philippinen", "Philippines", "Filipinas", "Filippine", "Pilipinas"],
  EG: ["Ägypten", "Aegypten", "Égypte", "Egypte", "Egipto", "Egitto", "مصر", "Misr"],
  MA: ["Marokko", "Maroc", "Marruecos", "Marocco", "المغرب"],
  TN: ["Tunesien", "Tunisie", "Túnez", "Tunisia", "تونس"],
  DZ: ["Algerien", "Algérie", "Algerie", "Argelia", "الجزائر"],
  SA: ["Saudi-Arabien", "Arabie Saoudite", "Arabia Saudita", "Arabia Saudí", "المملكة العربية السعودية"],
  AE: ["Vereinigte Arabische Emirate", "VAE", "Émirats arabes unis", "EAU", "Emiratos Árabes Unidos", "Emirati Arabi Uniti", "الإمارات"],
  IL: ["Israel", "Israël", "Israele", "ישראל"],
  NZ: ["Neuseeland", "Nouvelle-Zélande", "Nouvelle-Zelande", "Nueva Zelanda", "Nuova Zelanda", "Aotearoa"],
  AR: ["Argentinien", "Argentine"],
  CL: ["Chile", "Chili"],
  CO: ["Kolumbien", "Colombie", "Colombia"],
  PE: ["Peru", "Pérou", "Perú"],
  VE: ["Venezuela", "Vénézuéla"],
  CU: ["Kuba", "Cuba"],
  CR: ["Costa Rica", "Kostarika"],
  PA: ["Panama", "Panamá"],
  EC: ["Ecuador", "Équateur", "Equateur"],
  NG: ["Nigeria", "Nigéria"],
  KE: ["Kenia", "Kenya"],
  ET: ["Äthiopien", "Aethiopien", "Éthiopie", "Ethiopie", "Etiopía", "Etiopia", "ኢትዮጵያ"],
  GH: ["Ghana"],
  TZ: ["Tansania", "Tanzanie", "Tanzania"],
  UG: ["Uganda", "Ouganda"],
  SD: ["Sudan", "Soudan", "Sudán"],
  AF: ["Afghanistan", "Afganistán"],
  PK: ["Pakistan", "Pakistán", "پاکستان"],
  BD: ["Bangladesch", "Bangladesh", "Bangladés", "বাংলাদেশ"],
  MM: ["Myanmar", "Birma", "Burma", "Birmanie", "Birmania"],
  NP: ["Nepal", "Népal"],
  LK: ["Sri Lanka", "Ceylon", "Ceylan"],
  KZ: ["Kasachstan", "Kazakhstan", "Kazajistán", "Kazakistan", "Қазақстан"],
  UZ: ["Usbekistan", "Ouzbékistan", "Uzbekistán", "Oʻzbekiston"],
  AZ: ["Aserbaidschan", "Azerbaïdjan", "Azerbaiyán", "Azerbaigian", "Azərbaycan"],
  GE: ["Georgien", "Géorgie", "Georgia", "საქართველო", "Sakartvelo"],
  AM: ["Armenien", "Arménie", "Հայdelays", "Hayastan"],
  CY: ["Zypern", "Chypre", "Chipre", "Cipro", "Κύπρος", "Kıbrıs"],
  MT: ["Malta", "Malte"],
  MC: ["Monaco", "Mónaco"],
  AD: ["Andorra"],
  SM: ["San Marino", "Saint-Marin"],
  LI: ["Liechtenstein"],
  VA: ["Vatikanstadt", "Vatican", "Vaticano", "Santa Sede"],
};

/**
 * Build a search index that maps all searchable terms to country codes
 */
const buildSearchIndex = () => {
  const index = {};

  // Add all countries with their English names and codes
  ALL_COUNTRIES.forEach((country) => {
    const code = country.code.toLowerCase();
    const name = country.name.toLowerCase();

    // Index by code
    if (!index[code]) index[code] = new Set();
    index[code].add(country.code);

    // Index by each word in the name
    name.split(/\s+/).forEach((word) => {
      if (!index[word]) index[word] = new Set();
      index[word].add(country.code);
    });

    // Index by full name
    if (!index[name]) index[name] = new Set();
    index[name].add(country.code);
  });

  // Add aliases
  Object.entries(COUNTRY_ALIASES).forEach(([code, aliases]) => {
    aliases.forEach((alias) => {
      const lowerAlias = alias.toLowerCase();

      // Index by full alias
      if (!index[lowerAlias]) index[lowerAlias] = new Set();
      index[lowerAlias].add(code);

      // Index by each word in the alias
      lowerAlias.split(/\s+/).forEach((word) => {
        if (!index[word]) index[word] = new Set();
        index[word].add(code);
      });
    });
  });

  return index;
};

const SEARCH_INDEX = buildSearchIndex();

/**
 * Search for countries matching the given term
 * Returns country codes sorted by relevance
 */
const searchCountries = (searchTerm) => {
  if (!searchTerm.trim()) return null;

  const search = searchTerm.toLowerCase().trim();
  const matchedCodes = new Set();
  const exactMatches = new Set();
  const startsWithMatches = new Set();

  // Check each indexed term
  Object.entries(SEARCH_INDEX).forEach(([term, codes]) => {
    if (term === search) {
      // Exact match - highest priority
      codes.forEach((code) => exactMatches.add(code));
    } else if (term.startsWith(search)) {
      // Starts with - high priority
      codes.forEach((code) => startsWithMatches.add(code));
    } else if (term.includes(search)) {
      // Contains - lower priority
      codes.forEach((code) => matchedCodes.add(code));
    }
  });

  // Combine results with priority: exact > startsWith > contains
  const results = [
    ...exactMatches,
    ...[...startsWithMatches].filter((c) => !exactMatches.has(c)),
    ...[...matchedCodes].filter((c) => !exactMatches.has(c) && !startsWithMatches.has(c)),
  ];

  return results;
};

const CountrySelect = ({
  value,
  onChange,
  name = "country",
  className = "",
  placeholder = "Select a country",
  disabled = false,
  showCommonFirst = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Get the selected country's name for display
  const selectedCountry = ALL_COUNTRIES.find((c) => c.code === value);
  const displayValue = selectedCountry
    ? `${getFlagEmoji(selectedCountry.code)} ${selectedCountry.name}`
    : "";

  // Get countries that are NOT in the common list
  const otherCountries = ALL_COUNTRIES.filter(
    (country) => !COMMON_COUNTRIES.find((c) => c.code === country.code)
  );

  // Filter countries based on search term
  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) {
      return { common: COMMON_COUNTRIES, other: otherCountries, isSearching: false };
    }

    const matchedCodes = searchCountries(searchTerm);
    if (!matchedCodes || matchedCodes.length === 0) {
      return { common: [], other: [], isSearching: true };
    }

    // Filter and sort countries based on search results
    const matchedCountries = matchedCodes
      .map((code) => ALL_COUNTRIES.find((c) => c.code === code))
      .filter(Boolean);

    return {
      common: [],
      other: matchedCountries,
      isSearching: true,
    };
  }, [searchTerm, otherCountries]);

  // Flatten filtered countries for keyboard navigation
  const flatFilteredList = useMemo(() => {
    if (filteredCountries.isSearching) {
      return filteredCountries.other;
    }
    if (showCommonFirst) {
      return [...filteredCountries.common, ...filteredCountries.other];
    }
    return ALL_COUNTRIES;
  }, [filteredCountries, showCommonFirst]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (country) => {
    onChange({
      target: {
        name,
        value: country.code,
      },
    });
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({
      target: {
        name,
        value: "",
      },
    });
    setSearchTerm("");
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < flatFilteredList.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && flatFilteredList[highlightedIndex]) {
          handleSelect(flatFilteredList[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleContainerClick = () => {
    if (!disabled) {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const renderCountryOption = (country, index) => {
    const isSelected = value === country.code;
    const isHighlighted = highlightedIndex === index;

    return (
      <div
        key={`${country.code}-${index}`}
        data-index={index}
        onClick={() => handleSelect(country)}
        className={`
          px-3 py-2 cursor-pointer flex items-center justify-between transition-colors
          ${isHighlighted ? "bg-primary/10" : "hover:bg-base-200"}
          ${isSelected ? "bg-primary/5 font-medium" : ""}
        `}
      >
        <span className="truncate flex items-center gap-2">
          <span className="text-lg leading-none">{getFlagEmoji(country.code)}</span>
          <span>{country.name}</span>
        </span>
        {isSelected && <Check size={16} className="text-primary flex-shrink-0 ml-2" />}
      </div>
    );
  };

  // Calculate running index for keyboard navigation across groups
  let runningIndex = 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main Input Container */}
      <div
        onClick={handleContainerClick}
        className={`
          select select-bordered w-full flex items-center justify-between cursor-pointer
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isOpen ? "border-primary" : ""}
        `}
      >
        {isOpen ? (
          <div className="flex items-center flex-1 gap-2">
            <Search size={16} className="text-base-content/50 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type to search..."
              className="flex-1 bg-transparent outline-none text-sm min-w-0"
              autoComplete="off"
            />
          </div>
        ) : (
          <span className={`truncate ${!displayValue ? "text-base-content/50" : ""}`}>
            {displayValue || placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-base-200 rounded transition-colors"
              aria-label="Clear selection"
            >
              <X size={14} className="text-base-content/50" />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-base-content/50 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {flatFilteredList.length === 0 ? (
            <div className="px-3 py-4 text-center text-base-content/50 text-sm">
              No countries found
            </div>
          ) : filteredCountries.isSearching ? (
            // Flat list when searching
            flatFilteredList.map((country, index) =>
              renderCountryOption(country, index)
            )
          ) : showCommonFirst ? (
            <>
              {/* Common Countries Group */}
              {filteredCountries.common.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-base-content/60 bg-base-200 sticky top-0">
                    Common
                  </div>
                  {filteredCountries.common.map((country) => {
                    const element = renderCountryOption(country, runningIndex);
                    runningIndex++;
                    return element;
                  })}
                </>
              )}

              {/* All Countries Group */}
              {filteredCountries.other.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-base-content/60 bg-base-200 sticky top-0">
                    All Countries
                  </div>
                  {filteredCountries.other.map((country) => {
                    const element = renderCountryOption(country, runningIndex);
                    runningIndex++;
                    return element;
                  })}
                </>
              )}
            </>
          ) : (
            // Flat list without grouping
            flatFilteredList.map((country, index) =>
              renderCountryOption(country, index)
            )
          )}
        </div>
      )}
    </div>
  );
};

// Export the country lists and helper for use elsewhere
export { COMMON_COUNTRIES, ALL_COUNTRIES, getFlagEmoji };
export default CountrySelect;
