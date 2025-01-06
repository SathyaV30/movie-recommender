require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
const PORT = 5001;

// Middleware 
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// ENV KEYS
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Initialize OpenAI Client
const openAi = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Cache for genres
let movieGenreMap = {};
let tvGenreMap = {};

// ------------------ Fetch and Cache Genres ------------------ //
async function fetchGenresFromTMDB() {
  try {
    // Fetch movie genres
    const movieGenreUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`;
    const movieGenreResponse = await axios.get(movieGenreUrl);
    movieGenreMap = movieGenreResponse.data.genres.reduce((map, genre) => {
      map[genre.name.toLowerCase()] = genre.id;
      return map;
    }, {});
    console.log("Fetched and cached movie genres:", movieGenreMap);

    // Fetch TV show genres
    const tvGenreUrl = `https://api.themoviedb.org/3/genre/tv/list?api_key=${TMDB_API_KEY}&language=en-US`;
    const tvGenreResponse = await axios.get(tvGenreUrl);
    tvGenreMap = tvGenreResponse.data.genres.reduce((map, genre) => {
      map[genre.name.toLowerCase()] = genre.id;
      return map;
    }, {});
    console.log("Fetched and cached TV show genres:", tvGenreMap);
  } catch (error) {
    console.error("Error fetching genres from TMDB:", error.message);
  }
}

// Fetch genres on server start
fetchGenresFromTMDB();

// Refresh genres periodically
setInterval(fetchGenresFromTMDB, 24 * 60 * 60 * 1000); // every 24 hours

// ------------------ Helpers ------------------ //
function sanitizeAIResponse(text) {
  // Remove code block markers
  let sanitized = text.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
  // Remove any JS-style comments
  sanitized = sanitized.replace(/\/\/.*$/gm, '').trim();
  return sanitized;
}

// 1) Classify if the user wants movie/TV or none
async function classifyRequest(userMessage) {
  try {
    const systemPrompt = `
      You are a classifier that determines whether the user is explicitly asking for 
      a recommendation or discovery of movies or TV shows. 
      - If the user explicitly wants suggestions, recommendations, or is searching for 
        movies, respond with "movie".
      - If the user explicitly wants suggestions, recommendations, or is searching for 
        TV shows, respond with "tv".
      - If the user is asking for opinions, speculation about ratings, or anything 
        else that does NOT involve actually finding or recommending a movie or TV show, 
        respond with "none".

      Only respond with one of the three words: "movie", "tv", or "none".
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    const response = await openAi.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0,
      max_tokens: 1,
    });

    const classification = response.choices[0].message.content.trim().toLowerCase();

    if (classification === "movie") return "movie";
    if (classification === "tv") return "tv";
    return "none";
  } catch (error) {
    console.error("Error in classifyRequest:", error.message);
    // Default to 'none' in case of error
    return "none";
  }
}

// 2) Generate TMDB Query from user message
async function generateTMDBQuery(userMessage, requestType) {
  try {
    // Choose the correct genre map
    const selectedGenreMap = requestType === "movie" ? movieGenreMap : tvGenreMap;
    // Make a list of the known genres for AI
    const genreMapString = Object.entries(selectedGenreMap)
      .map(([name, id]) => `${name.charAt(0).toUpperCase() + name.slice(1)}: ${id}`)
      .join(", ");

    // Tell the AI about possible fields (including new ones for language, cast, and keywords)
    const systemPrompt = `
      You are a system that generates valid TMDB query parameters in JSON format 
      given a user’s request about ${requestType === "movie" ? "movies" : "TV shows"}. 
      Do not add extra text; just output JSON. 
      
      Here is a list of available genres and their corresponding IDs:
      ${genreMapString}
    
      Possible fields:
        query,
        with_genres,
        with_keywords,
        primary_release_date_gte, (For movies only)
        primary_release_date_lte, (For movies only)
        first_air_date_gte (For TV shows only)
        first_air_date_lte (For TV shows only)
        sort_by,
        with_original_language,
        with_keywords_names,  // e.g. "melancholy, tense, heartbreak, conspiracy"
        vote_average_gte,
        vote_average_lte,
        vote_count_gte,
        with_runtime_gte,
        with_runtime_lte,
        language,               // Example: "en-US", "es-ES", "fr-FR"
        with_cast_names         // e.g. "tom hanks, leonardo dicaprio"


        

      If the user wants the results in a different language, set "language" to that code 
      (for example "fr-FR"). If not specified, you may default to "en-US".
      
      If the user specifies actor names, you can add "with_cast_names": "Tom Hanks, ..." 
      so the system can look up the actors by name.
      
      If the user references abstract or meta traits, you can add "with_keywords_names": 
      "melancholy, tense" so the system can look up the matching keyword IDs. Try to add atleast 8-9 keywords for an expansive search.
      Only include this parameter if the query is complex or abstract.
      
      Additional rules:
        - "high rated": Include "vote_average_gte": "7.0"
        - "popular": "sort_by": "popularity.desc"
        - If both "high rated" and "popular": "vote_average_gte": "7.0" AND "sort_by": "vote_average.desc"
        - Generally, set "vote_count_gte": "1000" or higher to filter out obscure titles, 
          but consider that non-English titles might have fewer votes.
        - Always use YYYY-MM-DD format for dates.
        - If "upcoming" is requested, set "primary_release_date_gte" to today's date (${new Date().toISOString().split('T')[0]})
          and do NOT include vote_average_gte, vote_average_lte, vote_count_gte, or vote_count_lte.
      
      Only JSON, with no extra text or markdown. Example minimal output:
      {
        "language": "es-ES",
        "with_cast_names": "Tom Hanks",
        "with_keywords_names": "melancholy, heartbreak",
        "vote_average_gte": "7.0"

      }
    `;

    console.log('systemPrompt', systemPrompt)

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    const response = await openAi.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.2,
      max_tokens: 300,
    });

    const rawAnswer = response.choices[0].message.content.trim();
    console.log("Raw JSON from AI (Query Parameters):", rawAnswer);

    const sanitizedAnswer = sanitizeAIResponse(rawAnswer);

    // Attempt to parse the JSON
    let queryParams = {};
    try {
      queryParams = JSON.parse(sanitizedAnswer);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError.message);
      return {};
    }

    return queryParams;
  } catch (error) {
    console.error("Error in generateTMDBQuery:", error.message);
    return {};
  }
}

// 2.1) Fetch actors by name & return IDs
async function fetchActorIdsByNames(names = [], language = "en-US") {
  const ids = [];

  for (const name of names) {
    try {
      const personUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}&language=${language}&include_adult=false`;
      const resp = await axios.get(personUrl);
      const results = resp.data.results || [];
      if (results.length > 0) {
        // Take the first result's ID
        ids.push(results[0].id);
      }
    } catch (error) {
      console.error(`Error fetching actor "${name}":`, error.message);
    }
  }

  return ids;
}

