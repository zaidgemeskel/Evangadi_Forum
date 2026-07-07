// import { useEffect, useState, useRef } from "react";
// import { Link, useParams } from "react-router-dom";
// import {
//   getQuestion,
//   getSimilarQuestions,
// } from "../../services/question/question.service";
// import { answerService } from "../../services/answer/answer.service";
// import { speak } from "../../accessibility/textToSpeech";
// import styles from "./QuestionDetail.module.css";
// import ReactMarkdown from "react-markdown";
// import rehypeHighlight from "rehype-highlight";
// import "highlight.js/styles/github.css";

// export default function QuestionDetail() {
//   const { questionHash } = useParams();

//   const [question, setQuestion] = useState(null);
//   const [answers, setAnswers] = useState([]);
//   const [answerText, setAnswerText] = useState("");
//   const [fitResult, setFitResult] = useState(null);
//   const [message, setMessage] = useState("");
//   const [shareStatus, setShareStatus] = useState("");
//   const [relatedQuestions, setRelatedQuestions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const requestIdRef = useRef(0);

//   // Derived boolean
//   const isWeakDraft = fitResult?.level === "weak";

//   // Markdown renderers: sanitize links and render code blocks with language label
//   const markdownComponents = {
//     a: ({ href, children, ...props }) => (
//       <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
//         {children}
//       </a>
//     ),
//     code: ({ node, inline, className, children, ...props }) => {
//       const match = /language-(\w+)/.exec(className || "");
//       if (inline) {
//         return (
//           <code className={styles.inlineCode} {...props}>
//             {children}
//           </code>
//         );
//       }

//       return (
//         <div className={styles.codeBlockWrapper}>
//           {match ? <div className={styles.codeLang}>{match[1]}</div> : null}
//           <pre className={className}>
//             <code {...props}>{children}</code>
//           </pre>
//         </div>
//       );
//     },
//   };

//   // Error extraction helper
//   const getErrorMessage = (error, fallback) => {
//     return (
//       error?.response?.data?.msg ||
//       error?.response?.data?.message ||
//       error?.response?.data?.error?.message ||
//       error?.message ||
//       fallback
//     );
//   };

//   // Load related questions
//   const loadRelatedQuestions = async () => {
//     try {
//       const result = await getSimilarQuestions(questionHash);
//       setRelatedQuestions(result.data || result || []);
//     } catch {
//       setRelatedQuestions([]);
//     }
//   };

//   // Load question details
//   const loadQuestion = async () => {
//     // Increment request id for cancellation guard
//     requestIdRef.current += 1;
//     const localRequestId = requestIdRef.current;

//     try {
//       setLoading(true);
//       setMessage("");
//       setQuestion(null);
//       setAnswers([]);
//       setRelatedQuestions([]);

//       const result = await getQuestion(questionHash);

//       // If a newer request has started, abort applying this result.
//       if (localRequestId !== requestIdRef.current) return;

//       const questionFromResult =
//         result?.question ||
//         result?.data?.question ||
//         result?.data?.data?.question ||
//         null;

//       const answersFromResult =
//         result?.answers ||
//         result?.data?.answers ||
//         result?.data?.data?.answers ||
//         [];

//       if (process.env.NODE_ENV !== "production") {
//         if (
//           !questionFromResult &&
//           !result?.question &&
//           !result?.data?.question
//         ) {
//           console.warn(
//             "QuestionDetail.loadQuestion: unexpected response shape",
//             result,
//           );
//         }
//       }

//       // Apply normalized data only if this request is still current
//       if (localRequestId === requestIdRef.current) {
//         setQuestion(questionFromResult);
//         setAnswers(Array.isArray(answersFromResult) ? answersFromResult : []);
//       }

//       // Load related questions but ignore if a newer request started
//       await loadRelatedQuestions();
//       if (localRequestId !== requestIdRef.current) return;

//       // Retry handle transient backend race conditions if answerCount > 0
//       if (
//         (questionFromResult?.answerCount || 0) > 0 &&
//         (!answersFromResult || answersFromResult.length === 0)
//       ) {
//         try {
//           const retry = await getQuestion(questionHash);
//           if (localRequestId !== requestIdRef.current) return;
//           const retryAnswers =
//             retry?.answers ||
//             retry?.data?.answers ||
//             retry?.data?.data?.answers ||
//             [];
//           if (Array.isArray(retryAnswers) && retryAnswers.length > 0) {
//             setAnswers(retryAnswers);
//           }
//         } catch (err) {
//           // Swallow retry errors
//         }
//       }
//     } catch (error) {
//       if (localRequestId === requestIdRef.current) {
//         setMessage(getErrorMessage(error, "Failed to load question details."));
//       }
//     } finally {
//       if (localRequestId === requestIdRef.current) {
//         setLoading(false);
//       }
//     }
//   };

