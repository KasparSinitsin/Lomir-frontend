import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useToast } from "../../contexts/ToastContext";
import { createPortal } from "react-dom";
import {
  AttributionControl,
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Calendar,
  Crown,
  EyeClosed,
  EyeIcon,
  FlaskConical,
  Globe,
  Mail,
  MapPin,
  MapPinX,
  Ruler,
  SendHorizontal,
  ShieldCheck,
  Users,
  User,
  UserSearch,
  X,
} from "lucide-react";
import { format } from "date-fns";
import VacantRoleDetailsModal from "../teams/VacantRoleDetailsModal";
import TeamApplicationDetailsModal from "../teams/TeamApplicationDetailsModal";
import TeamInvitationDetailsModal from "../teams/TeamInvitationDetailsModal";
import { useTeamModalSafe } from "../../contexts/TeamModalContext";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { useAuth } from "../../contexts/AuthContext";
import { teamService } from "../../services/teamService";
import { vacantRoleService } from "../../services/vacantRoleService";
import useViewerPendingRequests from "../../hooks/useViewerPendingRequests";
import useViewerTeamMemberships from "../../hooks/useViewerTeamMemberships";
import {
  fetchUserProfile,
  userProfileQueryKey,
} from "../../hooks/useUserQueries";
import { getResultMatchScore } from "../../utils/teamMatchUtils";
import { getMatchTier } from "../../utils/matchScoreUtils";
import {
  getTeamInitials,
  getUserInitials,
  isSyntheticRole,
  isSyntheticTeam,
  isSyntheticUser,
} from "../../utils/userHelpers";
import {
  formatLocation,
  getCountryCode,
  normalizeLocationData,
} from "../../utils/locationUtils";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import Tooltip from "../common/Tooltip";

const TYPE_META = {
  team: {
    label: "Team",
    color: "#e86a86",
    background: "#fce8ec",
    Icon: Users,
  },
  user: {
    label: "Person",
    color: "#009213",
    background: "#dcfce7",
    Icon: User,
  },
  role: {
    label: "Open Role",
    color: "#f59e0b",
    background: "#fef3c7",
    Icon: UserSearch,
  },
};

const DEFAULT_MAP_ENTITY_COLOR = "var(--color-primary-focus)";

const getMapEntityColor = (point, searchType = "all") =>
  searchType === "all"
    ? TYPE_META[point.type]?.color ?? TYPE_META.team.color
    : DEFAULT_MAP_ENTITY_COLOR;

