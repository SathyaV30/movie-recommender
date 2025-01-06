import HomeStartButton from './components/HomeStartButton';
export default function Home() {

  return (
    <div className="hero min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="mb-5 text-7xl font-extrabold drop-shadow-lg flex items-center justify-center gap-2">
            PopcornPal <span role="img" aria-label="popcorn">🍿</span>
          </h1>
          <p className="mb-5 text-xl text-[var(--color-neutral)]">
            Discover your next favorite movie or tv show with the ultimate recommendation chatbot!
          </p>
         <HomeStartButton />
        </div>
      </div>
    </div>
  );
}