//   useEffect(() => {
//     if (questionHash) {
//       loadQuestion();
//     }
//   }, [questionHash]);

//   const handleAnswerFit = async () => {
//     try {
//       setMessage("");
//       const result = await answerService.answerFit(questionHash, answerText);
//       setFitResult(result.data || result);
//     } catch (error) {
//       setMessage(getErrorMessage(error, "Failed to evaluate answer."));
//     }
//   };

//   const handleShare = async () => {
//     if (!question) return;
//     const shareUrl = window.location.href;
//     const title = question.title || "Question detail";
//     const text = `Check out this question: ${question.title}`;
//     try {
//       if (navigator.share) {
//         await navigator.share({ title, text, url: shareUrl });
//         setShareStatus("Question shared successfully.");
//       } else {
//         await navigator.clipboard.writeText(shareUrl);
//         setShareStatus("Question link copied to clipboard.");
//       }
//     } catch {
//       setShareStatus(
//         "Unable to share automatically. Copy the URL from your browser instead.",
//       );
//     }
//   };

//   const handleSubmitAnswer = async (e) => {
//     e.preventDefault();
//     if (!answerText.trim()) {
//       setMessage("Please write an answer before posting.");
//       return;
//     }
//     if (isWeakDraft) {
//       setMessage(
//         "Weak draft answers cannot be submitted. Improve your response first.",
//       );
//       return;
//     }
//     try {
//       setSubmitting(true);
//       setMessage("");
//       await answerService.createAnswer({
//         questionId: question.id,
//         content: answerText,
//       });
//       setAnswerText("");
//       setFitResult(null);
//       await loadQuestion();
//     } catch (error) {
//       setMessage(
//         getErrorMessage(error, "Failed to post answer. Please try again."),
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // Voice functions
//   const readQuestion = () => {
//     if (question) {
//       speak(`Question: ${question.title}. ${question.content}`);
//     }
//   };

//   if (loading) {
//     return (
//       <section className={styles.centerState}>
//         <p>Loading question details...</p>
//       </section>
//     );
//   }

//   if (!question) {
//     return (
//       <section className={styles.centerState}>
//         <p className={styles.errorText}>Failed to load question details.</p>
//         <Link to="/dashboard" className={styles.orangeBtn}>
//           Return to Dashboard
//         </Link>
//       </section>
//     );
//   }

//   return (
//     <section className={styles.page}>
//       <div className={styles.main}>
//         <Link to="/dashboard" className={styles.backLink}>
//           ← Back to feed
//         </Link>

//         <article className={styles.questionCard}>
//           <div className={styles.authorRow}>
//             <div className={styles.avatar}>NU</div>
//             <div>
//               <h4>
//                 {question.author?.firstName || "New"}{" "}
//                 {question.author?.lastName || "User"}
//               </h4>
//               <p>Posted question</p>
//             </div>
//           </div>

//           <h2>{question.title}</h2>
//           <div className={styles.questionText}>
//             <ReactMarkdown
//               components={markdownComponents}
//               rehypePlugins={[rehypeHighlight]}
//             >
//               {question.content || ""}
//             </ReactMarkdown>
//           </div>
//           <div className={styles.cardActions}>
//             <button type="button" onClick={handleShare}>
//               Share
//             </button>
//             <button type="button">{answers.length} Answers</button>
//             <button
//               type="button"
//               onClick={readQuestion}
//               style={{
//                 backgroundColor: "#0066FF",
//                 color: "white",
//                 border: "none",
//                 padding: "4px 12px",
//                 borderRadius: "4px",
//               }}
//             >
//               🔊 Read Question
//             </button>
//           </div>
//           {shareStatus && <p className={styles.shareText}>{shareStatus}</p>}
//         </article>

//         <h3 className={styles.sectionTitle}>
//           Community Answers ({answers.length})
//         </h3>

