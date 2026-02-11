import { useState, useCallback, useMemo } from 'react';
import { categories } from './data/questions';
import HomeScreen from './components/HomeScreen';
import QuestionScreen from './components/QuestionScreen';
import './App.css';

function getRandomQuestion(categoryId, seenSets) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return null;

  const seen = seenSets[categoryId] || new Set();
  let available = [];
  let reset = false;

  for (let i = 0; i < category.questions.length; i++) {
    if (!seen.has(i)) available.push(i);
  }

  if (available.length === 0) {
    available = category.questions.map((_, i) => i);
    reset = true;
  }

  const chosenIndex = available[Math.floor(Math.random() * available.length)];
  return {
    question: category.questions[chosenIndex],
    index: chosenIndex,
    reset,
  };
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [seenSets, setSeenSets] = useState(() => {
    const initial = {};
    categories.forEach((c) => (initial[c.id] = new Set()));
    return initial;
  });
  const [fade, setFade] = useState(true);

  const totalQuestions = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.questions.length, 0),
    []
  );

  const totalSeen = useMemo(
    () => Object.values(seenSets).reduce((sum, set) => sum + set.size, 0),
    [seenSets]
  );

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === currentCategoryId),
    [currentCategoryId]
  );

  const showQuestion = useCallback(
    (categoryId) => {
      const result = getRandomQuestion(categoryId, seenSets);
      if (!result) return;

      setFade(false);
      setTimeout(() => {
        if (result.reset) {
          setSeenSets((prev) => ({
            ...prev,
            [categoryId]: new Set([result.index]),
          }));
        } else {
          setSeenSets((prev) => ({
            ...prev,
            [categoryId]: new Set([...prev[categoryId], result.index]),
          }));
        }

        setCurrentCategoryId(categoryId);
        setCurrentQuestion(result.question);
        setScreen('question');
        setFade(true);
      }, 150);
    },
    [seenSets]
  );

  const handleSelectCategory = useCallback(
    (categoryId) => {
      showQuestion(categoryId);
    },
    [showQuestion]
  );

  const handleSelectRandom = useCallback(() => {
    const randomCat =
      categories[Math.floor(Math.random() * categories.length)];
    showQuestion(randomCat.id);
  }, [showQuestion]);

  const handleNext = useCallback(() => {
    showQuestion(currentCategoryId);
  }, [showQuestion, currentCategoryId]);

  const handleBack = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setScreen('home');
      setFade(true);
    }, 150);
  }, []);

  return (
    <div className={`app ${fade ? 'fade-in' : 'fade-out'}`}>
      {screen === 'home' ? (
        <HomeScreen
          onSelectCategory={handleSelectCategory}
          onSelectRandom={handleSelectRandom}
          seenCounts={seenSets}
        />
      ) : (
        <QuestionScreen
          category={currentCategory}
          question={currentQuestion}
          totalSeen={totalSeen}
          totalQuestions={totalQuestions}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