const DEFAULT_CENTER = [51.1657, 10.4515];
const LOCATION_NOT_AVAILABLE = "Location not available";
const POPUP_SUBLINE_ICON_SIZE = 10;
const POPUP_SUBLINE_ICON_CLASS = "inline-flex h-3 w-3 items-center justify-center";
const MAP_POPUP_MAX_WIDTH = 340;
const MAP_POPUP_GAP = 14;
const MAP_POPUP_VIEWPORT_PADDING = 12;
const MAP_POPUP_ARROW_EDGE_PADDING = 14;
const MAP_MARKER_HALF_HEIGHT = 17;
const MAP_MARKER_TOOLTIP_GAP = 8;
const MAP_POPUP_ARROW_MASK = `url("data:image/svg+xml,%3Csvg width='22.5' height='12.8' viewBox='0 0 22.5 12.8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0H22.5C17.55 0 15.3 1.408 13.95 4.672L11.7 12.288C11.475 12.672 11.025 12.672 10.8 12.288L8.55 4.672C7.2 1.408 4.95 0 0 0Z' fill='white'/%3E%3C/svg%3E")`;
const COUNTRY_COORDINATE_BOUNDS = {
  CA: { minLat: 41.6, maxLat: 83.2, minLng: -141.1, maxLng: -52.6 },
  CO: { minLat: -4.3, maxLat: 13.6, minLng: -82.2, maxLng: -66.8 },
  DE: { minLat: 47.2, maxLat: 55.2, minLng: 5.7, maxLng: 15.1 },
  ES: { minLat: 27.5, maxLat: 43.9, minLng: -18.3, maxLng: 4.4 },
  FR: { minLat: 41.2, maxLat: 51.2, minLng: -5.6, maxLng: 9.7 },
  ZA: { minLat: -35.0, maxLat: -22.0, minLng: 16.0, maxLng: 33.2 },
};
const CITY_COUNTRY_FALLBACKS = {
  berlin: "DE",
  bogota: "CO",
  "bogota dc": "CO",
  "bogota d.c.": "CO",
  bogotá: "CO",
  "bogotá dc": "CO",
  "bogotá d.c.": "CO",
  frankfurt: "DE",
  "frankfurt am main": "DE",
  johannesburg: "ZA",
  madrid: "ES",
  toronto: "CA",
};
const CITY_COORDINATE_FALLBACKS = {
  berlin: { lat: 52.52, lng: 13.405 },
  bogota: { lat: 4.711, lng: -74.0721 },
  "bogota dc": { lat: 4.711, lng: -74.0721 },
  "bogota d.c.": { lat: 4.711, lng: -74.0721 },
  bogotá: { lat: 4.711, lng: -74.0721 },
  "bogotá dc": { lat: 4.711, lng: -74.0721 },
  "bogotá d.c.": { lat: 4.711, lng: -74.0721 },
  cologne: { lat: 50.938, lng: 6.960 },
  frankfurt: { lat: 50.1109, lng: 8.6821 },
  "frankfurt am main": { lat: 50.1109, lng: 8.6821 },
  hamburg: { lat: 53.550, lng: 9.993 },
  johannesburg: { lat: -26.2041, lng: 28.0473 },
  köln: { lat: 50.938, lng: 6.960 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  münchen: { lat: 48.137, lng: 11.576 },
  munich: { lat: 48.137, lng: 11.576 },
  toronto: { lat: 43.6532, lng: -79.3832 },
};
const DEMO_PROFILE_LOCATION_FALLBACKS = {
  af_lerato_mokoena: {
    city: "Johannesburg",
    countryCode: "ZA",
    lat: -26.2041,
    lng: 28.0473,
  },
  ca_noah_singh: {
    city: "Toronto",
    countryCode: "CA",
    lat: 43.6532,
    lng: -79.3832,
  },
  es_marta_garcia: {
    city: "Madrid",
    countryCode: "ES",
    lat: 40.4168,
    lng: -3.7038,
  },
  sa_valentina_lopez: {
    city: "Bogota",
    countryCode: "CO",
    lat: 4.711,
    lng: -74.0721,
  },
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "") ?? null;

const firstObject = (...values) =>
  values.find((value) => value && typeof value === "object") ?? null;

const normalizeLocationKey = (value) => String(value ?? "").trim().toLowerCase();

const normalizeRoleValue = (value) => {
  const role = String(value ?? "").trim().toLowerCase();
  return ["owner", "admin", "member"].includes(role) ? role : null;
};

const isTruthyValue = (value) =>
  value === true || value === 1 || value === "true" || value === "1";

const normalizeBooleanFlag = (value) => {
  if (value === true || value === 1 || value === "true" || value === "1") return true;
  if (value === false || value === 0 || value === "false" || value === "0") return false;
  return false;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getMarkerDemoLabelMarkup = (hasImage) => `
  <span class="lomir-map-marker-demo-overlay${hasImage ? " lomir-map-marker-demo-overlay--image" : ""}">
    <span class="lomir-map-marker-demo-label">DEMO</span>
  </span>
`;

const isValidCoordinate = (lat, lng) =>
  lat !== null &&
  lng !== null &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const getLatLng = (item) => {
  const lat = toNumber(firstPresent(
    item?.latitude,
    item?.approximate_latitude,
    item?.lat,
    item?.location?.latitude,
    item?.roleLocation?.latitude,
    item?.role_location?.latitude,
  ));
  const lng = toNumber(firstPresent(
    item?.longitude,
    item?.approximate_longitude,
    item?.lng,
    item?.lon,
    item?.location?.longitude,
    item?.roleLocation?.longitude,
    item?.role_location?.longitude,
  ));

  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
};

const getDisplayName = (item, type) => {
  if (type === "team") return item.name || "Team";
  if (type === "role") {
    return item.roleName ?? item.role_name ?? item.title ?? "Open role";
  }

  const firstName = item.first_name || item.firstName || "";
  const lastName = item.last_name || item.lastName || "";
  return [firstName, lastName].filter(Boolean).join(" ") || item.username || "Person";
};

const getMapPointType = (item) =>
  item._resultType === "team" || item._resultType === "user" || item._resultType === "role"
    ? item._resultType
    : item.roleName || item.role_name
      ? "role"
      : item.first_name || item.firstName || item.username
        ? "user"
        : "team";

const getTeamItemId = (item) => firstPresent(item?.id, item?.teamId, item?.team_id);

const getUserItemId = (item) => firstPresent(item?.id, item?.userId, item?.user_id);

const getItemUsername = (item) =>
  firstPresent(item?.username, item?.user?.username, item?.profile?.username);

const getItemPostalCode = (item) =>
  firstPresent(
    item.postal_code,
    item.postalCode,
    item.location_postal_code,
    item.locationPostalCode,
    item.zipCode,
    item.zip_code,
    item.rolePostalCode,
    item.role_postal_code,
    item.roleLocation?.postalCode,
    item.roleLocation?.postal_code,
    item.role_location?.postalCode,
    item.role_location?.postal_code,
    item.location?.postalCode,
    item.location?.postal_code,
    item.profileLocation?.postalCode,
    item.profileLocation?.postal_code,
    item.profile_location?.postalCode,
    item.profile_location?.postal_code,
    item.profile?.postalCode,
    item.profile?.postal_code,
    item.user?.postalCode,
    item.user?.postal_code,
    item.role?.postalCode,
    item.role?.postal_code,
  );

const getItemLocationText = (item) => {
  const locationValue = typeof item.location === "string" ? item.location : null;
  const userLocationValue = typeof item.user?.location === "string" ? item.user.location : null;
  const profileLocationValue =
    typeof item.profile?.location === "string" ? item.profile.location : null;

  return firstPresent(
    item.locationLabel,
    item.location_label,
    item.locationDisplayName,
    item.location_display_name,
    item.displayLocation,
    item.display_location,
    item.formattedLocation,
    item.formatted_location,
    item.address,
    item.location?.label,
    item.location?.displayName,
    item.location?.display_name,
    item.location?.formattedLocation,
    item.location?.formatted_location,
    item.location?.formatted,
    item.location?.address,
    item.profileLocation?.label,
    item.profileLocation?.displayName,
    item.profileLocation?.display_name,
    item.profileLocation?.formattedLocation,
    item.profileLocation?.formatted_location,
    item.profileLocation?.formatted,
    item.profileLocation?.address,
    item.profile_location?.label,
    item.profile_location?.displayName,
    item.profile_location?.display_name,
    item.profile_location?.formattedLocation,
    item.profile_location?.formatted_location,
    item.profile_location?.formatted,
    item.profile_location?.address,
    item.profile?.locationLabel,
    item.profile?.location_label,
    item.profile?.locationDisplayName,
    item.profile?.location_display_name,
    item.profile?.displayLocation,
    item.profile?.display_location,
    item.profile?.formattedLocation,
    item.profile?.formatted_location,
    item.profile?.address,
    item.user?.locationLabel,
    item.user?.location_label,
    item.user?.locationDisplayName,
    item.user?.location_display_name,
    item.user?.displayLocation,
    item.user?.display_location,
    item.user?.formattedLocation,
    item.user?.formatted_location,
    item.user?.address,
    locationValue,
    userLocationValue,
    profileLocationValue,
  );
};

const getItemNarrativeText = (item) =>
  firstPresent(
    item.bio,
    item.biography,
    item.description,
    item.summary,
    item.profile?.bio,
    item.profile?.biography,
    item.profile?.description,
    item.user?.bio,
    item.user?.biography,
    item.user?.description,
  );

const isDemoItem = (item) =>
  isSyntheticTeam(item) || isSyntheticUser(item) || isSyntheticRole(item);

const getCanonicalDemoLocation = (item) => {
  if (!isDemoItem(item)) return null;

  const username = String(getItemUsername(item) ?? "").trim().toLowerCase();
  return DEMO_PROFILE_LOCATION_FALLBACKS[username] ?? null;
};

const textContainsBogota = (value) =>
  /\bbogot[aá]\b/i.test(String(value ?? ""));

const textContainsJohannesburg = (value) =>
  /\bjohannesburg\b/i.test(String(value ?? ""));

const textContainsMadrid = (value) =>
  /\bmadrid\b/i.test(String(value ?? ""));

const textContainsToronto = (value) =>
  /\btoronto\b/i.test(String(value ?? ""));

const textContainsColombia = (value) =>
  /\b(colombia|colombie|kolumbien)\b/i.test(String(value ?? ""));

const textContainsSpain = (value) =>
  /\b(spain|españa|spanien|espagne)\b/i.test(String(value ?? ""));

const textContainsSouthAfrica = (value) =>
  /\b(south africa|südafrika|sudáfrica|afrique du sud)\b/i.test(String(value ?? ""));

const textContainsCanada = (value) =>
  /\b(canada|kanada)\b/i.test(String(value ?? ""));

const inferCityFromLocationText = (value) => {
  if (textContainsBogota(value)) return "Bogota";
  if (textContainsJohannesburg(value)) return "Johannesburg";
  if (textContainsMadrid(value)) return "Madrid";
  if (textContainsToronto(value)) return "Toronto";
  return null;
};

const inferDemoCityFromNarrativeText = (item) =>
  isDemoItem(item) ? inferCityFromLocationText(getItemNarrativeText(item)) : null;

const inferCityFromPostalCode = (value) => {
  const postalCode = String(value ?? "").trim().toUpperCase();
  if (/^11\d{4}$/.test(postalCode)) return "Bogota";
  if (postalCode === "2000") return "Johannesburg";
  if (/^28\d{3}$/.test(postalCode)) return "Madrid";
  if (/^M\d[A-Z]\s?\d[A-Z]\d$/.test(postalCode)) return "Toronto";
  // 5-digit German postal codes — map numeric ranges to major cities
  if (/^\d{5}$/.test(postalCode)) {
    const n = parseInt(postalCode, 10);
    if (n >= 10115 && n <= 14199) return "Berlin";
    if (n >= 20095 && n <= 22769) return "Hamburg";
    if (n >= 50667 && n <= 51149) return "Cologne";
    if (n >= 60311 && n <= 65936) return "Frankfurt";
    if (n >= 80331 && n <= 81929) return "München";
  }
  return null;
};

const getItemCity = (item) =>
  firstPresent(
    item.city,
    item.location_city,
    item.locationCity,
    item.roleCity,
    item.role_city,
    item.roleLocation?.city,
    item.role_location?.city,
    item.location?.city,
    item.profileLocation?.city,
    item.profile_location?.city,
    item.profile?.city,
    item.user?.city,
    item.role?.city,
    getCanonicalDemoLocation(item)?.city,
    inferCityFromLocationText(getItemLocationText(item)),
    inferCityFromPostalCode(getItemPostalCode(item)),
    inferDemoCityFromNarrativeText(item),
  );

const getLocationLabel = (item) => {
  if (item.is_remote ?? item.isRemote) return "Remote";

  const city = getItemCity(item);
  const inferredCountryCode =
    getCanonicalDemoLocation(item)?.countryCode ??
    CITY_COUNTRY_FALLBACKS[normalizeLocationKey(city)] ??
    null;
  const country = firstPresent(
    item.country,
    item.location_country,
    item.locationCountry,
    item.countryCode,
    item.country_code,
    item.roleCountry,
    item.role_country,
    item.roleLocation?.country,
    item.role_location?.country,
    item.location?.country,
    item.profileLocation?.country,
    item.profile_location?.country,
    item.profile?.country,
    item.user?.country,
    item.role?.country,
  );
  const state = firstPresent(
    item.state,
    item.location_state,
    item.locationState,
    item.roleState,
    item.role_state,
    item.roleLocation?.state,
    item.role_location?.state,
    item.location?.state,
    item.profileLocation?.state,
    item.profile_location?.state,
    item.profile?.state,
    item.user?.state,
    item.role?.state,
  );
  const locationLabel = formatLocation(
    normalizeLocationData({
      ...item,
      city,
      state,
      country: country || inferredCountryCode,
    }),
    {
      displayType: "short",
      showState: true,
      showCountryCode: false,
    },
  );

  return locationLabel || LOCATION_NOT_AVAILABLE;
};

const getItemCountryCode = (item) => {
  const explicitCountryCode = getCountryCode(firstPresent(
    item?.country,
    item?.location_country,
    item?.locationCountry,
    item?.countryCode,
    item?.country_code,
    item?.roleCountry,
    item?.role_country,
    item?.roleLocation?.country,
    item?.role_location?.country,
    item?.location?.country,
    item?.profileLocation?.country,
    item?.profile_location?.country,
    item?.profile?.country,
    item?.user?.country,
    item?.role?.country,
  ));
  if (explicitCountryCode) return explicitCountryCode;

  const locationText = getItemLocationText(item);
  if (textContainsColombia(locationText)) return "CO";
  if (textContainsSpain(locationText)) return "ES";
  if (textContainsSouthAfrica(locationText)) return "ZA";
  if (textContainsCanada(locationText)) return "CA";

  const canonicalDemoLocation = getCanonicalDemoLocation(item);
  if (canonicalDemoLocation?.countryCode) return canonicalDemoLocation.countryCode;

  const cityKey = normalizeLocationKey(getItemCity(item));
  const cityCountryCode = CITY_COUNTRY_FALLBACKS[cityKey] ?? null;
  if (cityCountryCode) return cityCountryCode;

  const postalCode = String(getItemPostalCode(item) ?? "").trim();
  if (/^11\d{4}$/.test(postalCode) && textContainsBogota(`${getItemCity(item) ?? ""} ${locationText ?? ""}`)) {
    return "CO";
  }
  if (/^28\d{3}$/.test(postalCode) && textContainsMadrid(`${getItemCity(item) ?? ""} ${locationText ?? ""}`)) {
    return "ES";
  }
  if (/^M\d[A-Z]\s?\d[A-Z]\d$/i.test(postalCode) && textContainsToronto(`${getItemCity(item) ?? ""} ${locationText ?? ""}`)) {
    return "CA";
  }

  return null;
};

const getCityCoordinateFallback = (item) =>
  getCanonicalDemoLocation(item) ??
  CITY_COORDINATE_FALLBACKS[normalizeLocationKey(getItemCity(item))] ??
  null;

const mergeUserLocationDetails = (item, userDetails) => {
  if (!item || !userDetails) return item;

  const detailsCoordinates = getLatLng(userDetails);

  return {
    ...item,
    postalCode: firstPresent(item.postalCode, item.postal_code, getItemPostalCode(userDetails)),
    postal_code: firstPresent(item.postal_code, item.postalCode, getItemPostalCode(userDetails)),
    city: firstPresent(item.city, getItemCity(userDetails)),
    state: firstPresent(item.state, userDetails.state, userDetails.location?.state),
    country: firstPresent(item.country, getItemCountryCode(userDetails), userDetails.country),
    latitude: firstPresent(item.latitude, item.lat, detailsCoordinates?.lat),
    longitude: firstPresent(item.longitude, item.lng, item.lon, detailsCoordinates?.lng),
  };
};

const getItemMaxDistanceKm = (item) =>
  toNumber(firstPresent(item?.maxDistanceKm, item?.max_distance_km, item?.role?.maxDistanceKm, item?.role?.max_distance_km));

const getTeamMemberCount = (item) => {
  const count = firstPresent(
    item?.current_members_count,
    item?.currentMembersCount,
    item?.member_count,
    item?.memberCount,
    item?.members_count,
    item?.membersCount,
    Array.isArray(item?.members) ? item.members.length : null,
  );

  return toNumber(count) ?? 0;
};

const getTeamMaxMembers = (item) =>
  firstPresent(item?.max_members, item?.maxMembers) ?? "∞";

const isOpenRole = (r) => String(r?.status ?? "open").toLowerCase() === "open";

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const getRoleDisplayName = (role) => {
  if (!role) return null;

  return (
    role.roleName ??
    role.role_name ??
    role.name ??
    role.title ??
    null
  );
};

const normalizeRoleNames = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item.trim() : getRoleDisplayName(item),
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  return [];
};

const getTeamRoleCollections = (item) =>
  [
    item?.openRoles,
    item?.open_roles,
    item?.vacantRoles,
    item?.vacant_roles,
  ].filter(Array.isArray);

const resolveTeamOpenRoleSnapshot = (item, fetchedSnapshot = null) => {
  if (fetchedSnapshot) {
    return {
      count: fetchedSnapshot.count,
      names: fetchedSnapshot.names ?? [],
      source: "fetch",
    };
  }

  const roleCollections = getTeamRoleCollections(item);
  if (roleCollections.length > 0) {
    const roles = roleCollections.flat().filter(isOpenRole);
    return {
      count: roles.length,
      names: roles.map(getRoleDisplayName).filter(Boolean),
      source: "records",
    };
  }

  const rawCount = firstPresent(
    item?.openRoleCount,
    item?.open_role_count,
    item?.openRolesCount,
    item?.open_roles_count,
  );
  const count = toNumber(rawCount);
  const names = normalizeRoleNames(
    firstPresent(item?.openRoleNames, item?.open_role_names),
  );

  return {
    count: count ?? names.length,
    names,
    source: rawCount != null || names.length > 0 ? "aggregate" : "none",
  };
};

const getTeamViewerRole = (item, viewerUser = null) => {
  if (!item || !viewerUser?.id) return null;

  if (String(item.owner_id ?? item.ownerId ?? "") === String(viewerUser.id)) {
    return "owner";
  }

  const directRole = normalizeRoleValue(firstPresent(
    item.currentUserRole,
    item.current_user_role,
    item.userRole,
    item.user_role,
    item.viewerRole,
    item.viewer_role,
    item.membershipRole,
    item.membership_role,
  ));

  if (directRole) return directRole;

  if (Array.isArray(item.members)) {
    const viewerMember = item.members.find(
      (member) =>
        String(member.user_id ?? member.userId ?? member.id ?? "") === String(viewerUser.id),
    );

    return normalizeRoleValue(viewerMember?.role);
  }

  return null;
};

const getTeamIsPublic = (item) => {
  const raw = firstPresent(item?.is_public, item?.isPublic);
  return normalizeBooleanFlag(raw);
};

const coordinatesMatchCountry = (lat, lng, countryCode) => {
  if (!countryCode) return true;
  const bounds = COUNTRY_COORDINATE_BOUNDS[countryCode];
  if (!bounds) return true;

  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
};

const getDistanceLabel = (item) => {
  const matchDetails = item.matchDetails ?? item.match_details ?? null;
  const distance = toNumber(
    item.distanceKm ??
      item.distance_km ??
      matchDetails?.distanceKm ??
      matchDetails?.distance_km,
  );

  if (distance === null || distance >= 999999) return null;
  if (distance === 0) return "0 km away";
  if (distance < 1) return `${distance.toFixed(1)} km away`;
  return `${Math.round(distance)} km away`;
};

const getDistanceValue = (item) => {
  const matchDetails = item?.matchDetails ?? item?.match_details ?? null;
  return toNumber(
    item?.distanceKm ??
      item?.distance_km ??
      matchDetails?.distanceKm ??
      matchDetails?.distance_km,
  );
};

const INACTIVE_APPLICATION_STATUSES = new Set(["withdrawn", "rejected", "declined", "cancelled", "canceled"]);
const INACTIVE_INVITATION_STATUSES = new Set(["withdrawn", "revoked", "declined", "cancelled", "canceled"]);

const getRoleHasApplied = (item) => {
  if (isTruthyValue(firstPresent(
    item.hasAppliedToRole, item.has_applied_to_role,
    item.hasApplied, item.has_applied,
    item.isApplied, item.is_applied,
    item.viewerHasApplied, item.viewer_has_applied,
    item.hasPendingApplication, item.has_pending_application,
    item.hasPendingRoleApplication, item.has_pending_role_application,
    item.isPendingApplication, item.is_pending_application,
    item.currentUserHasApplied, item.current_user_has_applied,
  ))) return true;
  const appObj = firstPresent(
    item.currentUserRoleApplication, item.current_user_role_application,
    item.currentUserApplication, item.current_user_application,
    item.pendingRoleApplication, item.pending_role_application,
    item.pendingApplication, item.pending_application,
    item.roleApplication, item.role_application,
    item.application,
  );
  if (appObj) {
    const status = String(appObj.status ?? appObj.applicationStatus ?? appObj.application_status ?? "").toLowerCase();
    return status !== "" && !INACTIVE_APPLICATION_STATUSES.has(status);
  }
  return false;
};

const getRoleHasInvitation = (item) => {
  if (isTruthyValue(firstPresent(
    item.hasRoleInvitation, item.has_role_invitation,
    item.hasInvitationToRole, item.has_invitation_to_role,
    item.hasInvitation, item.has_invitation,
    item.isInvitedToRole, item.is_invited_to_role,
    item.viewerHasInvitation, item.viewer_has_invitation,
    item.currentUserHasInvitation, item.current_user_has_invitation,
  ))) return true;
  const invObj = firstPresent(
    item.currentUserRoleInvitation, item.current_user_role_invitation,
    item.currentUserInvitation, item.current_user_invitation,
    item.pendingRoleInvitation, item.pending_role_invitation,
    item.pendingInvitation, item.pending_invitation,
    item.roleInvitation, item.role_invitation,
    item.invitation,
  );
  if (invObj) {
    const status = String(invObj.status ?? invObj.invitationStatus ?? invObj.invitation_status ?? "").toLowerCase();
    return status !== "" && !INACTIVE_INVITATION_STATUSES.has(status);
  }
  return false;
};

const getEmbeddedRoleApplication = (item) =>
  firstObject(
    item.currentUserRoleApplication,
    item.current_user_role_application,
    item.currentUserApplication,
    item.current_user_application,
    item.pendingRoleApplication,
    item.pending_role_application,
    item.pendingApplication,
    item.pending_application,
    item.roleApplication,
    item.role_application,
    item.application,
  );

const getEmbeddedRoleInvitation = (item) =>
  firstObject(
    item.currentUserRoleInvitation,
    item.current_user_role_invitation,
    item.currentUserInvitation,
    item.current_user_invitation,
    item.pendingRoleInvitation,
    item.pending_role_invitation,
    item.pendingInvitation,
    item.pending_invitation,
    item.roleInvitation,
    item.role_invitation,
    item.invitation,
  );

const getRoleIsViewerTeamMember = (item) => {
  if (isTruthyValue(firstPresent(
    item.isTeamMember, item.is_team_member,
    item.isCurrentUserTeamMember,
    item.viewerIsTeamMember, item.viewer_is_team_member,
    item.memberOfTeam, item.member_of_team,
    item.currentUserIsTeamMember, item.current_user_is_team_member,
  ))) return true;
  return normalizeRoleValue(firstPresent(
    item.userRole, item.user_role,
    item.viewerRole, item.viewer_role,
    item.currentUserRole, item.current_user_role,
  )) !== null;
};

const getRolePostedAt = (item) =>
  firstPresent(item.postedAt, item.posted_at, item.createdAt, item.created_at);

const getRoleInitials = (item) => {
  const name = item.roleName ?? item.role_name ?? item.title ?? "Vacant Role";
  const words = String(name).trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }

  return String(name).trim().substring(0, 2).toUpperCase() || "VR";
};