//         {answers.length === 0 ? (
//           <div className={styles.emptyBox}>
//             <div className={styles.emptyIcon}>▢</div>
//             <h4>Be the first to help!</h4>
//             <p>
//               This question is waiting for an expert like you. Share your
//               knowledge and earn reputation points.
//             </p>
//           </div>
//         ) : (
//           <div className={styles.answers}>
//             {answers.map((answer) => (
//               <article key={answer.id} className={styles.answerCard}>
//                 <div className={styles.authorRow}>
//                   <div className={styles.avatar}>NU</div>
//                   <div>
//                     <h4>
//                       {answer.author?.firstName || "New"}{" "}
//                       {answer.author?.lastName || "User"}
//                     </h4>
//                     <p>Community answer</p>
//                   </div>
//                 </div>

//                 <div className={styles.answerText}>
//                   <ReactMarkdown
//                     components={markdownComponents}
//                     rehypePlugins={[rehypeHighlight]}
//                   >
//                     {answer.content || ""}
//                   </ReactMarkdown>
//                 </div>
//               </article>
//             ))}
//           </div>
//         )}

//         <form className={styles.answerForm} onSubmit={handleSubmitAnswer}>
//           <h3>Contribute an answer</h3>
//           {message && <p className={styles.errorText}>{message}</p>}
//           <div className={styles.toolbar}>
//             <span>B</span>
//             <span>I</span>
//             <span>🔗</span>
//             <span>&lt;/&gt;</span>
//             <small>{answerText.length} characters</small>
//           </div>
//           <textarea
//             value={answerText}
//             onChange={(e) => setAnswerText(e.target.value)}
//             placeholder="Type your answer here..."
//           />
//           <div className={styles.formFooter}>
//             <button
//               type="button"
//               className={styles.fitBtn}
//               onClick={handleAnswerFit}
//               disabled={!answerText.trim() || submitting}
//             >
//               Check draft fit
//             </button>
//             <button
//               type="submit"
//               className={styles.orangeBtn}
//               disabled={submitting || isWeakDraft}
//             >
//               {submitting ? "Posting..." : "Post Your Answer"}
//             </button>
//           </div>
//           {isWeakDraft && (
//             <div className={styles.warningBox}>
//               <p>
//                 Weak answers are not allowed for posting. Please rewrite with
//                 more clarity.
//               </p>
//             </div>
//           )}
//           {fitResult && (
//             <div className={styles.fitBox}>
//               <strong>AI Answer Evaluation</strong>
//               <p>
//                 <b>Level:</b> {fitResult.level}
//               </p>
//               <p>{fitResult.note}</p>
//             </div>
//           )}
//         </form>
//       </div>

//       <aside className={styles.side}>
//         <h3>Related Questions</h3>
//         {relatedQuestions.length === 0 ? (
//           <div className={styles.relatedEmpty}>
//             <p>No related questions found yet.</p>
//           </div>
//         ) : (
//           relatedQuestions.map((related) => {
//             const target = related?.questionHash || related?.id;

//             if (!target) {
//               return (
//                 <div
//                   key={related?.id || Math.random()}
//                   className={styles.relatedCard}
//                 >
//                   <h4>{related?.title || "Untitled"}</h4>
//                   <p>{related?.content?.slice(0, 60) || "View details"}</p>
//                 </div>
//               );
//             }

//             return (
//               <Link
//                 key={target}
//                 to={`/questions/${target}`}
//                 className={styles.relatedCard}
//               >
//                 <h4>{related.title}</h4>
//                 <p>{related.content?.slice(0, 60) || "View details"}</p>
//               </Link>
//             );
//           })
//         )}
//       </aside>
//     </section>
//   );
// }
import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getQuestion,
  getSimilarQuestions,
} from "../../services/question/question.service";
import { answerService } from "../../services/answer/answer.service";
import { speak } from "../../accessibility/textToSpeech";
import styles from "./QuestionDetail.module.css";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

