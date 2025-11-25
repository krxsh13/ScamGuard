import React, { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, Award } from 'lucide-react';

export function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const questions = [
    {
      question: "You receive a text saying 'Your bank account will be frozen in 24 hours. Click this link to verify: http://bank-verify.com'. What should you do?",
      options: [
        "Click the link immediately to save my account",
        "Call my bank directly using the number on my bank card",
        "Forward the message to friends to warn them",
        "Reply to ask for more information"
      ],
      correct: 1,
      explanation: "Always contact your bank directly using official contact information. Legitimate banks will never ask you to verify accounts through text message links."
    },
    {
      question: "You get a call saying 'Congratulations! You've won $50,000 in our lottery. To claim your prize, please pay a $500 processing fee.' This is:",
      options: [
        "A legitimate lottery - I should pay the fee",
        "Suspicious, but I'll pay since the prize is large",
        "Definitely a scam - legitimate lotteries don't charge fees",
        "Real, but I should negotiate a lower fee"
      ],
      correct: 2,
      explanation: "This is a classic lottery scam. You should never pay fees to claim prizes, especially for lotteries you didn't enter. Legitimate lotteries deduct fees from winnings, never charge upfront."
    },
    {
      question: "An email claims to be from 'Amazon' but the sender address is 'amazon-security@am4z0n.net'. This is:",
      options: [
        "Legitimate - Amazon uses various email addresses",
        "A phishing attempt - the domain is fake",
        "Probably real since it mentions Amazon",
        "Safe to respond to for clarification"
      ],
      correct: 1,
      explanation: "This is a phishing email. The domain 'am4z0n.net' is not Amazon's real domain (amazon.com). Scammers often use similar-looking domains to trick users."
    },
    {
      question: "What is the safest way to check if a suspicious email about your account is real?",
      options: [
        "Click the links in the email to investigate",
        "Reply to the email asking if it's legitimate",
        "Log into your account directly through the official website",
        "Forward it to friends to see what they think"
      ],
      correct: 2,
      explanation: "Always log into your accounts directly through official websites or apps, not through links in emails. This way you can check for real alerts or messages safely."
    },
    {
      question: "A caller says they're from Microsoft and your computer is infected. They want to help you fix it remotely. You should:",
      options: [
        "Let them help since Microsoft made my computer",
        "Ask them to call back later when it's more convenient",
        "Hang up immediately - this is a tech support scam",
        "Give them access but watch what they do"
      ],
      correct: 2,
      explanation: "Microsoft (and other tech companies) never call customers unsolicited about computer problems. This is a common tech support scam designed to steal money or install malware."
    }
  ];

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      const correctAnswers = questions.reduce((acc, question, index) => {
        return acc + (newAnswers[index] === question.correct ? 1 : 0);
      }, 0);
      setScore(correctAnswers);
      setShowResults(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResults(false);
    setScore(0);
  };

  const getScoreColor = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return 'Excellent! You have strong scam awareness.';
    if (percentage >= 60) return 'Good job! Review the explanations to improve further.';
    return 'Keep learning! Understanding these concepts will protect you better.';
  };

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Award className={`h-16 w-16 mx-auto mb-6 ${getScoreColor()}`} />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Quiz Complete!</h2>
          <div className="text-6xl font-bold mb-2">
            <span className={getScoreColor()}>{score}</span>
            <span className="text-gray-400">/{questions.length}</span>
          </div>
          <p className="text-xl text-gray-600 mb-8">{getScoreMessage()}</p>
          
          <div className="space-y-6 text-left">
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Question {qIndex + 1}: {question.question}
                </h3>
                <div className="space-y-2 mb-4">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className={`p-3 rounded-lg flex items-center space-x-3 ${
                      oIndex === question.correct 
                        ? 'bg-green-50 border border-green-200' 
                        : answers[qIndex] === oIndex
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-gray-50'
                    }`}>
                      {oIndex === question.correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : answers[qIndex] === oIndex ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <div className="h-5 w-5" />
                      )}
                      <span className={
                        oIndex === question.correct ? 'text-green-800 font-medium' : 
                        answers[qIndex] === oIndex ? 'text-red-800' : 'text-gray-700'
                      }>
                        {option}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">{question.explanation}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={restartQuiz}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2 mx-auto"
          >
            <RotateCcw className="h-5 w-5" />
            <span>Take Quiz Again</span>
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Test Your Scam Knowledge</h2>
        <p className="text-gray-600 text-lg mb-6">
          Take this quiz to see how well you can spot different types of scams
        </p>
        <div className="flex justify-center space-x-2 mb-6">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`h-3 w-8 rounded-full transition-colors duration-200 ${
                index < currentQuestion
                  ? 'bg-green-500'
                  : index === currentQuestion
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
          {question.question}
        </h3>

        <div className="space-y-4">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-gray-700 hover:text-gray-900"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-sm font-medium">{String.fromCharCode(65 + index)}</span>
                </div>
                <span className="text-lg">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}