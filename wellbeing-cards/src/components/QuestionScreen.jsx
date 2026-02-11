export default function QuestionScreen({
  category,
  question,
  totalSeen,
  totalQuestions,
  onBack,
  onNext,
}) {
  return (
    <div
      className="question-screen"
      style={{
        '--cat-color': category.color,
        '--cat-light': category.colorLight,
        '--cat-dark': category.colorDark,
      }}
    >
      <div className="question-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Categories
        </button>
        <div className="question-meta">
          <span className="question-category">
            {category.icon} {category.name}
          </span>
          <span className="question-counter">
            {totalSeen} of {totalQuestions} explored
          </span>
        </div>
      </div>

      <div className="question-body">
        <p className="question-text">{question}</p>
      </div>

      <div className="question-footer">
        <button className="next-button" onClick={onNext}>
          Next Random Question →
        </button>
      </div>
    </div>
  );
}
