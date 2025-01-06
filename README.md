
# Movie Recommender RAG Engine - PopcornPal

## Introduction

Welcome to my **RAG-based Answer Engine** project PopcornPal. It is a movie recommender system that uses a retrieval-augmented generation (RAG) flow to suggest movies based on user criteria.

- **Deployed Demo**: [Live Link]([https://example.com](https://movie-recommender-49p1jqkjx-sathyav30s-projects.vercel.app/))


## Tech Stack

- **Frontend**: Next.js 13 + App Router, React, TailwindCSS, DaisyUI
- **Backend**: Node/Express 
- **LLM**: [OpenAI GPT-based endpoint](https://platform.openai.com/docs/introduction)

## Dependencies and Attribution

- **TMDB API** for movie data
- **OpenAI** for LLM calls
- **DaisyUI** for extra Tailwind components
- **Node/Express** for the backend
- **nextjs** for the React framework

## Local Setup

1. **Clone** the repo:  
   ```bash
   git clone https://github.com/username/movie-rag.git .
   ```

2. **Install** dependencies for both client and server:  
   ```bash
   # For the client (Next.js)
   cd client
   npm install
   npm run build
   cd ..

   # For the server
   cd server
   npm install
   cd ..
   ```

3. **Environment Variables**  
   - Create a `.env` file in `server/` with your **OPENAI_API_KEY** and **TMDB_API_KEY**.  
   - Example:
     ```
     OPENAI_API_KEY=sk-xxxx
     TMDB_API_KEY=yyyy
     ```

4. **Run** locally:  
   ```bash
   # Start the server
   cd server
   npm run dev


   # Start the client
   cd ../client
   npm run dev

   ```

5. **Open** browser at `http://localhost:3000` to see the RAG-based movie recommender.


## How It Works

1. **User Query** → e.g., "Find me a sci-fi comedy from the early 2000s."
2. **LLM** (Step 1) → GPT-4o classifies the request type (`movie` vs `tv` or `none`).
3. **TMDB** → The system forms a param and fetches from TMDB.
4. **LLM** (Step 2) → GPT-4o summarizes the top 5 or so results for a final AI answer and provides a recommendation based on the users query.
5. **UI** → Neatly displays the refined recommendation with flip cards to see poster image on the front and overview on back.


## Usage Details

- **Query** anything like:  
  - "Recommend a funny horror movie from the 80s."  
  - "Which 2020 action films are highly rated and popular?"
  - "What are some tv shows featuring Kevin Hart that are great to watch with my family?" 
- The system returns a short curated list with an AI summary and recommendation.


## More considerations

- **Authentication**: In the future, I would like to add user auth to be able to save movie reccomendations and persist chats.