// 2.2) Fetch keywords by name & return IDs
async function fetchKeywordIdsByNames(names = []) {
  const ids = [];

  for (const kName of names) {
    try {
      const keywordUrl = `https://api.themoviedb.org/3/search/keyword?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(kName)}&page=1`;
      const resp = await axios.get(keywordUrl);
      const results = resp.data.results || [];
      if (results.length > 0) {
        // Take the first result's ID
        ids.push(results[0].id);
      }
    } catch (error) {
      console.error(`Error fetching keyword "${kName}":`, error.message);
    }
  }

  return ids;
}

// 3) Fetch from TMDB (either discover movie or tv)
async function fetchFromTMDB(queryParams = {}, requestType) {
  // Determine the endpoint
  const endpoint = requestType === "movie" ? "discover/movie" : "discover/tv";

  // Default to "en-US" if not provided
  const languageParam = queryParams.language || "en-US";

  // 3a) If the AI returned with_cast_names, search them
  if (queryParams.with_cast_names) {
    const namesArr = queryParams.with_cast_names.split(",").map((n) => n.trim());
    const actorIds = await fetchActorIdsByNames(namesArr, languageParam);
    if (actorIds.length > 0) {
      queryParams.with_cast = actorIds.join(",");
    }
    delete queryParams.with_cast_names; // Remove to avoid conflicts
  }

  // 3b) If the AI returned with_keywords_names, search them
  if (queryParams.with_keywords_names) {
    const kwNamesArr = queryParams.with_keywords_names.split(",").map((n) => n.trim());
    const keywordIds = await fetchKeywordIdsByNames(kwNamesArr);
    if (keywordIds.length > 0) {
      // If there's already a with_keywords, append to it
      if (queryParams.with_keywords) {
        // Combine existing keywords with new ones using a pipe separator
        const existing = queryParams.with_keywords.split("|").map((n) => n.trim());
        const combined = [...new Set([...existing, ...keywordIds])].join("|"); // Ensure unique IDs
        queryParams.with_keywords = combined;
      } else {
        queryParams.with_keywords = keywordIds.join("|");
      }
    }
    delete queryParams.with_keywords_names; // Remove to avoid conflicts
  }

  // Build the base URL
  let baseUrl = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}`;

  // Always append the language param
  baseUrl += `&language=${languageParam}`;

  // Define mappings for recognized params
  const mappings = {
    query: "query", // typically used with search endpoints
    with_genres: "with_genres",
    with_cast: "with_cast",
    with_crew: "with_crew",
    primary_release_date_gte: "primary_release_date.gte",
    primary_release_date_lte: "primary_release_date.lte",
    first_air_date_gte: "first_air_date.gte",
    first_air_date_lte: "first_air_date.lte",
    vote_average_gte: "vote_average.gte",
    vote_average_lte: "vote_average.lte",
    vote_count_gte: "vote_count.gte",
    sort_by: "sort_by",
    with_original_language: "with_original_language",
    year: "year",
    with_keywords: "with_keywords",
    with_runtime_gte: "with_runtime.gte",
    with_runtime_lte: "with_runtime.lte",

    // language is already handled above
  };

  // Append recognized params
  for (const key in queryParams) {
    if (mappings[key] && queryParams[key]) {
      const tmdbKey = mappings[key];
      baseUrl += `&${tmdbKey}=${encodeURIComponent(queryParams[key])}`;
    }
  }

  console.log(`TMDB ${requestType === "movie" ? "Discover" : "TV"} Request URL:`, baseUrl);

  try {
    let { data } = await axios.get(baseUrl);
    // Append media_type to each result
    if (data.results && Array.isArray(data.results)) {
      data.results = data.results.map((result) => ({
        ...result,
        media_type: requestType === "movie" ? "movie" : "tv",
      }));
    }
    return data.results || [];
  } catch (error) {
    console.error(`TMDB ${requestType === "movie" ? "discover" : "TV"} fetch error:`, error.message);
    return [];
  }
}

// 4) Refine results with AI
async function refineResultsWithAI(originalUserMessage, tmdbResults, requestType) {
  try {
    if (tmdbResults.length === 0) {
      return `I couldn't find any ${requestType === "movie" ? "movies" : "TV shows"} matching your criteria. Please try a different request.`;
    }

    // Prepare top 5 for context
    const topResults = tmdbResults.slice(0, 5);
    const resultContext = topResults
      .map((item, i) => {
        return `Result ${i + 1}:
        Title: ${item.title || item.name},
        Release: ${item.release_date || item.first_air_date || "N/A"},
        Overview: ${item.overview}
        Rating: ${item.vote_average}/10
        Vote Count: ${item.vote_count}
        id: ${item.id}
        popularity: ${item.popularity}
        media_type: ${requestType === "movie" ? "movie" : "tv"}
        `;
      })
      .join("\n\n");

    const systemPrompt = `
      You are a helpful ${requestType === "movie" ? "movie" : "TV show"} assistant. The user asked: "${originalUserMessage}"
      We fetched some TMDB results for them. Summarize or recommend the best match. 
      Here are the top results:
      
      ${resultContext}
      
      Provide a helpful and concise answer for the user.
    `;

    const messages = [{ role: "system", content: systemPrompt }];

    const response = await openAi.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error in refineResultsWithAI:", error.message);
    return "Sorry, I had trouble analyzing the results.";
  }
}

