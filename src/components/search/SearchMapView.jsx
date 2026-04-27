import React, { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe, MapPin, Users, User, UserSearch } from "lucide-react";
import VacantRoleDetailsModal from "../teams/VacantRoleDetailsModal";
import { useTeamModalSafe } from "../../contexts/TeamModalContext";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { getResultMatchScore } from "../../utils/teamMatchUtils";

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

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidCoordinate = (lat, lng) =>
  lat !== null &&
  lng !== null &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

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

const buildMarkerIcon = (type) => {
  const meta = TYPE_META[type] ?? TYPE_META.team;

  return L.divIcon({
    className: "lomir-map-marker",
    html: `
      <span
        class="lomir-map-marker-pin"
        style="--marker-color: ${meta.color}; --marker-bg: ${meta.background};"
        aria-hidden="true"
      ></span>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -36],
  });
};

const markerIcons = {
  team: buildMarkerIcon("team"),
  user: buildMarkerIcon("user"),
  role: buildMarkerIcon("role"),
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
  };
};

const MapBounds = ({ points }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12, animate: false });
  }, [map, points]);

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

const SearchMapView = ({
  items = [],
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
  const initialCenter =
    markerPoints.length > 0 ? [markerPoints[0].lat, markerPoints[0].lng] : DEFAULT_CENTER;

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

  const renderPointDetails = (point) => (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <TypeBadge type={point.type} />
          <h3 className="mt-2 text-sm font-bold leading-snug text-base-content">
            {point.name}
          </h3>
        </div>
      </div>

      {point.teamName && (
        <p className="mt-1 text-xs font-medium text-base-content/70">
          {point.teamName}
        </p>
      )}

      <div className="mt-3 space-y-1.5 text-xs text-base-content/70">
        <div className="flex items-center gap-1.5">
          {point.isRemote ? <Globe size={13} /> : <MapPin size={13} />}
          <span>{point.locationLabel}</span>
        </div>
        {point.distanceLabel && (
          <div className="flex items-center gap-1.5">
            <MapPin size={13} />
            <span>{point.distanceLabel}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => openPoint(point)}
        className="btn btn-xs mt-3 min-h-0 rounded-full border-[var(--color-primary)] bg-transparent px-3 text-[11px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
      >
        View details
      </button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-base-200 bg-base-100/80 shadow-soft">
        <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-h-[360px]">
            <MapContainer
              center={initialCenter}
              zoom={markerPoints.length > 0 ? 6 : 5}
              scrollWheelZoom={false}
              className="h-[360px] w-full lg:h-[520px]"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBounds points={markerPoints} />
              {markerPoints.map((point) => (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={markerIcons[point.type]}
                  title={`${TYPE_META[point.type]?.label ?? "Result"}: ${point.name}`}
                >
                  <Popup className="lomir-map-popup" minWidth={210}>
                    <div className="w-56">{renderPointDetails(point)}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <aside className="border-t border-base-200 bg-base-100/75 p-4 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-base-content">Mapped results</h3>
              <span className="text-xs text-base-content/60">
                {markerPoints.length}/{normalizedPoints.length}
              </span>
            </div>

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

            {fallbackPoints.length > 0 && (
              <div className="mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wide text-base-content/60">
                  Remote or unmapped
                </h4>
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
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

            {markerPoints.length === 0 && (
              <div className="mt-5 rounded-lg border border-base-200 bg-white/80 p-3 text-sm text-base-content/70">
                No visible results on this page include map coordinates yet.
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
