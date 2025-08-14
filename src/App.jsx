import React, { useEffect, useMemo, useRef, useState } from "react";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB = "https://api.themoviedb.org/3";
const IMG = {
  poster: (p) => (p ? `https://image.tmdb.org/t/p/w342${p}` : ""),
  backdrop: (p) => (p ? `https://image.tmdb.org/t/p/w780${p}` : ""),
};

function Section({ title, children, right }) {
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Badge({ children }) {
  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 border border-white/10">
      {children}
    </span>
  );
}

function Card({ image, title, subtitle, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl overflow-hidden bg-white/5 hover:bg-white/10 transition shadow-sm w-full"
    >
      <div className="aspect-[2/3] w-full bg-black/20 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-white/50">
            No Image
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium line-clamp-1">{title}</h3>
          {badge && <Badge>{badge}</Badge>}
        </div>
        {subtitle && (
          <p className="text-sm text-white/70 line-clamp-2">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

function Grid({ children }) {
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
      {children}
    </div>
  );
}

function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-neutral-900 rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-lg line-clamp-1 pr-4">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="aspect-video w-full">{children}</div>
      </div>
    </div>
  );
}

async function j(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return res.json();
}

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function App() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [suggestions, setSuggestions] = useState([]);
  const [activeSug, setActiveSug] = useState(-1);

  const [popularMovies, setPopularMovies] = useState([]);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [seedMovie, setSeedMovie] = useState(null);

  const [popularTV, setPopularTV] = useState([]);
  const [recommendedTV, setRecommendedTV] = useState([]);
  const [selectedTV, setSelectedTV] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const seriesExplorerRef = useRef(null);

  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerTitle, setPlayerTitle] = useState("");
  const [currentURL, setCurrentURL] = useState(null);

  useEffect(() => {
    (async () => {
      const [pm, ptv, trendingMovies] = await Promise.all([
        j(`${TMDB}/movie/popular?api_key=${API_KEY}`),
        j(`${TMDB}/tv/popular?api_key=${API_KEY}`),
        j(`${TMDB}/trending/movie/week?api_key=${API_KEY}`),
      ]);
      setPopularMovies(pm.results || []);
      setPopularTV(ptv.results || []);
      setRecommendedMovies(trendingMovies.results || []);
    })().catch(console.error);
  }, []);

  useEffect(() => {
    if (!dq?.trim()) {
      setSuggestions([]);
      setActiveSug(-1);
      return;
    }
    j(
      `${TMDB}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(
        dq
      )}&include_adult=false`
    )
      .then((d) => setSuggestions((d.results || []).slice(0, 8)))
      .catch(() => setSuggestions([]));
  }, [dq]);

  useEffect(() => {
    if (!seedMovie) return;
    j(`${TMDB}/movie/${seedMovie.id}/recommendations?api_key=${API_KEY}`)
      .then((d) => setRecommendedMovies(d.results || []))
      .catch(console.error);
  }, [seedMovie]);

  useEffect(() => {
    if (!selectedTV) return;
    j(`${TMDB}/tv/${selectedTV.id}/recommendations?api_key=${API_KEY}`)
      .then((d) => setRecommendedTV(d.results || []))
      .catch(console.error);
  }, [selectedTV]);

  useEffect(() => {
    if (!selectedTV) return;
    (async () => {
      const tv = await j(`${TMDB}/tv/${selectedTV.id}?api_key=${API_KEY}`);
      const defaultSeason =
        (tv.seasons?.find((s) => s.season_number === 1) || tv.seasons?.[0])
          ?.season_number || 1;
      setSelectedTV(tv);
      setSelectedSeason(defaultSeason);
    })().catch(console.error);
  }, [selectedTV?.id]);

  useEffect(() => {
    if (!selectedTV?.id || !selectedSeason) return;
    j(
      `${TMDB}/tv/${selectedTV.id}/season/${selectedSeason}?api_key=${API_KEY}`
    )
      .then((d) => setEpisodes(d.episodes || []))
      .catch(() => setEpisodes([]));
  }, [selectedTV?.id, selectedSeason]);

  const playMovie = (movie) => {
    setCurrentURL(`https://vidlink.pro/movie/${movie.id}`);
    setPlayerTitle(movie.title || movie.name || "Movie");
    setPlayerOpen(true);
    setSeedMovie(movie);
  };

  const playEpisode = (tvId, season, episode, title) => {
    setCurrentURL(`https://vidlink.pro/tv/${tvId}-${season}-${episode}`);
    setPlayerTitle(title);
    setPlayerOpen(true);
  };

  const chooseTV = (tv) => {
    setSelectedTV(tv);
    requestAnimationFrame(() => {
      seriesExplorerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleSuggestionEnter = (item) => {
    if (!item) return;
    if (item.media_type === "movie") {
      playMovie(item);
    } else if (item.media_type === "tv") {
      chooseTV(item);
    }
    setSuggestions([]);
    setQ("");
  };

  const onSearchKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSug((s) => (s + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSug((s) => (s - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSuggestionEnter(suggestions[activeSug] || suggestions[0]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setActiveSug(-1);
    }
  };

  const seasons = useMemo(
    () => selectedTV?.seasons?.filter((s) => s.season_number !== 0) || [],
    [selectedTV]
  );

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-24">
        {/* Search */}
        <div className="sticky top-0 z-40 backdrop-blur bg-neutral-950/70 border-b border-white/10 py-4 mb-6 -mx-4 px-4">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search movies and series..."
              className="w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
            />
            {suggestions.length > 0 && (
              <div className="absolute mt-2 w-full rounded-xl overflow-hidden border border-white/10 bg-neutral-900 shadow-2xl">
                {suggestions.map((s, i) => (
                  <button
                    key={(s.media_type || "x") + s.id + i}
                    onClick={() => handleSuggestionEnter(s)}
                    className={
                      "w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-3 " +
                      (i === activeSug ? "bg-white/10" : "")
                    }
                  >
                    <img
                      src={IMG.poster(s.poster_path) || IMG.backdrop(s.backdrop_path)}
                      alt={s.title || s.name}
                      className="w-10 h-14 object-cover rounded-md bg-white/5"
                    />
                    <div className="min-w-0">
                      <div className="font-medium line-clamp-1">
                        {s.title || s.name}
                      </div>
                      <div className="text-xs text-white/70 flex items-center gap-2">
                        <Badge>{(s.media_type || "").toUpperCase()}</Badge>
                        <span className="truncate">
                          {(s.release_date || s.first_air_date || "").slice(0, 4)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Series Explorer */}
        <div ref={seriesExplorerRef}>
          <Section
            title="Series Explorer"
            right={
              selectedTV && (
                <div className="text-sm text-white/70">
                  Selected: <span className="font-medium">{selectedTV.name}</span>
                </div>
              )
            }
          >
            {selectedTV ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white/70">Season</label>
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      className="rounded-xl bg-white/10 border border-white/10 px-3 py-2"
                    >
                      {seasons.map((s) => (
                        <option key={s.id || s.season_number} value={s.season_number}>
                          {s.name || `Season ${s.season_number}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Badge>
                    {selectedTV.number_of_seasons} season
                    {selectedTV.number_of_seasons === 1 ? "" : "s"}
                  </Badge>
                  <Badge>{selectedTV.number_of_episodes} episodes</Badge>
                </div>

                <Grid>
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition"
                      onClick={() =>
                        playEpisode(
                          selectedTV.id,
                          selectedSeason,
                          ep.episode_number,
                          `${selectedTV.name} - S${selectedSeason}E${ep.episode_number}`
                        )
                      }
                    >
                      <div className="aspect-video bg-black/30">
                        {ep.still_path ? (
                          <img
                            src={IMG.backdrop(ep.still_path)}
                            alt={`S${selectedSeason}E${ep.episode_number} - ${ep.name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-white/50">
                            No Preview
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-medium line-clamp-1">
                          S{selectedSeason} • E{ep.episode_number}: {ep.name}
                        </div>
                        {ep.overview && (
                          <p className="text-xs text-white/70 line-clamp-2 mt-1">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </Grid>
              </div>
            ) : (
              <div className="text-white/70 text-sm">
                Select a series from below to explore seasons and episodes.
              </div>
            )}
          </Section>
        </div>

        {/* Popular Movies */}
        <Section title="Popular Movies">
          <Grid>
            {popularMovies.map((m) => (
              <Card
                key={m.id}
                image={IMG.poster(m.poster_path)}
                title={m.title}
                subtitle={m.release_date?.slice(0, 4)}
                badge={Number(m.vote_average || 0).toFixed(1)}
                onClick={() => playMovie(m)}
              />
            ))}
          </Grid>
        </Section>

        {/* Recommended Movies */}
        <Section
          title="Recommended Movies"
          right={
            seedMovie && (
              <div className="text-sm text-white/70">
                Based on <span className="font-medium">{seedMovie.title}</span>
              </div>
            )
          }
        >
          <Grid>
            {recommendedMovies.map((m) => (
              <Card
                key={m.id}
                image={IMG.poster(m.poster_path)}
                title={m.title}
                subtitle={m.release_date?.slice(0, 4)}
                badge={Number(m.vote_average || 0).toFixed(1)}
                onClick={() => playMovie(m)}
              />
            ))}
          </Grid>
        </Section>

        {/* Popular Series */}
        <Section title="Popular Series">
          <Grid>
            {popularTV.map((tv) => (
              <Card
                key={tv.id}
                image={IMG.poster(tv.poster_path)}
                title={tv.name}
                subtitle(tv.first_air_date?.slice(0, 4))
                badge={Number(tv.vote_average || 0).toFixed(1)}
                onClick={() => chooseTV(tv)}
              />
            ))}
          </Grid>
        </Section>

        {/* Recommended Series */}
        <Section
          title="Recommended Series"
          right={
            selectedTV && (
              <div className="text-sm text-white/70">
                Because you chose <span className="font-medium">{selectedTV.name}</span>
              </div>
            )
          }
        >
          <Grid>
            {recommendedTV.map((tv) => (
              <Card
                key={tv.id}
                image={IMG.poster(tv.poster_path)}
                title={tv.name}
                subtitle={tv.first_air_date?.slice(0, 4)}
                badge={Number(tv.vote_average || 0).toFixed(1)}
                onClick={() => chooseTV(tv)}
              />
            ))}
          </Grid>
        </Section>
      </div>

      <Modal open={playerOpen} onClose={() => setPlayerOpen(false)} title={playerTitle}>
        {currentURL ? (
          <iframe
            src={currentURL}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={playerTitle}
          />
        ) : (
          <div className="w-full h-full grid place-items-center">
            Missing TMDB id
          </div>
        )}
      </Modal>

      <footer className="text-center text-xs text-white/50 py-6">
        Built with TMDB data. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  );
}
