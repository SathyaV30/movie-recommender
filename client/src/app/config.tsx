export const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5001"
    : "https://movie-recommender-backend-nine.vercel.app";