// 5) Normal AI Response (no movie/TV recommendation flow)
async function generateNormalResponse(messages) {
  try {
    const systemPrompt = `
      You are a helpful assistant. Respond to the user's message appropriately.
    `;

    const response = await openAi.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiResponse = response.choices[0].message.content.trim();
    return aiResponse;
  } catch (error) {
    console.error("Error in generateNormalResponse:", error.message);
    return "Sorry, I couldn't process your request at the moment.";
  }
}

// ------------------- Main Endpoint -------------------- //
app.post("/api/respond", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !messages.length) {
    return res.status(400).json({ error: "No messages provided" });
  }

  // Grab the user's latest message
  const userMessage = messages[messages.length - 1].content;

  try {
    // Step 1: Classification
    const requestType = await classifyRequest(userMessage);

    if (requestType === "movie" || requestType === "tv") {
      // Steps 2 & 3: Generate TMDB Query, then fetch
      const queryParams = await generateTMDBQuery(userMessage, requestType);
      const tmdbResults = await fetchFromTMDB(queryParams, requestType);

      // Step 4: Use AI to refine the final answer
      const refinedAnswer = await refineResultsWithAI(userMessage, tmdbResults, requestType);

      // Return the final answer
      return res.json({
        response: refinedAnswer,
        tmdbData: tmdbResults,
        queryParams,
        requestType,
      });
    } else {
      // Step 5: Non-movie/TV request -> normal AI response
      const normalResponse = await generateNormalResponse(messages);
      return res.json({
        response: normalResponse,
      });
    }
  } catch (error) {
    console.error("Error in /api/respond:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to complete the response." });
  }
});

// ------------- Additional Title Endpoint (Movie/TV) ------------- //
app.get("/api/title/:type/:id", async (req, res) => {
  const { type, id } = req.params;

  if (!id || !type) {
    return res.status(400).json({ error: "Type and ID are required." });
  }

  // Validate type is 'movie' or 'tv'
  if (!["movie", "tv"].includes(type)) {
    return res.status(400).json({ error: "Invalid type. Must be 'movie' or 'tv'." });
  }

  try {
    // Fetch details from TMDB
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const response = await axios.get(url);

    console.log('response', response.data)

    return res.json(response.data);
  } catch (error) {
    console.error(`Error fetching ${type} details:`, error.message);
    if (error.response) {
      return res
        .status(error.response.status)
        .json({ error: error.response.data.status_message });
    }
    return res.status(500).json({ error: `Failed to fetch ${type} details.` });
  }
});

// ------------------ Start Server ------------------ //
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