const getAvatarData = (item, type) => {
  if (type === "team") {
    return {
      imageUrl:
        item.teamavatar_url ??
        item.teamavatarUrl ??
        item.avatar_url ??
        item.avatarUrl ??
        null,
      initials: getTeamInitials(item),
    };
  }

  if (type === "user") {
    return {
      imageUrl: item.avatar_url ?? item.avatarUrl ?? null,
      initials: getUserInitials(item),
    };
  }

  return {
    imageUrl: null,
    initials: getRoleInitials(item),
  };
};

const isDemoPoint = (item, type) => {
  if (type === "team") return isSyntheticTeam(item);
  if (type === "user") return isSyntheticUser(item);
  return isSyntheticRole(item);
};

const getDemoLabel = (type) => {
  if (type === "team") return "Demo Team";
  if (type === "role") return "Demo Role";
  return "Demo Profile";
};

const getTypeTooltipLabel = (type) => {
  if (type === "team") return "Team";
  if (type === "role") return "Open Role";
  return "User Profile";
};

const getMarkerMatchIconMarkup = (matchTier) => {
  if (matchTier.label === "Great match") {
    return `
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    `;
  }

  if (matchTier.label === "Good match") {
    return `
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    `;
  }

  return `
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
    <polyline points="16 17 22 17 22 11" />
  `;
};

const getMarkerMatchBadgeMarkup = (point, showMatchScore = false) => {
  if (!showMatchScore) return "";

  const matchTier = getMatchTier(getResultMatchScore(point?.item));

  return `
    <span class="lomir-map-marker-match-badge ${matchTier.bg}">
      <svg
        class="lomir-map-marker-match-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        ${getMarkerMatchIconMarkup(matchTier)}
      </svg>
    </span>
  `;
};

