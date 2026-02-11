import { categories } from '../data/questions';

export default function HomeScreen({ onSelectCategory, onSelectRandom, seenCounts }) {
  const totalQuestions = categories.reduce((sum, cat) => sum + cat.questions.length, 0);
  const totalSeen = Object.values(seenCounts).reduce((sum, set) => sum + set.size, 0);

  return (
    <div className="home-screen">
      <div className="home-header">
        <h1 className="home-title">Well-Being Conversation Cards</h1>
        <p className="home-subtitle">
          Choose a category to start a meaningful 1-on-1 discussion
        </p>
        {totalSeen > 0 && (
          <p className="home-progress">
            {totalSeen} of {totalQuestions} questions explored
          </p>
        )}
      </div>

      <div className="category-grid">
        {categories.map((category) => {
          const seen = seenCounts[category.id]?.size || 0;
          return (
            <button
              key={category.id}
              className="category-card"
              style={{
                '--cat-color': category.color,
                '--cat-light': category.colorLight,
                '--cat-dark': category.colorDark,
              }}
              onClick={() => onSelectCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
              {seen > 0 && (
                <span className="category-seen">
                  {seen}/{category.questions.length}
                </span>
              )}
            </button>
          );
        })}

        <button className="category-card random-card" onClick={onSelectRandom}>
          <span className="category-icon">🎲</span>
          <span className="category-name">Random Question</span>
          <span className="category-hint">Any Category</span>
        </button>
      </div>
    </div>
  );
}