export default function QuestionDetail() {
  const { questionHash } = useParams();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [fitResult, setFitResult] = useState(null);
  const [message, setMessage] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [relatedQuestions, setRelatedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef(0);

  // Derived boolean
  const isWeakDraft = fitResult?.level === "weak";

  // Build avatar initials from an author's first/last name.
  // Examples: {firstName: "Ahmed", lastName: "Ali"} -> "AA"
  //           {firstName: "Ahmed"} -> "A"
  //           no name available -> "?"
  const getInitials = (author) => {
    const first = author?.firstName?.trim();
    const last = author?.lastName?.trim();

    const firstInitial = first ? first[0] : "";
    const lastInitial = last ? last[0] : "";

    const initials = `${firstInitial}${lastInitial}`.toUpperCase();

    return initials || "?";
  };

  // Markdown renderers: sanitize links and render code blocks with language label
  const markdownComponents = {
    a: ({ href, children, ...props }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    ),
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      if (inline) {
        return (
          <code className={styles.inlineCode} {...props}>
            {children}
          </code>
        );
      }

      return (
        <div className={styles.codeBlockWrapper}>
          {match ? <div className={styles.codeLang}>{match[1]}</div> : null}
          <pre className={className}>
            <code {...props}>{children}</code>
          </pre>
        </div>
      );
    },
  };

  // Error extraction helper
  const getErrorMessage = (error, fallback) => {
    return (
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      fallback
    );
  };

  // Load related questions
  const loadRelatedQuestions = async () => {
    try {
      const result = await getSimilarQuestions(questionHash);
      setRelatedQuestions(result.data || result || []);
    } catch {
      setRelatedQuestions([]);
    }
  };

  // Load question details
  const loadQuestion = async () => {
    // Increment request id for cancellation guard
    requestIdRef.current += 1;
    const localRequestId = requestIdRef.current;

    try {
      setLoading(true);
      setMessage("");
      setQuestion(null);
      setAnswers([]);
      setRelatedQuestions([]);

      const result = await getQuestion(questionHash);

      // If a newer request has started, abort applying this result.
      if (localRequestId !== requestIdRef.current) return;

      const questionFromResult =
        result?.question ||
        result?.data?.question ||
        result?.data?.data?.question ||
        null;

      const answersFromResult =
        result?.answers ||
        result?.data?.answers ||
        result?.data?.data?.answers ||
        [];

      if (process.env.NODE_ENV !== "production") {
        if (
          !questionFromResult &&
          !result?.question &&
          !result?.data?.question
        ) {
          console.warn(
            "QuestionDetail.loadQuestion: unexpected response shape",
            result,
          );
        }
      }

      // Apply normalized data only if this request is still current
      if (localRequestId === requestIdRef.current) {
        setQuestion(questionFromResult);
        setAnswers(Array.isArray(answersFromResult) ? answersFromResult : []);
      }

      // Load related questions but ignore if a newer request started
      await loadRelatedQuestions();
      if (localRequestId !== requestIdRef.current) return;

      // Retry handle transient backend race conditions if answerCount > 0
      if (
        (questionFromResult?.answerCount || 0) > 0 &&
        (!answersFromResult || answersFromResult.length === 0)
      ) {
        try {
          const retry = await getQuestion(questionHash);
          if (localRequestId !== requestIdRef.current) return;
          const retryAnswers =
            retry?.answers ||
            retry?.data?.answers ||
            retry?.data?.data?.answers ||
            [];
          if (Array.isArray(retryAnswers) && retryAnswers.length > 0) {
            setAnswers(retryAnswers);
          }
        } catch (err) {
          // Swallow retry errors
        }
      }
    } catch (error) {
      if (localRequestId === requestIdRef.current) {
        setMessage(getErrorMessage(error, "Failed to load question details."));
      }
    } finally {
      if (localRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (questionHash) {
      loadQuestion();
    }
  }, [questionHash]);

  const handleAnswerFit = async () => {
    try {
      setMessage("");
      const result = await answerService.answerFit(questionHash, answerText);
      setFitResult(result.data || result);
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to evaluate answer."));
    }
  };

  const handleShare = async () => {
    if (!question) return;
    const shareUrl = window.location.href;
    const title = question.title || "Question detail";
    const text = `Check out this question: ${question.title}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        setShareStatus("Question shared successfully.");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("Question link copied to clipboard.");
      }
    } catch {
      setShareStatus(
        "Unable to share automatically. Copy the URL from your browser instead.",
      );
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim()) {
      setMessage("Please write an answer before posting.");
      return;
    }
    if (isWeakDraft) {
      setMessage(
        "Weak draft answers cannot be submitted. Improve your response first.",
      );
      return;
    }
    try {
      setSubmitting(true);
      setMessage("");
      await answerService.createAnswer({
        questionId: question.id,
        content: answerText,
      });
      setAnswerText("");
      setFitResult(null);
      await loadQuestion();
    } catch (error) {
      setMessage(
        getErrorMessage(error, "Failed to post answer. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Voice functions
  const readQuestion = () => {
    if (question) {
      speak(`Question: ${question.title}. ${question.content}`);
    }
  };

  if (loading) {
    return (
      <section className={styles.centerState}>
        <p>Loading question details...</p>
      </section>
    );
  }

  if (!question) {
    return (
      <section className={styles.centerState}>
        <p className={styles.errorText}>Failed to load question details.</p>
        <Link to="/dashboard" className={styles.orangeBtn}>
          Return to Dashboard
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.main}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Back to feed
        </Link>

        <article className={styles.questionCard}>
          <div className={styles.authorRow}>
            <div className={styles.avatar}>{getInitials(question.author)}</div>
            <div>
              <h4>
                {question.author?.firstName || "New"}{" "}
                {question.author?.lastName || "User"}
              </h4>
              <p>Posted question</p>
            </div>
          </div>

          <h2>{question.title}</h2>
          <div className={styles.questionText}>
            <ReactMarkdown
              components={markdownComponents}
              rehypePlugins={[rehypeHighlight]}
            >
              {question.content || ""}
            </ReactMarkdown>
          </div>
          <div className={styles.cardActions}>
            <button type="button" onClick={handleShare}>
              Share
            </button>
            <button type="button">{answers.length} Answers</button>
            <button
              type="button"
              onClick={readQuestion}
              style={{
                backgroundColor: "#0066FF",
                color: "white",
                border: "none",
                padding: "4px 12px",
                borderRadius: "4px",
              }}
            >
              🔊 Read Question
            </button>
          </div>
          {shareStatus && <p className={styles.shareText}>{shareStatus}</p>}
        </article>

        <h3 className={styles.sectionTitle}>
          Community Answers ({answers.length})
        </h3>

        {answers.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyIcon}>▢</div>
            <h4>Be the first to help!</h4>
            <p>
              This question is waiting for an expert like you. Share your
              knowledge and earn reputation points.
            </p>
          </div>
        ) : (
          <div className={styles.answers}>
            {answers.map((answer) => (
              <article key={answer.id} className={styles.answerCard}>
                <div className={styles.authorRow}>
                  <div className={styles.avatar}>
                    {getInitials(answer.author)}
                  </div>
                  <div>
                    <h4>
                      {answer.author?.firstName || "New"}{" "}
                      {answer.author?.lastName || "User"}
                    </h4>
                    <p>Community answer</p>
                  </div>
                </div>

                <div className={styles.answerText}>
                  <ReactMarkdown
                    components={markdownComponents}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {answer.content || ""}
                  </ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
        )}

        <form className={styles.answerForm} onSubmit={handleSubmitAnswer}>
          <h3>Contribute an answer</h3>
          {message && <p className={styles.errorText}>{message}</p>}
          <div className={styles.toolbar}>
            <span>B</span>
            <span>I</span>
            <span>🔗</span>
            <span>&lt;/&gt;</span>
            <small>{answerText.length} characters</small>
          </div>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Type your answer here..."
          />
          <div className={styles.formFooter}>
            <button
              type="button"
              className={styles.fitBtn}
              onClick={handleAnswerFit}
              disabled={!answerText.trim() || submitting}
            >
              Check draft fit
            </button>
            <button
              type="submit"
              className={styles.orangeBtn}
              disabled={submitting || isWeakDraft}
            >
              {submitting ? "Posting..." : "Post Your Answer"}
            </button>
          </div>
          {isWeakDraft && (
            <div className={styles.warningBox}>
              <p>
                Weak answers are not allowed for posting. Please rewrite with
                more clarity.
              </p>
            </div>
          )}
          {fitResult && (
            <div className={styles.fitBox}>
              <strong>AI Answer Evaluation</strong>
              <p>
                <b>Level:</b> {fitResult.level}
              </p>
              <p>{fitResult.note}</p>
            </div>
          )}
        </form>
      </div>

      <aside className={styles.side}>
        <h3>Related Questions</h3>
        {relatedQuestions.length === 0 ? (
          <div className={styles.relatedEmpty}>
            <p>No related questions found yet.</p>
          </div>
        ) : (
          relatedQuestions.map((related) => {
            const target = related?.questionHash || related?.id;

            if (!target) {
              return (
                <div
                  key={related?.id || Math.random()}
                  className={styles.relatedCard}
                >
                  <h4>{related?.title || "Untitled"}</h4>
                  <p>{related?.content?.slice(0, 60) || "View details"}</p>
                </div>
              );
            }

            return (
              <Link
                key={target}
                to={`/questions/${target}`}
                className={styles.relatedCard}
              >
                <h4>{related.title}</h4>
                <p>{related.content?.slice(0, 60) || "View details"}</p>
              </Link>
            );
          })
        )}
      </aside>
    </section>
  );
}