const buildMarkerIcon = (point, searchType = "all", showMatchScore = false) => {
  const initials = escapeHtml(point.initials);
  const markerColor = getMapEntityColor(point, searchType);
  const imageMarkup = point.imageUrl
    ? `<img src="${escapeHtml(point.imageUrl)}" alt="" class="lomir-map-marker-avatar-image" onerror="this.style.display='none'" />`
    : "";
  const demoMarkup = point.isDemo ? getMarkerDemoLabelMarkup(Boolean(point.imageUrl)) : "";
  const matchBadgeMarkup = getMarkerMatchBadgeMarkup(point, showMatchScore);

  return L.divIcon({
    className: "lomir-map-marker",
    html: `
      <span
        class="lomir-map-marker-pin"
        style="--marker-color: ${markerColor};"
        aria-hidden="true"
      >
        <span class="lomir-map-marker-avatar">
          <span class="lomir-map-marker-avatar-clip">
            <span class="lomir-map-marker-avatar-fallback">${initials}</span>
            ${imageMarkup}
            ${demoMarkup}
          </span>
          ${matchBadgeMarkup}
        </span>
      </span>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36],
  });
};

const matchesRoleItem = (entry, roleRawId, roleTeamId, roleNameStr) => {
  const entryRoleId = entry.role?.id ?? entry.roleId ?? entry.role_id ?? null;
  if (entryRoleId != null && roleRawId != null && String(entryRoleId) === String(roleRawId)) return true;
  const entryTeamId = entry.team?.id ?? entry.teamId ?? entry.team_id ?? null;
  const entryRoleName = entry.role?.roleName ?? entry.role?.role_name ?? entry.roleName ?? entry.role_name ?? null;
  return (
    roleTeamId != null && entryTeamId != null && String(entryTeamId) === String(roleTeamId) &&
    typeof entryRoleName === "string" && typeof roleNameStr === "string" &&
    entryRoleName.trim().toLowerCase() === roleNameStr.trim().toLowerCase()
  );
};

const getRequestTeamId = (entry) =>
  firstPresent(
    entry?.team?.id,
    entry?.teamId,
    entry?.team_id,
    entry?.role?.teamId,
    entry?.role?.team_id,
  );

const getRequestRoleName = (entry) => {
  const roleName = firstPresent(
    entry?.role?.roleName,
    entry?.role?.role_name,
    entry?.roleName,
    entry?.role_name,
  );

  if (typeof roleName === "string" && roleName.trim()) {
    return roleName.trim();
  }

  const roleId = firstPresent(entry?.role?.id, entry?.roleId, entry?.role_id);
  return roleId != null ? "Vacant Role" : null;
};

const requestTargetsTeam = (entry, teamId) => {
  const entryTeamId = getRequestTeamId(entry);
  return entryTeamId != null && teamId != null && String(entryTeamId) === String(teamId);
};

const getRequestStatus = (entry) =>
  String(
    firstPresent(
      entry?.status,
      entry?.applicationStatus,
      entry?.application_status,
      entry?.invitationStatus,
      entry?.invitation_status,
    ) ?? "",
  ).toLowerCase();

const isActiveApplicationRequest = (entry) => {
  const status = getRequestStatus(entry);
  return status === "" || !INACTIVE_APPLICATION_STATUSES.has(status);
};

const isActiveInvitationRequest = (entry) => {
  const status = getRequestStatus(entry);
  return status === "" || !INACTIVE_INVITATION_STATUSES.has(status);
};

const isRoleScopedRequest = (entry) =>
  Boolean(getRequestRoleName(entry)) ||
  isTruthyValue(firstPresent(
    entry?.isInternal,
    entry?.is_internal,
    entry?.isInternalRoleApplication,
    entry?.is_internal_role_application,
    entry?.isRoleApplication,
    entry?.is_role_application,
    entry?.isRoleInvitation,
    entry?.is_role_invitation,
  ));

const findTeamRequest = (entries, teamId, { roleScoped, isActiveRequest }) =>
  entries.find(
    (entry) =>
      requestTargetsTeam(entry, teamId) &&
      isActiveRequest(entry) &&
      isRoleScopedRequest(entry) === roleScoped,
  ) ?? null;

const normalizeMapPoint = (
  item,
  viewerUser = null,
  fetchedTeamRoles = {},
  fetchedApplications = [],
  fetchedInvitations = [],
  fetchedUserTeamIds = new Set(),
  fetchedOpenRoleSnapshots = {},
) => {
  if (!item) return null;

  const type = getMapPointType(item);
  const lat = toNumber(firstPresent(
    item.latitude,
    item.approximate_latitude,
    item.lat,
    item.location?.latitude,
    item.roleLocation?.latitude,
    item.role_location?.latitude,
  ));
  const lng = toNumber(firstPresent(
    item.longitude,
    item.approximate_longitude,
    item.lng,
    item.lon,
    item.location?.longitude,
    item.roleLocation?.longitude,
    item.role_location?.longitude,
  ));
  const isRemote = Boolean(item.is_remote ?? item.isRemote);
  const locationLabel = getLocationLabel(item);
  const countryCode = getItemCountryCode(item);
  const rawCoordinatesAreUsable =
    !isRemote &&
    locationLabel !== LOCATION_NOT_AVAILABLE &&
    isValidCoordinate(lat, lng) &&
    coordinatesMatchCountry(lat, lng, countryCode);
  const cityCoordinateFallback = !isRemote ? getCityCoordinateFallback(item) : null;
  const shouldUseCityCoordinateFallback =
    !rawCoordinatesAreUsable &&
    locationLabel !== LOCATION_NOT_AVAILABLE &&
    Boolean(cityCoordinateFallback);
  const mapLat = rawCoordinatesAreUsable ? lat : cityCoordinateFallback?.lat ?? lat;
  const mapLng = rawCoordinatesAreUsable ? lng : cityCoordinateFallback?.lng ?? lng;
  const hasCoordinates =
    rawCoordinatesAreUsable ||
    shouldUseCityCoordinateFallback;
  const avatarData = getAvatarData(item, type);
  const rawId =
    type === "team"
      ? getTeamItemId(item)
      : type === "user"
        ? getUserItemId(item)
        : item.id ?? item.roleId ?? item.role_id;
  const fetchedTeamRole =
    type === "team" && rawId !== undefined && rawId !== null
      ? fetchedTeamRoles[String(rawId)]
      : null;
  const currentUserRole =
    type === "team"
      ? normalizeRoleValue(fetchedTeamRole) ?? getTeamViewerRole(item, viewerUser)
      : null;
  const roleTeamId =
    type === "role"
      ? firstPresent(item.teamId, item.team_id, item.team?.id, item.team?.teamId, item.team?.team_id)
      : null;
  const teamInvitation =
    type === "team" && rawId != null
      ? findTeamRequest(fetchedInvitations, rawId, {
          roleScoped: false,
          isActiveRequest: isActiveInvitationRequest,
        })
      : null;
  const teamRoleInvitation =
    type === "team" && rawId != null
      ? findTeamRequest(fetchedInvitations, rawId, {
          roleScoped: true,
          isActiveRequest: isActiveInvitationRequest,
        })
      : null;
  const teamApplication =
    type === "team" && rawId != null
      ? findTeamRequest(fetchedApplications, rawId, {
          roleScoped: false,
          isActiveRequest: isActiveApplicationRequest,
        })
      : null;
  const teamRoleApplication =
    type === "team" && rawId != null
      ? findTeamRequest(fetchedApplications, rawId, {
          roleScoped: true,
          isActiveRequest: isActiveApplicationRequest,
        })
      : null;
  const roleApplication =
    type === "role"
      ? getEmbeddedRoleApplication(item) ??
        fetchedApplications.find((app) =>
          isActiveApplicationRequest(app) &&
          matchesRoleItem(app, rawId, roleTeamId, getDisplayName(item, "role"))) ??
        null
      : null;
  const roleInvitation =
    type === "role"
      ? getEmbeddedRoleInvitation(item) ??
        fetchedInvitations.find((inv) =>
          isActiveInvitationRequest(inv) &&
          matchesRoleItem(inv, rawId, roleTeamId, getDisplayName(item, "role"))) ??
        null
      : null;
  const openRoleSnapshot =
    type === "team"
      ? resolveTeamOpenRoleSnapshot(
          item,
          rawId != null ? fetchedOpenRoleSnapshots[String(rawId)] : null,
        )
      : null;
  const isOwnProfile =
    type === "user" &&
    rawId != null &&
    viewerUser?.id != null &&
    String(rawId) === String(viewerUser.id);

  return {
    id: `${type}-${rawId ?? getDisplayName(item, type)}`,
    rawId,
    type,
    item,
    lat: mapLat,
    lng: mapLng,
    hasCoordinates,
    isRemote,
    name: getDisplayName(item, type),
    locationLabel,
    countryCode,
    maxDistanceKm: getItemMaxDistanceKm(item),
    distanceKm: shouldUseCityCoordinateFallback ? null : getDistanceValue(item),
    distanceLabel: shouldUseCityCoordinateFallback ? null : getDistanceLabel(item),
    teamName: item.teamName ?? item.team_name ?? item.team?.name ?? null,
    memberCount: type === "team" ? getTeamMemberCount(item) : null,
    maxMembers: type === "team" ? getTeamMaxMembers(item) : null,
    openRoleCount: openRoleSnapshot?.count ?? null,
    openRoleNames: openRoleSnapshot?.names ?? null,
    currentUserRole,
    teamInvitation,
    hasTeamInvitation: Boolean(teamInvitation),
    teamRoleInvitation,
    hasTeamRoleInvitation: Boolean(teamRoleInvitation),
    teamRoleInvitationName: getRequestRoleName(teamRoleInvitation),
    teamApplication,
    hasTeamApplication: Boolean(teamApplication),
    teamRoleApplication,
    hasTeamRoleApplication: Boolean(teamRoleApplication),
    teamRoleApplicationName: getRequestRoleName(teamRoleApplication),
    isCombinedTeamApplication: Boolean(teamRoleApplication) && !(
      teamRoleApplication?.isInternalRoleApplication ||
      teamRoleApplication?.is_internal_role_application
    ),
    isPublic: type === "team" ? getTeamIsPublic(item) : null,
    imageUrl: avatarData.imageUrl,
    initials: avatarData.initials,
    isDemo: isDemoPoint(item, type),
    username: type === "user" ? (item.username ?? null) : null,
    isOwnProfile,
    isPublicProfile: type === "user"
      ? normalizeBooleanFlag(
          firstPresent(
            isOwnProfile
              ? firstPresent(viewerUser?.is_public, viewerUser?.isPublic)
              : undefined,
            item?.is_public,
            item?.isPublic,
          ),
        )
      : null,
    postedAt: type === "role" ? getRolePostedAt(item) : null,
    hasApplied: type === "role" ? (
      getRoleHasApplied(item) ||
      Boolean(roleApplication)
    ) : false,
    roleApplication,
    hasInvitation: type === "role" ? (
      getRoleHasInvitation(item) ||
      Boolean(roleInvitation)
    ) : false,
    roleInvitation,
    isViewerTeamMember:
      type === "role"
        ? getRoleIsViewerTeamMember(item) ||
          (roleTeamId != null && fetchedUserTeamIds.has(String(roleTeamId)))
        : false,
  };
};

const MapBounds = ({ points, proximityCenter = null, proximityRadiusKm = null }) => {
  const map = useMap();

  React.useEffect(() => {
    if (proximityCenter && proximityRadiusKm) {
      const center = L.latLng(proximityCenter.lat, proximityCenter.lng);
      map.fitBounds(center.toBounds(proximityRadiusKm * 2000), {
        padding: [28, 28],
        animate: false,
      });
      return;
    }

    if (!points.length) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12, animate: false });
  }, [map, points, proximityCenter, proximityRadiusKm]);

  return null;
};

const MapInstanceCapture = ({ onReady }) => {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
};

const MarkerTooltipContent = ({ point, showMatchScore = false }) => {
  const meta = TYPE_META[point.type] ?? TYPE_META.team;
  const Icon = meta.Icon;
  const matchTier = showMatchScore
    ? getMatchTier(getResultMatchScore(point.item))
    : null;
  const MatchIcon = matchTier?.Icon ?? null;

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center justify-center gap-1.5">
        <Icon size={13} className="block shrink-0" aria-hidden="true" />
        <span className="font-medium leading-none">{point.name}</span>
        {point.isDemo && (
          <FlaskConical
            size={11}
            strokeWidth={2.25}
            className="block shrink-0"
            aria-hidden="true"
          />
        )}
      </div>
      {MatchIcon && (
        <div className="inline-flex shrink-0 items-center justify-center gap-0.5 font-normal leading-none">
          <MatchIcon
            size={11}
            className={`block ${matchTier.text}`}
            aria-hidden="true"
          />
          <span className="text-black">{matchTier.pct}%</span>
        </div>
      )}
    </div>
  );
};

const PopupAvatar = ({
  point,
  backgroundColor = null,
  showMatchScore = false,
}) => {
  const meta = TYPE_META[point.type] ?? TYPE_META.team;
  const avatarColor = backgroundColor ?? meta.color;
  const matchTier = showMatchScore
    ? getMatchTier(getResultMatchScore(point.item))
    : null;
  const MatchIcon = matchTier?.Icon ?? null;

  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-soft ring-2 ring-white"
      style={{
        backgroundColor: avatarColor,
        "--tw-ring-color": avatarColor,
      }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
        <span>{point.initials}</span>
        {point.imageUrl && (
          <img
            src={point.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ backgroundColor: avatarColor }}
          />
        )}
        {point.isDemo && (
          <DemoAvatarOverlay
            textClassName="text-[6px]"
            textTranslateClassName="-translate-y-[2px]"
          />
        )}
      </span>
      {MatchIcon && (
        <span
          className={`absolute -top-0.5 -left-0.5 z-10 flex h-[14px] w-[14px] items-center justify-center rounded-full text-white ring-2 ring-white ${matchTier.bg}`}
        >
          <MatchIcon size={7} className="text-white" strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
};

const PopupTypeIcon = ({ point }) => {
  const meta = TYPE_META[point.type] ?? TYPE_META.team;
  const Icon = meta.Icon;
  const icon = (
    <Icon
      size={POPUP_SUBLINE_ICON_SIZE}
      strokeWidth={2.25}
      aria-hidden="true"
    />
  );

  return (
    <Tooltip
      content={getTypeTooltipLabel(point.type)}
      wrapperClassName={POPUP_SUBLINE_ICON_CLASS}
    >
      {icon}
    </Tooltip>
  );
};

const PopupDemoIcon = ({ point }) => {
  const icon = (
    <FlaskConical
      size={POPUP_SUBLINE_ICON_SIZE}
      strokeWidth={2.25}
      aria-hidden="true"
    />
  );

  return (
    <Tooltip
      content={getDemoLabel(point.type)}
      wrapperClassName={POPUP_SUBLINE_ICON_CLASS}
    >
      {icon}
    </Tooltip>
  );
};


const EntityMetaLine = ({ point }) => {
  const meta = TYPE_META[point.type] ?? TYPE_META.team;
  const Icon = meta.Icon;

  return (
    <div className="flex items-center gap-0.5 text-[11px] font-medium text-base-content/70">
      <Tooltip
        content={getTypeTooltipLabel(point.type)}
        wrapperClassName={POPUP_SUBLINE_ICON_CLASS}
      >
        <Icon size={POPUP_SUBLINE_ICON_SIZE} strokeWidth={2.25} aria-hidden="true" />
      </Tooltip>
      <span>{meta.label}</span>
      {point.isDemo && (
        <>
          <Tooltip
            content={getDemoLabel(point.type)}
            wrapperClassName={`ml-1.5 overflow-hidden ${POPUP_SUBLINE_ICON_CLASS}`}
          >
            <FlaskConical size={POPUP_SUBLINE_ICON_SIZE} strokeWidth={2.25} aria-hidden="true" />
          </Tooltip>
        </>
      )}
    </div>
  );
};

const LocationIcon = ({ point, size = 13, className = "" }) => {
  if (point.isRemote) return <Globe size={size} className={className} aria-hidden="true" />;
  if (point.locationLabel === LOCATION_NOT_AVAILABLE) {
    return <MapPinX size={size} className={className} aria-hidden="true" />;
  }
  return <MapPin size={size} className={className} aria-hidden="true" />;
};

const getDetailsTooltipLabel = (type) => {
  if (type === "team") return "Click to view team details";
  if (type === "role") return "Click to view role details";
  return "Click to view user details";
};

const getLocationStatusTooltipLabel = (point) => {
  const entityLabel = TYPE_META[point.type]?.label ?? TYPE_META.team.label;
  if (point.isRemote) return `Remote ${entityLabel}`;
  const radiusLabel =
    point.type === "role" && point.maxDistanceKm
      ? `\nwithin ${point.maxDistanceKm} km from Role Location`
      : "";
  if (point.countryCode) {
    return `${entityLabel} in ${point.locationLabel}${radiusLabel}`;
  }
  if (point.locationLabel !== LOCATION_NOT_AVAILABLE) {
    return `${entityLabel} in ${point.locationLabel}${radiusLabel}`;
  }
  return `${entityLabel} without Location info`;
};

const LocationStatusIndicator = ({ point }) => {
  if (point.countryCode && point.locationLabel !== LOCATION_NOT_AVAILABLE && !point.isRemote) {
    return (
      <span className="rounded-full border border-[var(--color-primary-focus)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--color-primary-focus)]">
        {point.countryCode}
      </span>
    );
  }

  return (
    <LocationIcon
      point={point}
      size={14}
      className="text-[var(--color-primary-focus)]"
    />
  );
};

const getPointMatchDetails = (point) =>
  point?.item?.matchDetails ?? point?.item?.match_details ?? null;

const getPointMatchTooltip = (point, matchTier) => {
  const matchDetails = getPointMatchDetails(point);
  const matchType = point?.item?.matchType ?? point?.item?.match_type ?? null;
  const matchLabel = matchType === "role_match" ? "role match" : "match";

  if (
    matchDetails &&
    ((matchDetails.tagScore ?? matchDetails.tag_score) != null ||
      (matchDetails.badgeScore ?? matchDetails.badge_score) != null ||
      (matchDetails.distanceScore ?? matchDetails.distance_score) != null)
  ) {
    const tagPct = Math.round(
      (matchDetails.tagScore ?? matchDetails.tag_score ?? 0) * 100,
    );
    const badgePct = Math.round(
      (matchDetails.badgeScore ?? matchDetails.badge_score ?? 0) * 100,
    );
    const distPct = Math.round(
      (matchDetails.distanceScore ?? matchDetails.distance_score ?? 0) * 100,
    );

    return `${matchTier.pct}% ${matchLabel} — Tags ${tagPct}% · Badges ${badgePct}% · Location ${distPct}%`;
  }

  if (matchDetails) {
    const sharedTags =
      matchDetails.sharedTagCount ?? matchDetails.shared_tag_count ?? 0;
    const sharedBadges =
      matchDetails.sharedBadgeCount ?? matchDetails.shared_badge_count ?? 0;

    if (sharedTags > 0 || sharedBadges > 0) {
      return `${matchTier.pct}% profile match — ${sharedTags} shared tags, ${sharedBadges} shared badges`;
    }
  }

  const fallbackMatchLabel =
    matchType === "role_match"
      ? "role match"
      : point?.type === "role"
        ? "match"
        : "profile match";

  return `${matchTier.pct}% ${fallbackMatchLabel}`;
};

const MatchScoreSublineItem = ({ point, showMatchScore = false }) => {
  if (!showMatchScore) return null;

  const rawScore = getResultMatchScore(point?.item);
  if (rawScore == null) return null;

  const matchTier = getMatchTier(rawScore);
  const MatchIcon = matchTier.Icon;

  return (
    <Tooltip content={getPointMatchTooltip(point, matchTier)}>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-normal leading-none">
        <MatchIcon
          size={POPUP_SUBLINE_ICON_SIZE}
          className={`${matchTier.text} shrink-0`}
          aria-hidden="true"
        />
        <span className="font-normal text-base-content">{matchTier.pct}%</span>
      </span>
    </Tooltip>
  );
};

const TeamMetaItem = ({
  tooltip = null,
  children,
  withTooltip = true,
  onClick = null,
  ariaLabel = null,
}) => {
  const content = onClick ? (
    <button
      type="button"
      aria-label={ariaLabel ?? tooltip ?? "Open details"}
      className="inline-flex items-center gap-0.5 rounded-sm bg-transparent p-0 text-inherit transition-colors hover:text-[var(--color-primary-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  ) : (
    <span className="inline-flex items-center gap-0.5">{children}</span>
  );

  if (!withTooltip || !tooltip) {
    return content;
  }

  return (
    <Tooltip content={tooltip}>
      {content}
    </Tooltip>
  );
};

const TeamRoleIcon = ({ role, size = 13 }) => {
  if (role === "owner") {
    return <Crown size={size} className="text-[var(--color-role-owner-bg)]" aria-hidden="true" />;
  }

  if (role === "admin") {
    return <ShieldCheck size={size} className="text-[var(--color-role-admin-bg)]" aria-hidden="true" />;
  }

  if (role === "member") {
    return <User size={size} className="text-[var(--color-role-member-bg)]" aria-hidden="true" />;
  }

  return null;
};

const getTeamRoleTooltip = (role) => {
  if (role === "owner") return "You are the owner of this team";
  if (role === "admin") return "You are an admin of this team";
  if (role === "member") return "You are a member of this team";
  return null;
};

const TeamMetaLine = ({
  point,
  showMatchScore = false,
  withTooltips = true,
  showRoleRequestNames = true,
  onOpenInvitation = null,
  onOpenApplication = null,
}) => {
  if (point.type !== "team") return null;

  const memberLabel = `${point.memberCount}/${point.maxMembers}`;
  const scoreItem = showMatchScore ? (
    <MatchScoreSublineItem
      point={point}
      showMatchScore={showMatchScore}
    />
  ) : null;
  const roleTooltip = getTeamRoleTooltip(point.currentUserRole);
  const roleInvitationTooltip = point.teamRoleInvitationName
    ? `You were invited to fill ${point.teamRoleInvitationName} in this team`
    : "You were invited to fill a role in this team";
  const roleApplicationTooltip = point.teamRoleApplicationName
    ? `You applied for ${point.teamRoleApplicationName} in this team`
    : "You applied for a role within this team";
  const roleNameItem = (roleName) => {
    if (!roleName || !withTooltips) return null;

    return (
      <Tooltip
        content={roleName}
        wrapperClassName="inline-flex min-w-0 max-w-[8rem] overflow-hidden"
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden">
          <UserSearch size={10} className="shrink-0 text-orange-500" aria-hidden="true" />
          <span className="truncate">{roleName}</span>
        </span>
      </Tooltip>
    );
  };

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-normal text-base-content/60">
      {scoreItem}
      <TeamMetaItem
        tooltip={
          point.currentUserRole
            ? `You are a member of this team with ${point.memberCount} / ${point.maxMembers} members`
            : `${point.memberCount} of ${point.maxMembers} members`
        }
        withTooltip={withTooltips}
      >
        <Users size={10} className={point.currentUserRole ? "text-success" : ""} aria-hidden="true" />
        <span>{memberLabel}</span>
      </TeamMetaItem>
      {point.hasTeamInvitation && (
        <TeamMetaItem
          tooltip="You were invited to this team"
          withTooltip={withTooltips}
          onClick={point.teamInvitation && onOpenInvitation
            ? () => onOpenInvitation(point.teamInvitation)
            : null}
          ariaLabel="Open team invitation details"
        >
          <Mail size={10} className="text-pink-500" aria-hidden="true" />
        </TeamMetaItem>
      )}
      {point.hasTeamRoleInvitation && (
        <TeamMetaItem
          tooltip={roleInvitationTooltip}
          withTooltip={withTooltips}
          onClick={point.teamRoleInvitation && onOpenInvitation
            ? () => onOpenInvitation(point.teamRoleInvitation)
            : null}
          ariaLabel="Open role invitation details"
        >
          <Mail size={10} className="text-orange-500" aria-hidden="true" />
        </TeamMetaItem>
      )}
      {showRoleRequestNames && roleNameItem(point.teamRoleInvitationName)}
      {point.hasTeamApplication && (
        <TeamMetaItem
          tooltip="You applied to join this team"
          withTooltip={withTooltips}
          onClick={point.teamApplication && onOpenApplication
            ? () => onOpenApplication(point.teamApplication)
            : null}
          ariaLabel="Open team application details"
        >
          <SendHorizontal size={10} className="text-info" aria-hidden="true" />
        </TeamMetaItem>
      )}
      {point.hasTeamRoleApplication && (
        <TeamMetaItem
          tooltip={point.isCombinedTeamApplication ? "You applied to join this team and fill a role" : roleApplicationTooltip}
          withTooltip={withTooltips}
          onClick={point.teamRoleApplication && onOpenApplication
            ? () => onOpenApplication(point.teamRoleApplication)
            : null}
          ariaLabel="Open role application details"
        >
          <SendHorizontal size={10} className={point.isCombinedTeamApplication ? "text-violet-500" : "text-orange-500"} aria-hidden="true" />
        </TeamMetaItem>
      )}
      {showRoleRequestNames && roleNameItem(point.teamRoleApplicationName)}
      {point.openRoleCount > 0 && (
        <TeamMetaItem
          tooltip={`${point.openRoleCount} open ${point.openRoleCount === 1 ? "role" : "roles"} posted in this team`}
          withTooltip={withTooltips}
        >
          <UserSearch size={10} className="text-orange-500" aria-hidden="true" />
          <span>{point.openRoleCount}</span>
        </TeamMetaItem>
      )}
      {point.currentUserRole && (
        <TeamMetaItem tooltip={roleTooltip} withTooltip={withTooltips}>
          <TeamRoleIcon role={point.currentUserRole} size={10} />
        </TeamMetaItem>
      )}
      {point.currentUserRole && (
        <TeamMetaItem
          tooltip={
            point.isPublic
              ? "Public Team - visible for everyone"
              : "Private Team - only visible for Members"
          }
          withTooltip={withTooltips}
        >
          {point.isPublic ? (
            <EyeIcon size={10} className="text-green-600" aria-hidden="true" />
          ) : (
            <EyeClosed size={10} className="text-gray-500" aria-hidden="true" />
          )}
        </TeamMetaItem>
      )}
    </div>
  );
};

const UserSubline = ({ point, showMatchScore = false }) => {
  if (point.type !== "user") return null;

  const scoreItem = showMatchScore ? (
    <MatchScoreSublineItem
      point={point}
      showMatchScore={showMatchScore}
    />
  ) : null;

  if (!point.username && !point.isOwnProfile && !scoreItem) return null;

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-normal text-base-content/60">
      {scoreItem}
      {point.username && <span>@{point.username}</span>}
      {point.isOwnProfile && (
        <Tooltip content={point.isPublicProfile ? "Public Profile - visible for everyone" : "Private Profile - only visible for you"}>
          <span className="inline-flex">
            {point.isPublicProfile
              ? <EyeIcon size={10} className="text-green-600" aria-hidden="true" />
              : <EyeClosed size={10} className="text-gray-500" aria-hidden="true" />
            }
          </span>
        </Tooltip>
      )}
    </div>
  );
};

const RoleSubline = ({
  point,
  showMatchScore = false,
  onOpenInvitation = null,
  onOpenApplication = null,
  teamOnly = false,
}) => {
  if (point.type !== "role") return null;

  const postedDate = point.postedAt ? new Date(point.postedAt) : null;
  const isValidDate = postedDate && !isNaN(postedDate);
  const scoreItem = showMatchScore ? (
    <MatchScoreSublineItem
      point={point}
      showMatchScore={showMatchScore}
    />
  ) : null;
  const statusIcon = ({ children, onClick, ariaLabel }) => {
    if (!onClick) {
      return <span className="inline-flex">{children}</span>;
    }

    return (
      <button
        type="button"
        aria-label={ariaLabel}
        className="inline-flex rounded-sm bg-transparent p-0 text-inherit transition-colors hover:text-[var(--color-primary-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {children}
      </button>
    );
  };

  if (teamOnly) {
    if (!scoreItem && !point.isViewerTeamMember && !isValidDate && !point.hasInvitation && !point.hasApplied) return null;

    return (
      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-normal text-base-content/60">
        {scoreItem}
        {isValidDate && (
          <Tooltip content={`Posted ${format(postedDate, "MMM d, yyyy")}`}>
            <span className="inline-flex items-center gap-1">
              <Calendar size={10} aria-hidden="true" />
              <span>{format(postedDate, "MM/dd/yy")}</span>
            </span>
          </Tooltip>
        )}
        {point.teamName && point.isViewerTeamMember && (
          <Tooltip
            content={`You are a member of this team: ${point.teamName}`}
          >
            <span className="inline-flex items-center">
              <Users
                size={10}
                className="shrink-0 text-success"
                aria-hidden="true"
              />
            </span>
          </Tooltip>
        )}
        {point.hasInvitation && (
          <Tooltip content="You were invited to fill this role">
            {statusIcon({
              ariaLabel: "Open role invitation details",
              onClick: point.roleInvitation && onOpenInvitation
                ? () => onOpenInvitation(point.roleInvitation)
                : null,
              children: <Mail size={10} className="text-orange-500" aria-hidden="true" />,
            })}
          </Tooltip>
        )}
        {point.hasApplied && (
          <Tooltip content="You applied for this role">
            {statusIcon({
              ariaLabel: "Open role application details",
              onClick: point.roleApplication && onOpenApplication
                ? () => onOpenApplication(point.roleApplication)
                : null,
              children: <SendHorizontal size={10} className="text-orange-500" aria-hidden="true" />,
            })}
          </Tooltip>
        )}
      </div>
    );
  }

  if (!scoreItem && !isValidDate && !point.hasApplied && !point.hasInvitation && !point.teamName) return null;

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-normal text-base-content/60">
      {scoreItem}
      {isValidDate && (
        <Tooltip content={`Posted ${format(postedDate, "MMM d, yyyy")}`}>
          <span className="inline-flex items-center gap-1">
            <Calendar size={10} aria-hidden="true" />
            <span>{format(postedDate, "MM/dd/yy")}</span>
          </span>
        </Tooltip>
      )}
      {point.hasInvitation && (
        <Tooltip content="You were invited to fill this role">
          {statusIcon({
            ariaLabel: "Open role invitation details",
            onClick: point.roleInvitation && onOpenInvitation
              ? () => onOpenInvitation(point.roleInvitation)
              : null,
            children: <Mail size={10} className="text-orange-500" aria-hidden="true" />,
          })}
        </Tooltip>
      )}
      {point.hasApplied && (
        <Tooltip content="You applied for this role">
          {statusIcon({
            ariaLabel: "Open role application details",
            onClick: point.roleApplication && onOpenApplication
              ? () => onOpenApplication(point.roleApplication)
              : null,
            children: <SendHorizontal size={10} className="text-orange-500" aria-hidden="true" />,
          })}
        </Tooltip>
      )}
      {point.teamName && (
        <Tooltip
          content={
            point.isViewerTeamMember
              ? `You are a member of this team: ${point.teamName}`
              : point.teamName
          }
          wrapperClassName="inline-flex min-w-0 max-w-[9rem] overflow-hidden"
        >
          <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden">
            <Users
              size={10}
              className={`shrink-0 ${point.isViewerTeamMember ? "text-success" : ""}`}
              aria-hidden="true"
            />
            <span className="truncate">{point.teamName}</span>
          </span>
        </Tooltip>
      )}
    </div>
  );
};

const formatRoleNamesSummary = (names, max = 2) => {
  if (!Array.isArray(names) || names.length === 0) return null;
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
};

const TeamOpenRoleNamesLine = ({ point }) => {
  if (point.type !== "team") return null;

  const summary = formatRoleNamesSummary(point.openRoleNames);
  if (!summary) return null;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <UserSearch size={13} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{summary}</span>
    </div>
  );
};

const MapPopupCard = ({
  point,
  showMatchScore = false,
  onOpenPoint,
  onOpenInvitation,
  onOpenApplication,
  onClose,
}) => {
  return (
    <div className="max-w-full align-top">
      <div className="mb-2 flex items-center justify-between text-base-content/70">
        <EntityMetaLine point={point} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-2 flex items-center justify-center text-base-content/40 hover:text-base-content/70"
        >
          <X size={10} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <PopupAvatar point={point} backgroundColor={DEFAULT_MAP_ENTITY_COLOR} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-medium leading-[1.1] text-[var(--color-primary-focus)]">
            {point.name}
          </h3>
          <UserSubline point={point} showMatchScore={showMatchScore} />
          <TeamMetaLine
            point={point}
            showMatchScore={showMatchScore}
            showRoleRequestNames={false}
            onOpenInvitation={onOpenInvitation}
            onOpenApplication={onOpenApplication}
          />
          <RoleSubline
            point={point}
            showMatchScore={showMatchScore}
            onOpenInvitation={onOpenInvitation}
            onOpenApplication={onOpenApplication}
            teamOnly
          />
        </div>
      </div>

      <div className="mt-3 space-y-0.5 text-xs text-base-content/70">
        {point.teamName && point.type === "role" && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Users size={13} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{point.teamName}</span>
          </div>
        )}
        {point.teamName && point.type !== "role" && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Users size={13} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{point.teamName}</span>
          </div>
        )}
        <TeamOpenRoleNamesLine point={point} />
        <div className="flex min-w-0 items-center gap-1.5">
          <LocationIcon point={point} />
          <span className="min-w-0 flex-1 truncate">{point.locationLabel}</span>
        </div>
        {point.distanceLabel && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Ruler size={13} />
            <span className="min-w-0 flex-1 truncate">{point.distanceLabel}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpenPoint(point)}
        className="btn btn-xs mt-3 min-h-0 rounded-full border-[var(--color-primary)] bg-transparent px-3 text-[11px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
      >
        View details
      </button>
    </div>
  );
};

const SearchMapView = ({
  items = [],
  searchType = "all",
  roleMatchTagIds = null,
  roleMatchBadgeNames = null,
  roleMatchName = null,
  roleMatchMaxDistanceKm = null,
  invitationPrefillTeamId = null,
  invitationPrefillRoleId = null,
  invitationPrefillTeamName = null,
  invitationPrefillRoleName = null,
  showMatchHighlights = false,
  showMatchScore = false,
  viewerLocation = null,
  proximityRadiusKm = null,
}) => {
  const showToast = useToast();
  const teamModal = useTeamModalSafe();
  const userModal = useUserModalSafe();
  const authContext = useAuth();
  const authUserId = authContext?.user?.id ?? null;
  const [selectedRolePoint, setSelectedRolePoint] = useState(null);
  const [activeStatusTooltipPointId, setActiveStatusTooltipPointId] = useState(null);
  const {
    data: viewerPendingRequests,
    refetch: refetchViewerPendingRequests,
  } = useViewerPendingRequests(authUserId, { enabled: Boolean(authUserId) });
  const {
    teamIdSet: fetchedUserTeamIds,
    teamRoles: fetchedTeamRoles,
    refetch: refetchViewerTeamMemberships,
  } = useViewerTeamMemberships(authUserId, { enabled: Boolean(authUserId) });
  const fetchedApplications = viewerPendingRequests?.applications ?? [];
  const fetchedInvitations = viewerPendingRequests?.invitations ?? [];
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [activePopupPointId, setActivePopupPointId] = useState(null);
  const [activeMarkerTooltipPointId, setActiveMarkerTooltipPointId] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState(null);
  const [popupCoords, setPopupCoords] = useState(null);
  const [popupPlacement, setPopupPlacement] = useState("top");
  const [markerTooltipAnchor, setMarkerTooltipAnchor] = useState(null);
  const [markerTooltipCoords, setMarkerTooltipCoords] = useState(null);
  const [markerTooltipPlacement, setMarkerTooltipPlacement] = useState("top");
  const [userLocationDetailsById, setUserLocationDetailsById] = useState({});
  const popupRef = useRef(null);
  const markerTooltipRef = useRef(null);

  const refreshUserStatusData = useCallback(async () => {
    await Promise.all([
      refetchViewerPendingRequests(),
      refetchViewerTeamMemberships(),
    ]);
  }, [refetchViewerPendingRequests, refetchViewerTeamMemberships]);

  const openInvitationDetails = useCallback((invitation) => {
    if (!invitation) return;
    setSelectedInvitation(invitation);
  }, []);

  const openApplicationDetails = useCallback((application) => {
    if (!application) return;
    setSelectedApplication(application);
  }, []);

  const handleInvitationAccept = useCallback(async (
    invitationId,
    responseMessage = "",
    fillRole = false,
    options = {},
  ) => {
    await teamService.respondToInvitation(
      invitationId,
      "accept",
      responseMessage,
      fillRole,
      options,
    );
    await refreshUserStatusData();
    setSelectedInvitation(null);
  }, [refreshUserStatusData]);

  const handleInvitationDecline = useCallback(async (
    invitationId,
    responseMessage = "",
  ) => {
    await teamService.respondToInvitation(
      invitationId,
      "decline",
      responseMessage,
    );
    await refreshUserStatusData();
    setSelectedInvitation(null);
  }, [refreshUserStatusData]);

  const handleApplicationCancel = useCallback(async (applicationId) => {
    await teamService.cancelApplication(applicationId);
    await refreshUserStatusData();
    setSelectedApplication(null);
  }, [refreshUserStatusData]);

  const handleApplicationReminder = useCallback(async () => {
    showToast("Reminder feature coming soon!", "violet");
  }, [showToast]);

  const itemsWithUserLocationDetails = useMemo(
    () =>
      items.map((item) => {
        if (getMapPointType(item) !== "user") return item;

        const userId = getUserItemId(item);
        const details =
          userId != null ? userLocationDetailsById[String(userId)] : null;

        return details ? mergeUserLocationDetails(item, details) : item;
      }),
    [items, userLocationDetailsById],
  );

  const teamIdsNeedingOpenRoleFetch = useMemo(() => {
    const ids = [];
    const seenIds = new Set();

    itemsWithUserLocationDetails.forEach((item) => {
      if (getMapPointType(item) !== "team") return;

      const teamId = getTeamItemId(item);
      if (teamId == null) return;
      if (resolveTeamOpenRoleSnapshot(item).source !== "aggregate") return;

      const key = String(teamId);
      if (seenIds.has(key)) return;

      seenIds.add(key);
      ids.push(teamId);
    });

    return ids;
  }, [itemsWithUserLocationDetails]);

  const openRoleQueries = useQueries({
    queries: teamIdsNeedingOpenRoleFetch.map((teamId) => ({
      queryKey: ["team-open-roles", teamId],
      queryFn: async () => {
        const response = await vacantRoleService.getVacantRoles(teamId, "open");
        const roles = extractArrayPayload(response).filter(isOpenRole);

        return {
          count: roles.length,
          names: roles.map(getRoleDisplayName).filter(Boolean),
        };
      },
      staleTime: 30_000,
    })),
  });

  const openRoleQuerySignature = openRoleQueries
    .map(
      (query) =>
        `${query.status}:${query.dataUpdatedAt ?? 0}:${query.errorUpdatedAt ?? 0}`,
    )
    .join("|");

  const fetchedOpenRoleSnapshots = useMemo(() => {
    const snapshots = {};

    teamIdsNeedingOpenRoleFetch.forEach((teamId, index) => {
      const query = openRoleQueries[index];
      if (!query?.isSuccess) return;

      snapshots[String(teamId)] = query.data;
    });

    return snapshots;
  }, [teamIdsNeedingOpenRoleFetch, openRoleQueries, openRoleQuerySignature]);

  const normalizedPoints = useMemo(
    () =>
      itemsWithUserLocationDetails
        .map((item) =>
          normalizeMapPoint(
            item,
            { id: authUserId },
            fetchedTeamRoles,
            fetchedApplications,
            fetchedInvitations,
            fetchedUserTeamIds,
            fetchedOpenRoleSnapshots,
          ))
        .filter(Boolean),
    [
      authUserId,
      fetchedTeamRoles,
      fetchedApplications,
      fetchedInvitations,
      fetchedUserTeamIds,
      fetchedOpenRoleSnapshots,
      itemsWithUserLocationDetails,
    ],
  );

  const userIdsNeedingLocationDetails = useMemo(() => {
    const ids = [];
    const seenIds = new Set();

    normalizedPoints.forEach((point) => {
      if (point.type !== "user" || point.hasCoordinates || point.isRemote || point.rawId == null) {
        return;
      }

      const userId = String(point.rawId);
      if (seenIds.has(userId)) return;
      if (Object.prototype.hasOwnProperty.call(userLocationDetailsById, userId)) return;

      seenIds.add(userId);
      ids.push(userId);
    });

    return ids;
  }, [normalizedPoints, userLocationDetailsById]);
  const userLocationDetailQueries = useQueries({
    queries: userIdsNeedingLocationDetails.map((userId) => ({
      queryKey: userProfileQueryKey(userId),
      queryFn: () => fetchUserProfile(userId),
      staleTime: 30_000,
    })),
  });
  const userLocationDetailQuerySignature = userLocationDetailQueries
    .map(
      (query) =>
        `${query.status}:${query.dataUpdatedAt ?? 0}:${query.errorUpdatedAt ?? 0}`,
    )
    .join("|");

  useEffect(() => {
    if (userIdsNeedingLocationDetails.length === 0) return;

    const entries = userIdsNeedingLocationDetails
      .map((userId, index) => {
        const query = userLocationDetailQueries[index];
        if (query?.isSuccess) return [userId, query.data ?? null];
        if (query?.isError) return [userId, null];
        return null;
      })
      .filter(Boolean);

    if (entries.length === 0) return;

    setUserLocationDetailsById((previousDetails) => {
      const nextDetails = { ...previousDetails };
      entries.forEach(([userId, details]) => {
        if (!Object.prototype.hasOwnProperty.call(nextDetails, userId)) {
          nextDetails[userId] = details;
        }
      });
      return nextDetails;
    });
  }, [
    userIdsNeedingLocationDetails,
    userLocationDetailQueries,
    userLocationDetailQuerySignature,
  ]);

  const markerPoints = useMemo(
    () => normalizedPoints.filter((point) => point.hasCoordinates),
    [normalizedPoints],
  );
  const fallbackPoints = useMemo(
    () => normalizedPoints.filter((point) => !point.hasCoordinates),
    [normalizedPoints],
  );
  const activePoint = useMemo(
    () =>
      markerPoints.find((point) => point.id === activePopupPointId) ?? null,
    [activePopupPointId, markerPoints],
  );
  const activeMarkerTooltipPoint = useMemo(
    () =>
      markerPoints.find((point) => point.id === activeMarkerTooltipPointId) ??
      null,
    [activeMarkerTooltipPointId, markerPoints],
  );
  const activePointId = activePoint?.id ?? null;
  const activePointLat = activePoint?.lat ?? null;
  const activePointLng = activePoint?.lng ?? null;
  const activeMarkerTooltipPointIdResolved = activeMarkerTooltipPoint?.id ?? null;
  const activeMarkerTooltipPointLat = activeMarkerTooltipPoint?.lat ?? null;
  const activeMarkerTooltipPointLng = activeMarkerTooltipPoint?.lng ?? null;
  const closeActivePopup = useCallback(() => {
    setActivePopupPointId(null);
    setPopupAnchor(null);
    setPopupCoords(null);
    setPopupPlacement("top");
  }, []);
  const closeMarkerTooltip = useCallback(() => {
    setActiveMarkerTooltipPointId(null);
    setMarkerTooltipAnchor(null);
    setMarkerTooltipCoords(null);
    setMarkerTooltipPlacement("top");
  }, []);

  useEffect(() => {
    if (activePopupPointId && !activePoint) {
      closeActivePopup();
    }
  }, [activePopupPointId, activePoint, closeActivePopup]);

  useEffect(() => {
    if (activeMarkerTooltipPointId && !activeMarkerTooltipPoint) {
      closeMarkerTooltip();
    }
  }, [
    activeMarkerTooltipPointId,
    activeMarkerTooltipPoint,
    closeMarkerTooltip,
  ]);

  useEffect(() => {
    if (!mapInstance || activePointLat === null || activePointLng === null) {
      setPopupAnchor(null);
      setPopupCoords(null);
      return undefined;
    }

    setPopupCoords(null);

    const updatePopupAnchor = () => {
      const latLng = L.latLng(activePointLat, activePointLng);

      if (!mapInstance.getBounds().contains(latLng)) {
        closeActivePopup();
        return;
      }

      const containerPoint = mapInstance.latLngToContainerPoint(latLng);
      const mapRect = mapInstance.getContainer().getBoundingClientRect();
      const nextAnchor = {
        x: mapRect.left + containerPoint.x,
        y: mapRect.top + containerPoint.y,
      };

      setPopupAnchor((previousAnchor) =>
        previousAnchor?.x === nextAnchor.x && previousAnchor?.y === nextAnchor.y
          ? previousAnchor
          : nextAnchor,
      );
    };

    updatePopupAnchor();
    mapInstance.on("move", updatePopupAnchor);
    mapInstance.on("zoom", updatePopupAnchor);
    mapInstance.on("zoomend", updatePopupAnchor);
    window.addEventListener("resize", updatePopupAnchor);

    return () => {
      mapInstance.off("move", updatePopupAnchor);
      mapInstance.off("zoom", updatePopupAnchor);
      mapInstance.off("zoomend", updatePopupAnchor);
      window.removeEventListener("resize", updatePopupAnchor);
    };
  }, [mapInstance, activePointId, activePointLat, activePointLng, closeActivePopup]);

  useEffect(() => {
    if (
      !mapInstance ||
      activeMarkerTooltipPointLat === null ||
      activeMarkerTooltipPointLng === null
    ) {
      setMarkerTooltipAnchor(null);
      setMarkerTooltipCoords(null);
      return undefined;
    }

    setMarkerTooltipCoords(null);

    const updateMarkerTooltipAnchor = () => {
      const latLng = L.latLng(
        activeMarkerTooltipPointLat,
        activeMarkerTooltipPointLng,
      );

      if (!mapInstance.getBounds().contains(latLng)) {
        closeMarkerTooltip();
        return;
      }

      const containerPoint = mapInstance.latLngToContainerPoint(latLng);
      const mapRect = mapInstance.getContainer().getBoundingClientRect();
      const nextAnchor = {
        x: mapRect.left + containerPoint.x,
        y: mapRect.top + containerPoint.y,
      };

      setMarkerTooltipAnchor((previousAnchor) =>
        previousAnchor?.x === nextAnchor.x &&
        previousAnchor?.y === nextAnchor.y
          ? previousAnchor
          : nextAnchor,
      );
    };

    updateMarkerTooltipAnchor();
    mapInstance.on("move", updateMarkerTooltipAnchor);
    mapInstance.on("zoom", updateMarkerTooltipAnchor);
    mapInstance.on("zoomend", updateMarkerTooltipAnchor);
    window.addEventListener("resize", updateMarkerTooltipAnchor);

    return () => {
      mapInstance.off("move", updateMarkerTooltipAnchor);
      mapInstance.off("zoom", updateMarkerTooltipAnchor);
      mapInstance.off("zoomend", updateMarkerTooltipAnchor);
      window.removeEventListener("resize", updateMarkerTooltipAnchor);
    };
  }, [
    mapInstance,
    activeMarkerTooltipPointIdResolved,
    activeMarkerTooltipPointLat,
    activeMarkerTooltipPointLng,
    closeMarkerTooltip,
  ]);

  const calculatePopupPosition = useCallback(() => {
    if (!popupAnchor || !popupRef.current) return;

    const popupRect = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = popupRect.width || MAP_POPUP_MAX_WIDTH;
    const popupHeight = popupRect.height;

    let placement = "top";
    let top =
      popupAnchor.y -
      MAP_MARKER_HALF_HEIGHT -
      popupHeight -
      MAP_POPUP_GAP;
    let left = popupAnchor.x - popupWidth / 2;

    if (top < MAP_POPUP_VIEWPORT_PADDING) {
      placement = "bottom";
      top = popupAnchor.y + MAP_MARKER_HALF_HEIGHT + MAP_POPUP_GAP;
    }

    const maxLeft = Math.max(
      MAP_POPUP_VIEWPORT_PADDING,
      viewportWidth - popupWidth - MAP_POPUP_VIEWPORT_PADDING,
    );
    const maxTop = Math.max(
      MAP_POPUP_VIEWPORT_PADDING,
      viewportHeight - popupHeight - MAP_POPUP_VIEWPORT_PADDING,
    );

    left = Math.max(MAP_POPUP_VIEWPORT_PADDING, Math.min(left, maxLeft));
    top = Math.max(MAP_POPUP_VIEWPORT_PADDING, Math.min(top, maxTop));

    setPopupPlacement((previousPlacement) =>
      previousPlacement === placement ? previousPlacement : placement,
    );
    setPopupCoords((previousCoords) =>
      previousCoords?.top === top &&
      previousCoords?.left === left &&
      previousCoords?.width === popupWidth
        ? previousCoords
        : { top, left, width: popupWidth },
    );
  }, [popupAnchor]);

  const calculateMarkerTooltipPosition = useCallback(() => {
    if (!markerTooltipAnchor || !markerTooltipRef.current) return;

    const tooltipRect = markerTooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;

    let placement = "top";
    let top =
      markerTooltipAnchor.y -
      MAP_MARKER_HALF_HEIGHT -
      tooltipHeight -
      MAP_MARKER_TOOLTIP_GAP;
    let left = markerTooltipAnchor.x - tooltipWidth / 2;

    if (top < MAP_POPUP_VIEWPORT_PADDING) {
      placement = "bottom";
      top =
        markerTooltipAnchor.y +
        MAP_MARKER_HALF_HEIGHT +
        MAP_MARKER_TOOLTIP_GAP;
    }

    const maxLeft = Math.max(
      MAP_POPUP_VIEWPORT_PADDING,
      viewportWidth - tooltipWidth - MAP_POPUP_VIEWPORT_PADDING,
    );
    const maxTop = Math.max(
      MAP_POPUP_VIEWPORT_PADDING,
      viewportHeight - tooltipHeight - MAP_POPUP_VIEWPORT_PADDING,
    );

    left = Math.max(MAP_POPUP_VIEWPORT_PADDING, Math.min(left, maxLeft));
    top = Math.max(MAP_POPUP_VIEWPORT_PADDING, Math.min(top, maxTop));

    setMarkerTooltipPlacement((previousPlacement) =>
      previousPlacement === placement ? previousPlacement : placement,
    );
    setMarkerTooltipCoords((previousCoords) =>
      previousCoords?.top === top &&
      previousCoords?.left === left &&
      previousCoords?.width === tooltipWidth
        ? previousCoords
        : { top, left, width: tooltipWidth },
    );
  }, [markerTooltipAnchor]);

  useLayoutEffect(() => {
    if (!activePopupPointId || !popupAnchor) return;
    calculatePopupPosition();
  }, [activePopupPointId, popupAnchor, calculatePopupPosition]);

  useLayoutEffect(() => {
    if (!activeMarkerTooltipPointId || !markerTooltipAnchor) return;
    calculateMarkerTooltipPosition();
  }, [
    activeMarkerTooltipPointId,
    markerTooltipAnchor,
    calculateMarkerTooltipPosition,
  ]);

  useEffect(() => {
    if (!activePopupPointId || !popupAnchor) return undefined;

    let frameId = null;
    const recalculateOnResize = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(calculatePopupPosition);
    };

    window.addEventListener("resize", recalculateOnResize);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", recalculateOnResize);
    };
  }, [activePopupPointId, popupAnchor, calculatePopupPosition]);

  useEffect(() => {
    if (!activeMarkerTooltipPointId || !markerTooltipAnchor) return undefined;

    let frameId = null;
    const recalculateOnResize = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(calculateMarkerTooltipPosition);
    };

    window.addEventListener("resize", recalculateOnResize);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", recalculateOnResize);
    };
  }, [
    activeMarkerTooltipPointId,
    markerTooltipAnchor,
    calculateMarkerTooltipPosition,
  ]);

  useEffect(() => {
    if (!activePopupPointId) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeActivePopup();
    };
    const closeOnOutsideMouseDown = (event) => {
      if (popupRef.current?.contains(event.target)) return;
      if (event.target.closest?.(".leaflet-marker-icon")) return;
      if (mapInstance?.getContainer().contains(event.target)) return;

      closeActivePopup();
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("mousedown", closeOnOutsideMouseDown);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("mousedown", closeOnOutsideMouseDown);
    };
  }, [activePopupPointId, closeActivePopup, mapInstance]);

  useEffect(() => {
    if (!mapInstance) return undefined;

    const closeOnMapClick = () => closeActivePopup();
    mapInstance.on("click", closeOnMapClick);

    return () => {
      mapInstance.off("click", closeOnMapClick);
    };
  }, [mapInstance, closeActivePopup]);

  const proximityCenter = getLatLng(viewerLocation);
  const activeProximityRadiusKm = toNumber(proximityRadiusKm);
  const shouldFitProximity =
    proximityCenter &&
    activeProximityRadiusKm !== null &&
    activeProximityRadiusKm > 0;
  const initialCenter =
    shouldFitProximity
      ? [proximityCenter.lat, proximityCenter.lng]
      : markerPoints.length > 0
        ? [markerPoints[0].lat, markerPoints[0].lng]
        : DEFAULT_CENTER;
  const popupArrowLeft = popupCoords?.width && popupAnchor
    ? Math.max(
        MAP_POPUP_ARROW_EDGE_PADDING,
        Math.min(
          popupAnchor.x - popupCoords.left,
          popupCoords.width - MAP_POPUP_ARROW_EDGE_PADDING,
        ),
      )
    : null;
  const markerTooltipArrowLeft = markerTooltipCoords?.width && markerTooltipAnchor
    ? Math.max(
        MAP_POPUP_ARROW_EDGE_PADDING,
        Math.min(
          markerTooltipAnchor.x - markerTooltipCoords.left,
          markerTooltipCoords.width - MAP_POPUP_ARROW_EDGE_PADDING,
        ),
      )
    : null;

  const openPoint = (point) => {
    if (point.type === "team") {
      teamModal?.openTeamModal(point.rawId, point.name, {
        initialTeamData: point.item,
        isFromSearch: true,
        showMatchHighlights,
        matchScore: showMatchScore ? getResultMatchScore(point.item) : null,
        matchType: point.item.matchType ?? point.item.match_type ?? null,
        matchDetails: point.item.matchDetails ?? point.item.match_details ?? null,
      });
      return;
    }

    if (point.type === "user") {
      userModal?.openUserModal(point.rawId, {
        roleMatchTagIds,
        roleMatchBadgeNames,
        roleMatchName,
        roleMatchMaxDistanceKm,
        isFromSearch: true,
        showMatchHighlights,
        matchScore: showMatchScore ? getResultMatchScore(point.item) : null,
        matchType: point.item.matchType ?? point.item.match_type ?? null,
        matchDetails: point.item.matchDetails ?? point.item.match_details ?? null,
        distanceKm: point.distanceKm,
        invitationPrefillTeamId,
        invitationPrefillRoleId,
        invitationPrefillTeamName,
        invitationPrefillRoleName,
      });
      return;
    }
    setSelectedRolePoint(point);
  };

  const selectedRolePointForModal = selectedRolePoint
    ? normalizedPoints.find((point) => point.id === selectedRolePoint.id) ??
      selectedRolePoint
    : null;

  const asideRef = useRef(null);
  const [asideAtFullHeight, setAsideAtFullHeight] = useState(false);
  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const parent = el.parentElement;
    const check = () => {
      if (!parent) return;
      setAsideAtFullHeight(el.offsetHeight >= parent.clientHeight - 2);
    };
    const observer = new ResizeObserver(check);
    observer.observe(el);
    if (parent) observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-base-200 bg-base-100/80 shadow-soft">
        <div className="relative min-h-[360px] lg:min-h-[520px]">
          <div className="relative min-h-[360px]">
            {markerPoints.length === 0 && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-[500] w-[min(calc(100%-2rem),26rem)] -translate-x-1/2 rounded-lg border border-base-200 bg-white/90 px-4 py-2 text-center text-sm text-base-content/70 shadow-soft backdrop-blur-sm">
                No visible results on this page include map coordinates yet.
              </div>
            )}
            <MapContainer
              center={initialCenter}
              zoom={markerPoints.length > 0 ? 6 : 5}
              scrollWheelZoom={false}
              maxBounds={[[-90, -180], [90, 180]]}
              maxBoundsViscosity={1}
              className="h-[360px] w-full lg:h-[520px]"
              attributionControl={false}
            >
              <AttributionControl position="bottomleft" />
              <MapInstanceCapture onReady={setMapInstance} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                noWrap={true}
              />
              <MapBounds
                points={markerPoints}
                proximityCenter={shouldFitProximity ? proximityCenter : null}
                proximityRadiusKm={
                  shouldFitProximity ? activeProximityRadiusKm : null
                }
              />
              {shouldFitProximity && (
                <Circle
                  center={[proximityCenter.lat, proximityCenter.lng]}
                  radius={activeProximityRadiusKm * 1000}
                  pathOptions={{
                    color: "var(--color-primary)",
                    fillColor: "var(--color-primary)",
                    fillOpacity: 0.08,
                    opacity: 0.35,
                    weight: 1.5,
                  }}
                />
              )}
              {markerPoints.map((point) => (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={buildMarkerIcon(point, searchType, showMatchScore)}
                  bubblingMouseEvents={false}
                  eventHandlers={{
                    click: (event) => {
                      event.originalEvent?.stopPropagation?.();
                      closeMarkerTooltip();
                      setPopupCoords(null);
                      setPopupPlacement("top");
                      setActivePopupPointId(point.id);
                    },
                    mouseover: () => {
                      setActiveMarkerTooltipPointId(point.id);
                    },
                    mouseout: () => {
                      closeMarkerTooltip();
                    },
                    focus: () => {
                      setActiveMarkerTooltipPointId(point.id);
                    },
                    blur: () => {
                      closeMarkerTooltip();
                    },
                  }}
                />
              ))}
            </MapContainer>
          </div>

          <aside ref={asideRef} className={`flex flex-col border-t border-base-200 bg-base-100/75 p-4 lg:absolute lg:right-0 lg:top-0 lg:z-[500] lg:max-h-[520px] lg:w-[260px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:bg-white/70 lg:backdrop-blur-sm${!asideAtFullHeight ? " lg:rounded-bl-xl" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-base-content">Mapped results</h3>
              <span className="text-xs text-base-content/60">
                {markerPoints.length}/{normalizedPoints.length}
              </span>
            </div>

            {searchType === "all" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <span key={type} className="inline-flex items-center gap-1.5 text-xs text-base-content/70">
                    <span
                      className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden="true"
                    >
                      <meta.Icon size={10} strokeWidth={2.25} className="block text-white" />
                    </span>
                    {meta.label}
                  </span>
                ))}
              </div>
            )}

            {fallbackPoints.length > 0 && (
              <div className="mt-5 flex min-h-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-base-content">
                    Remote or unmapped
                  </h4>
                  <span className="text-xs text-base-content/60">
                    {fallbackPoints.length}/{normalizedPoints.length}
                  </span>
                </div>
                <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 items-stretch gap-2 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3 lg:block lg:space-y-2">
                  {fallbackPoints.map((point) => (
                    <Tooltip
                      key={point.id}
                      content={
                        activeStatusTooltipPointId === point.id
                          ? null
                          : getDetailsTooltipLabel(point.type)
                      }
                      wrapperClassName="block h-full lg:h-auto"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openPoint(point)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openPoint(point);
                          }
                        }}
                        className="h-full w-full rounded-lg border border-base-200 bg-white/80 p-2 text-left shadow-soft transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] lg:h-auto"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <EntityMetaLine point={point} />
                          <span
                            className="inline-flex"
                            onMouseEnter={() => setActiveStatusTooltipPointId(point.id)}
                            onMouseLeave={() => setActiveStatusTooltipPointId(null)}
                            onFocus={() => setActiveStatusTooltipPointId(point.id)}
                            onBlur={() => setActiveStatusTooltipPointId(null)}
                          >
                            <Tooltip
                              content={getLocationStatusTooltipLabel(point)}
                              wrapperClassName="inline-flex items-center"
                            >
                              <LocationStatusIndicator point={point} />
                            </Tooltip>
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <PopupAvatar
                            point={point}
                            backgroundColor={DEFAULT_MAP_ENTITY_COLOR}
                            showMatchScore={showMatchScore}
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="truncate text-[15px] font-medium leading-[1.1] text-[var(--color-primary-focus)]">
                              {point.name}
                            </h5>
                            <div
                              onMouseEnter={() => setActiveStatusTooltipPointId(point.id)}
                              onMouseLeave={() => setActiveStatusTooltipPointId(null)}
                              onFocusCapture={() => setActiveStatusTooltipPointId(point.id)}
                              onBlurCapture={() => setActiveStatusTooltipPointId(null)}
                            >
                              <UserSubline point={point} showMatchScore={showMatchScore} />
                              <TeamMetaLine
                                point={point}
                                showMatchScore={showMatchScore}
                                showRoleRequestNames={false}
                                onOpenInvitation={openInvitationDetails}
                                onOpenApplication={openApplicationDetails}
                              />
                              <RoleSubline
                                point={point}
                                showMatchScore={showMatchScore}
                                onOpenInvitation={openInvitationDetails}
                                onOpenApplication={openApplicationDetails}
                                teamOnly={point.type === "role"}
                              />
                            </div>
                          </div>
                        </div>
                        {point.type === "role" && (
                          <div className="mt-2 space-y-0.5 text-xs text-base-content/70">
                            {point.teamName && (
                              <div className="flex items-center gap-1.5">
                                <Users size={13} aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate">{point.teamName}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {point.type === "team" && Array.isArray(point.openRoleNames) && point.openRoleNames.length > 0 && (
                          <div className="mt-2 space-y-0.5 text-xs text-base-content/70">
                            <TeamOpenRoleNamesLine point={point} />
                          </div>
                        )}
                        {point.teamName && point.type !== "role" && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-base-content/70">
                            <Users size={13} aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">{point.teamName}</span>
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>

      {activeMarkerTooltipPoint &&
        markerTooltipAnchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={markerTooltipRef}
            role="tooltip"
            data-placement={markerTooltipPlacement}
            className="lomir-map-hover-tooltip fixed z-[9998]"
            style={{
              top: `${markerTooltipCoords ? markerTooltipCoords.top : markerTooltipAnchor.y}px`,
              left: `${markerTooltipCoords ? markerTooltipCoords.left : markerTooltipAnchor.x}px`,
              visibility: markerTooltipCoords ? "visible" : "hidden",
              "--tooltip-arrow-left": markerTooltipArrowLeft
                ? `${markerTooltipArrowLeft}px`
                : "50%",
            }}
          >
            <MarkerTooltipContent
              point={activeMarkerTooltipPoint}
              showMatchScore={showMatchScore}
            />
          </div>,
          document.body,
        )}

      {activePopupPointId &&
        activePoint &&
        popupAnchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label={`${activePoint.name} map result`}
            data-placement={popupPlacement}
            className="fixed z-[9999] rounded-xl border border-base-200 bg-base-100 p-3 shadow-soft"
            style={{
              top: `${popupCoords ? popupCoords.top : popupAnchor.y}px`,
              left: `${popupCoords ? popupCoords.left : popupAnchor.x}px`,
              width: "fit-content",
              maxWidth: `min(${MAP_POPUP_MAX_WIDTH}px, calc(100vw - ${MAP_POPUP_VIEWPORT_PADDING * 2}px))`,
              visibility: popupCoords ? "visible" : "hidden",
            }}
          >
            <MapPopupCard
              point={activePoint}
              showMatchScore={showMatchScore}
              onClose={closeActivePopup}
              onOpenPoint={(point) => {
                closeActivePopup();
                openPoint(point);
              }}
              onOpenInvitation={(invitation) => {
                closeActivePopup();
                openInvitationDetails(invitation);
              }}
              onOpenApplication={(application) => {
                closeActivePopup();
                openApplicationDetails(application);
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-[12.8px] w-[22.5px]"
              style={{
                backgroundColor: "var(--color-base-100, #ffffff)",
                bottom: popupPlacement === "top" ? "-11.8px" : "auto",
                filter: "drop-shadow(0 2px 6px rgba(4, 80, 20, 0.12))",
                left: popupArrowLeft ? `${popupArrowLeft}px` : "50%",
                maskImage: MAP_POPUP_ARROW_MASK,
                maskRepeat: "no-repeat",
                maskSize: "contain",
                top: popupPlacement === "bottom" ? "-11.8px" : "auto",
                transform:
                  popupPlacement === "bottom"
                    ? "translateX(-50%) rotate(180deg)"
                    : "translateX(-50%)",
                WebkitMaskImage: MAP_POPUP_ARROW_MASK,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
              }}
            />
          </div>,
          document.body,
        )}

      {selectedInvitation && (
        <TeamInvitationDetailsModal
          isOpen={true}
          invitation={selectedInvitation}
          onClose={() => setSelectedInvitation(null)}
          onAccept={handleInvitationAccept}
          onDecline={handleInvitationDecline}
        />
      )}

      {selectedApplication && (
        <TeamApplicationDetailsModal
          isOpen={true}
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onCancel={handleApplicationCancel}
          onSendReminder={handleApplicationReminder}
        />
      )}

      {selectedRolePointForModal && (
        <VacantRoleDetailsModal
          isOpen={true}
          onClose={() => setSelectedRolePoint(null)}
          role={selectedRolePointForModal.item}
          team={{
            id:
              selectedRolePointForModal.item.teamId ??
              selectedRolePointForModal.item.team_id,
            name: selectedRolePointForModal.teamName,
            teamavatar_url:
              selectedRolePointForModal.item.teamAvatarUrl ??
              selectedRolePointForModal.item.team_avatar_url,
          }}
          matchScore={
            showMatchScore
              ? selectedRolePointForModal.item.bestMatchScore ??
                selectedRolePointForModal.item.best_match_score ??
                null
              : null
          }
          matchDetails={
            showMatchScore
              ? selectedRolePointForModal.item.matchDetails ??
                selectedRolePointForModal.item.match_details ??
                null
              : null
          }
          showMatchScore={showMatchScore}
          isTeamMember={selectedRolePointForModal.isViewerTeamMember}
        />
      )}
    </div>
  );
};

export default SearchMapView;
