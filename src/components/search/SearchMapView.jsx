import React, { useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FlaskConical,
  Globe,
  MapPin,
  Ruler,
  Users,
  User,
  UserSearch,
  X,
} from "lucide-react";
import VacantRoleDetailsModal from "../teams/VacantRoleDetailsModal";
import { useTeamModalSafe } from "../../contexts/TeamModalContext";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { getResultMatchScore } from "../../utils/teamMatchUtils";
import {
  getTeamInitials,
  getUserInitials,
  isSyntheticRole,
  isSyntheticTeam,
  isSyntheticUser,
} from "../../utils/userHelpers";
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

const DEFAULT_CENTER = [51.1657, 10.4515];
const POPUP_SUBLINE_ICON_SIZE = 12;
const POPUP_SUBLINE_ICON_CLASS = "inline-flex h-3 w-3 items-center justify-center";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const isValidCoordinate = (lat, lng) =>
  lat !== null &&
  lng !== null &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const getLatLng = (item) => {
  const lat = toNumber(item?.latitude ?? item?.lat);
  const lng = toNumber(item?.longitude ?? item?.lng ?? item?.lon);

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

const getLocationLabel = (item) => {
  if (item.is_remote ?? item.isRemote) return "Remote";

  const city = item.city || item.location_city;
  const country = item.country || item.location_country;
  const state = item.state || item.location_state;
  const parts = [city, country || state].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Location not available";
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
  if (distance < 1) return `${distance.toFixed(1)} km away`;
  return `${Math.round(distance)} km away`;
};

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

const buildMarkerIcon = (point) => {
  const meta = TYPE_META[point.type] ?? TYPE_META.team;
  const initials = escapeHtml(point.initials);
  const imageMarkup = point.imageUrl
    ? `<img src="${escapeHtml(point.imageUrl)}" alt="" class="lomir-map-marker-avatar-image" onerror="this.style.display='none'" />`
    : "";

  return L.divIcon({
    className: "lomir-map-marker",
    html: `
      <span
        class="lomir-map-marker-pin"
        style="--marker-color: ${meta.color};"
        aria-hidden="true"
      >
        <span class="lomir-map-marker-avatar">
          <span class="lomir-map-marker-avatar-fallback">${initials}</span>
          ${imageMarkup}
        </span>
      </span>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36],
  });
};

const normalizeMapPoint = (item) => {
  if (!item) return null;

  const type =
    item._resultType === "team" || item._resultType === "user" || item._resultType === "role"
      ? item._resultType
      : item.roleName || item.role_name
        ? "role"
        : item.first_name || item.firstName || item.username
          ? "user"
          : "team";
  const lat = toNumber(item.latitude ?? item.lat);
  const lng = toNumber(item.longitude ?? item.lng ?? item.lon);
  const hasCoordinates = isValidCoordinate(lat, lng);
  const isRemote = Boolean(item.is_remote ?? item.isRemote);
  const avatarData = getAvatarData(item, type);

  return {
    id: `${type}-${item.id ?? item.roleId ?? item.role_id ?? getDisplayName(item, type)}`,
    rawId: item.id ?? item.roleId ?? item.role_id,
    type,
    item,
    lat,
    lng,
    hasCoordinates,
    isRemote,
    name: getDisplayName(item, type),
    locationLabel: getLocationLabel(item),
    distanceLabel: getDistanceLabel(item),
    teamName: item.teamName ?? item.team_name ?? item.team?.name ?? null,
    imageUrl: avatarData.imageUrl,
    initials: avatarData.initials,
    isDemo: isDemoPoint(item, type),
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

const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] ?? TYPE_META.team;
  const Icon = meta.Icon;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold"
      style={{ color: meta.color, borderColor: meta.color, backgroundColor: meta.background }}
    >
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

const MarkerTooltipContent = ({ point }) => {
  const meta = TYPE_META[point.type] ?? TYPE_META.team;
  const Icon = meta.Icon;

  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} className="block shrink-0" aria-hidden="true" />
      <span className="font-medium leading-none">{point.name}</span>
    </div>
  );
};

const PopupAvatar = ({ point }) => {
  const meta = TYPE_META[point.type] ?? TYPE_META.team;

  return (
    <span
      className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white shadow-soft ring-2 ring-white"
      style={{ backgroundColor: meta.color }}
      aria-hidden="true"
    >
      <span>{point.initials}</span>
      {point.imageUrl && (
        <img
          src={point.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {point.isDemo && (
        <DemoAvatarOverlay
          textClassName="text-[6px]"
          textTranslateClassName="-translate-y-[2px]"
        />
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

const BreakableName = ({ name }) => {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return <>{name}</>;
  return <>{words[0]}<br />{words.slice(1).join(" ")}</>;
};

const MapPopupCard = ({ point, onOpenPoint }) => {
  const map = useMap();
  const meta = TYPE_META[point.type] ?? TYPE_META.team;
  const Icon = meta.Icon;

  return (
    <div className="inline-block max-w-60 align-top">
      <div className="mb-2 flex items-center justify-between text-base-content/70">
        <div className="flex items-center gap-0.5 text-[11px] font-medium">
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
              <span>Demo</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => map.closePopup()}
          aria-label="Close"
          className="ml-2 flex items-center justify-center text-base-content/40 hover:text-base-content/70"
        >
          <X size={POPUP_SUBLINE_ICON_SIZE} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <PopupAvatar point={point} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-[17px] font-bold leading-[1.1] text-base-content">
            <BreakableName name={point.name} />
          </h3>
        </div>
      </div>

      <div className="mt-3 space-y-0.5 text-xs text-base-content/70">
        {point.teamName && (
          <div className="flex items-center gap-1.5">
            <Users size={13} />
            <span>{point.teamName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {point.isRemote ? <Globe size={13} /> : <MapPin size={13} />}
          <span>{point.locationLabel}</span>
        </div>
        {point.distanceLabel && (
          <div className="flex items-center gap-1.5">
            <Ruler size={13} />
            <span>{point.distanceLabel}</span>
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
  const teamModal = useTeamModalSafe();
  const userModal = useUserModalSafe();
  const [selectedRolePoint, setSelectedRolePoint] = useState(null);

  const normalizedPoints = useMemo(
    () => items.map(normalizeMapPoint).filter(Boolean),
    [items],
  );
  const markerPoints = normalizedPoints.filter((point) => point.hasCoordinates);
  const fallbackPoints = normalizedPoints.filter((point) => !point.hasCoordinates);
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

  const openPoint = (point) => {
    if (point.type === "team") {
      teamModal?.openTeamModal(point.rawId, point.name);
      return;
    }

    if (point.type === "user") {
      userModal?.openUserModal(point.rawId, {
        roleMatchTagIds,
        roleMatchBadgeNames,
        roleMatchName,
        roleMatchMaxDistanceKm,
        showMatchHighlights,
        matchScore: showMatchScore ? getResultMatchScore(point.item) : null,
        matchType: point.item.matchType ?? point.item.match_type ?? null,
        matchDetails: point.item.matchDetails ?? point.item.match_details ?? null,
        distanceKm: point.item.distance_km ?? point.item.distanceKm ?? null,
        invitationPrefillTeamId,
        invitationPrefillRoleId,
        invitationPrefillTeamName,
        invitationPrefillRoleName,
      });
      return;
    }

    setSelectedRolePoint(point);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-base-200 bg-base-100/80 shadow-soft">
        <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
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
            >
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
                  icon={buildMarkerIcon(point)}
                >
                  <LeafletTooltip
                    className="lomir-map-tooltip"
                    direction="top"
                    offset={[0, -34]}
                    opacity={1}
                  >
                    <MarkerTooltipContent point={point} />
                  </LeafletTooltip>
                  <Popup
                    className="lomir-map-popup"
                    closeButton={false}
                    minWidth={0}
                    maxWidth={260}
                  >
                    <MapPopupCard point={point} onOpenPoint={openPoint} />
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <aside className="flex min-h-[260px] flex-col border-t border-base-200 bg-base-100/75 p-4 lg:h-[520px] lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-base-content">Mapped results</h3>
              <span className="text-xs text-base-content/60">
                {markerPoints.length}/{normalizedPoints.length}
              </span>
            </div>

            {searchType === "all" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <span key={type} className="inline-flex items-center gap-1 text-xs text-base-content/70">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden="true"
                    />
                    {meta.label}
                  </span>
                ))}
              </div>
            )}

            {fallbackPoints.length > 0 && (
              <div className="mt-5 flex min-h-0 flex-1 flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wide text-base-content/60">
                  Remote or unmapped
                </h4>
                <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {fallbackPoints.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => openPoint(point)}
                      className="w-full rounded-lg border border-base-200 bg-white/80 p-2 text-left transition hover:border-[var(--color-primary)] hover:bg-[#f0fdf4] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <TypeBadge type={point.type} />
                        {point.isRemote && <Globe size={14} className="text-[var(--color-primary)]" />}
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-base-content">
                        {point.name}
                      </p>
                      <p className="truncate text-[11px] text-base-content/60">
                        {point.teamName || point.locationLabel}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>

      {selectedRolePoint && (
        <VacantRoleDetailsModal
          isOpen={true}
          onClose={() => setSelectedRolePoint(null)}
          role={selectedRolePoint.item}
          team={{
            id: selectedRolePoint.item.teamId ?? selectedRolePoint.item.team_id,
            name: selectedRolePoint.teamName,
            teamavatar_url:
              selectedRolePoint.item.teamAvatarUrl ??
              selectedRolePoint.item.team_avatar_url,
          }}
          matchScore={
            selectedRolePoint.item.bestMatchScore ??
            selectedRolePoint.item.best_match_score ??
            null
          }
          matchDetails={
            selectedRolePoint.item.matchDetails ??
            selectedRolePoint.item.match_details ??
            null
          }
          hideActions
        />
      )}
    </div>
  );
};

export default SearchMapView;
