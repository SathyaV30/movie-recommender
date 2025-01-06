import { notFound } from "next/navigation";
import { BACKEND_URL } from "../../config";

interface TitleDetails {
  id: number;
  // Movie vs. TV
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;

  overview: string;
  backdrop_path: string;
  poster_path?: string;

  // Movie-specific
  release_date?: string;
  runtime?: number;
  budget?: number;
  revenue?: number;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;

  // TV-specific
  first_air_date?: string;
  episode_run_time?: number[];
  in_production?: boolean;
  number_of_episodes?: number;
  number_of_seasons?: number;
  last_air_date?: string;
  type?: string;

  // Shared
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genres?: Array<{ id: number; name: string }>;
  spoken_languages?: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  production_companies?: Array<{
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }>;
  production_countries?: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  status?: string;

  // Credits
  credits?: {
    cast: Array<CastMember>;
    crew: Array<CastMember>;
  };
}

interface CastMember {
  cast_id?: number;
  character?: string;
  name?: string;
  profile_path?: string;
  id?: number;
}



type TitlePageParams = { params: Promise<{ type: string; id: string }> };

export default async function TitlePage({ params }: TitlePageParams) {
  const { type, id } = await params;

  // 1) Validate route
  if (!type || !id) {
    notFound(); 
  }

  // 2) Fetch data from your Node backend
  let titleData: TitleDetails | null = null;
  try {
    const url = `${BACKEND_URL}/api/title/${type}/${id}`;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
      notFound(); // or handle error
    }
    titleData = (await resp.json()) as TitleDetails;
  } catch (err) {
    console.error("Error fetching title details:", err);
    notFound();
  }

  // 3) If no data or an error occurred
  if (!titleData) {
    notFound();
  }

  // 4) At this point, we have "titleData" on the server
  //    The rest is just your original UI code
  const isMovie = type === "movie";
  const displayTitle = isMovie
    ? titleData.title || "No Title"
    : titleData.name || "No Title";
  const displayDate = isMovie
    ? titleData.release_date
    : titleData.first_air_date;

  // For TV, average runtime
  const tvAverageRuntime =
    titleData.episode_run_time && titleData.episode_run_time.length > 0
      ? Math.round(
          titleData.episode_run_time.reduce((a, b) => a + b, 0) /
            titleData.episode_run_time.length
        )
      : 0;
  const displayRuntime = isMovie ? titleData.runtime || 0 : tvAverageRuntime;

  const backdropUrl = titleData.backdrop_path
    ? `https://image.tmdb.org/t/p/original${titleData.backdrop_path}`
    : null;
  const posterUrl = titleData.poster_path
    ? `https://image.tmdb.org/t/p/w500${titleData.poster_path}`
    : "/no-poster.png";

  const topCast = titleData.credits?.cast?.slice(0, 10) || [];

  // 5) Return the rendered UI
  return (
    <div className="bg-[var(--color-background)] text-white min-h-screen">
      {/* Banner section */}
      <div className="relative w-full h-[40vh] md:h-[60vh] bg-black">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={displayTitle}
            className="w-full h-full object-cover opacity-70"
          />
        )}
        {/* Poster overlapping the banner */}
        <div className="absolute bottom-0 left-4 md:left-16 transform translate-y-1/4 flex items-end">
          <div className="relative w-36 md:w-48 lg:w-64">
            <img
              src={posterUrl}
              alt={displayTitle}
              className="rounded shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="px-4 md:px-16 relative pt-16 md:pt-8">
        <div className="ml-0 md:ml-[220px] lg:ml-[280px] xl:ml-[340px]">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{displayTitle}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4 flex-wrap">
            <span>Release: {displayDate ?? "N/A"}</span>
            <span>Rating: {titleData.vote_average?.toFixed(1)}/10</span>
            <span>Votes: {titleData.vote_count ?? 0}</span>
            {isMovie ? (
              <span>Runtime: {displayRuntime} min</span>
            ) : (
              <span>Avg. Runtime: {displayRuntime} min</span>
            )}
            <span>Status: {titleData.status ?? "N/A"}</span>
          </div>

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* TV Info */}
            {!isMovie && (
              <div>
                <p>
                  <strong>In Production:</strong>{" "}
                  {titleData.in_production ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Seasons:</strong> {titleData.number_of_seasons ?? 0}
                </p>
                <p>
                  <strong>Episodes:</strong> {titleData.number_of_episodes ?? 0}
                </p>
                {titleData.last_air_date && (
                  <p>
                    <strong>Last Air Date:</strong> {titleData.last_air_date}
                  </p>
                )}
                {titleData.type && (
                  <p>
                    <strong>Type:</strong> {titleData.type}
                  </p>
                )}
              </div>
            )}

            {/* Movie Info */}
            {isMovie && (
              <div>
                <p>
                  <strong>Budget:</strong> $
                  {titleData.budget?.toLocaleString() || 0}
                </p>
                <p>
                  <strong>Revenue:</strong> $
                  {titleData.revenue?.toLocaleString() || 0}
                </p>
                {titleData.belongs_to_collection && (
                  <p>
                    <strong>Collection:</strong>{" "}
                    {titleData.belongs_to_collection.name}
                  </p>
                )}
              </div>
            )}

            {/* Shared info */}
            <div>
              <p>
                <strong>Popularity:</strong> {titleData.popularity?.toFixed(1)}
              </p>
              {!!titleData.genres?.length && (
                <p>
                  <strong>Genres:</strong>{" "}
                  {titleData.genres.map(g => g.name).join(", ")}
                </p>
              )}
              {!!titleData.spoken_languages?.length && (
                <p>
                  <strong>Spoken Languages:</strong>{" "}
                  {titleData.spoken_languages
                    .map(lang => lang.english_name)
                    .join(", ")}
                </p>
              )}
              {!!titleData.production_countries?.length && (
                <p>
                  <strong>Production Countries:</strong>{" "}
                  {titleData.production_countries.map(pc => pc.name).join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Overview */}
          <p className="text-gray-200 max-w-3xl mb-6">
            {titleData.overview || "No overview available."}
          </p>
        </div>
      </div>

      {/* Cast Row */}
      <div className="px-4 md:px-16 mt-8">
        <h2 className="text-xl font-bold mb-4">Top Cast</h2>
        {topCast.length === 0 ? (
          <p>No cast info available.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto">
            {topCast.map(actor => {
              const profileUrl = actor.profile_path
                ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                : "/no-avatar.png";
              return (
                <div
                  key={actor.id}
                  className="flex flex-col flex-shrink-0 w-32 items-center text-center"
                >
                  <img
                    src={profileUrl}
                    alt={actor.name}
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                  <p className="text-sm font-semibold">{actor.name}</p>
                  {actor.character && (
                    <p className="text-xs text-gray-400">{actor.character}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Production Companies */}
      {!!titleData.production_companies?.length && (
        <div className="px-4 md:px-16 mt-8">
          <h2 className="text-xl font-bold mb-4">Production Companies</h2>
          <div className="flex gap-6 flex-wrap">
            {titleData.production_companies.map(company => {
              const logoUrl = company.logo_path
                ? `https://image.tmdb.org/t/p/w154${company.logo_path}`
                : null;
              return (
                <div
                  key={company.id}
                  className="flex flex-col items-center text-center mb-4"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={company.name}
                      className="max-w-[120px] max-h-[60px] object-contain mb-1"
                    />
                  ) : (
                    <div className="mb-1 text-xs text-gray-400">No Logo</div>
                  )}
                  <p className="text-sm">{company.name}</p>
                  <p className="text-xs text-gray-500">
                    {company.origin_country}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
