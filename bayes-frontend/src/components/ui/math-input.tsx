"use client";

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Button } from "./button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import Head from "next/head";
import "./mathquill-custom.css"; // Add this import for custom MathQuill styles
import { Whiteboard } from "./whiteboard";
import { mathOcr, checkAnswerOcr } from "@/lib/utils";
import { Loader2, PenLine, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  correctAnswer?: string;
  enableOcr?: boolean;
}

export interface MathInputHandle {
  handleOcr: (imageData: string) => Promise<void>;
  focus: () => void;
}

export const MathInput = forwardRef<MathInputHandle, MathInputProps>(
  function MathInput(
    {
      value,
      onChange,
      placeholder = "Enter your answer...",
      disabled = false,
      onSubmit,
      correctAnswer,
      enableOcr = false,
    },
    ref,
  ) {
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [currentExpression, setCurrentExpression] = useState(value || "");
    const mathFieldRef = useRef<HTMLDivElement>(null);
    const mathQuillRef = useRef<unknown>(null);
    const [mathQuillLoaded, setMathQuillLoaded] = useState(false);
    const [isClient, setIsClient] = useState(false);

    // Whiteboard and OCR states
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [ocrResult, setOcrResult] = useState<{
      latex?: string;
      error?: string;
    } | null>(null);

    // Expose functions through ref
    useImperativeHandle(
      ref,
      () => ({
        handleOcr,
        focus: () => {
          const inputElement = document.getElementById("math-input-field");
          if (inputElement instanceof HTMLInputElement) {
            inputElement.focus();
          }
        },
      }),
      [correctAnswer],
    ); // Dependencies for useImperativeHandle

    // Fallback to basic input when MathQuill fails to load
    const [useFallback, setUseFallback] = useState(false);
    const [textInput, setTextInput] = useState(value || "");

    // Check if we're on the client side
    useEffect(() => {
      setIsClient(true);
    }, []);

    // Function to manually load scripts since Next.js Script component
    // can be unreliable for this use case
    useEffect(() => {
      if (!isClient) return;

      // Check if scripts are already loaded
      const mathQuillExists =
        typeof (window as unknown as { MathQuill: unknown }).MathQuill !==
        "undefined";

      if (mathQuillExists) {
        setMathQuillLoaded(true);
        return;
      }

      // Load jQuery first if not already loaded
      const jQueryExists =
        typeof (window as unknown as { jQuery: unknown }).jQuery !==
        "undefined";

      if (!jQueryExists) {
        const jQueryScript = document.createElement("script");
        jQueryScript.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js";
        jQueryScript.async = false;

        jQueryScript.onload = () => {
          // Now load MathQuill
          const mathQuillScript = document.createElement("script");
          mathQuillScript.src =
            "https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js";
          mathQuillScript.async = false;

          mathQuillScript.onload = () => {
            setMathQuillLoaded(true);
          };

          document.body.appendChild(mathQuillScript);
        };

        document.body.appendChild(jQueryScript);
      } else {
        // jQuery already exists, just load MathQuill
        const mathQuillScript = document.createElement("script");
        mathQuillScript.src =
          "https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js";
        mathQuillScript.async = false;

        mathQuillScript.onload = () => {
          setMathQuillLoaded(true);
        };

        document.body.appendChild(mathQuillScript);
      }

      // Add MathQuill CSS
      const mathQuillCSS = document.createElement("link");
      mathQuillCSS.rel = "stylesheet";
      mathQuillCSS.href =
        "https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css";
      document.head.appendChild(mathQuillCSS);

      // Cleanup function
      return () => {
        // No need to remove scripts as they should persist
      };
    }, [isClient]);

    // Initialize MathQuill when scripts are loaded
    useEffect(() => {
      if (!isClient || !mathQuillLoaded || !mathFieldRef.current) return;

      try {
        // Double check MathQuill is loaded
        if (
          typeof (window as unknown as { MathQuill: unknown }).MathQuill ===
          "undefined"
        ) {
          console.error("MathQuill not found despite being marked as loaded");
          setUseFallback(true);
          return;
        }

        // Access MathQuill from the window object
        const MQ = (
          (
            window as unknown as {
              MathQuill?: { getInterface: (n: number) => unknown };
            }
          ).MathQuill as { getInterface: (n: number) => unknown }
        ).getInterface(2);

        // Create a MathField instance
        const mathField = (
          MQ as { MathField: (el: HTMLDivElement, opts: unknown) => unknown }
        ).MathField(mathFieldRef.current as HTMLDivElement, {
          spaceBehavesLikeTab: true,
          handlers: {
            edit: () => {
              // Get the LaTeX when the field changes
              if (mathField) {
                const latex = (
                  mathField as { latex: (...args: unknown[]) => unknown }
                ).latex();
                setCurrentExpression(latex as string);
                onChange(latex as string);
              }
            },
            enter: () => {
              // Submit on Enter key
              if (onSubmit) {
                onSubmit();
                setShowKeyboard(false);
              }
            },
          },
        });

        // Store the MathField instance
        mathQuillRef.current = mathField;

        // Set initial value
        if (value) {
          (mathField as { latex: (...args: unknown[]) => unknown }).latex(
            value,
          );
        }

        // Focus on the math field
        setTimeout(() => {
          (mathField as { focus: () => void }).focus();
        }, 100);
      } catch (error) {
        console.error("Error initializing MathQuill:", error);
        setUseFallback(true);
      }

      return () => {
        // Cleanup if needed
      };
    }, [isClient, mathQuillLoaded, onChange, onSubmit, value]);

    // Update MathQuill when value changes from parent
    useEffect(() => {
      if (mathQuillRef.current && value !== currentExpression) {
        (
          (mathQuillRef.current as { [key: string]: unknown }).latex as (
            v: string,
          ) => void
        )(value || "");
        setCurrentExpression(value || "");
      }
      setTextInput(value || ""); // For fallback input
    }, [value, currentExpression]);

    // Listen for custom event to close keyboard when answer is submitted
    useEffect(() => {
      const handleCloseKeyboard = () => {
        setShowKeyboard(false);
      };

      window.addEventListener("closeMathKeyboard", handleCloseKeyboard);

      return () => {
        window.removeEventListener("closeMathKeyboard", handleCloseKeyboard);
      };
    }, []);

    // Function to convert plain text math expressions to LaTeX for fallback mode
    const convertToLatex = (text: string): string => {
      let result = text;

      // Convert simple fractions like 3/4 to \frac{3}{4}
      result = result.replace(/(\d+)\/(\d+)/g, "\\frac{$1}{$2}");

      // Convert powers like x^2 to LaTeX format
      result = result.replace(/\^(\w)/g, "^{$1}");

      // Convert sqrt(x) to \sqrt{x}
      result = result.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");

      // Convert sin(x), cos(x), etc. to \sin{x}, \cos{x}, etc.
      const functions = ["sin", "cos", "tan", "log", "ln"];
      functions.forEach((func) => {
        const regex = new RegExp(`${func}\\(([^)]+)\\)`, "g");
        result = result.replace(regex, `\\${func}{$1}`);
      });

      return result;
    };

    // Handle text input for fallback mode
    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      setTextInput(newText);

      // Convert to LaTeX when typing
      const latexVersion = convertToLatex(newText);
      setCurrentExpression(latexVersion);
      onChange(latexVersion);
    };

    // Toggle keyboard visibility
    const toggleKeyboard = () => {
      setShowKeyboard(!showKeyboard);
      // Focus math field when keyboard opens
      if (!showKeyboard && !useFallback && mathQuillRef.current) {
        setTimeout(() => {
          try {
            (
              (mathQuillRef.current as { [key: string]: unknown })
                .focus as () => void
            )();
          } catch {
            // Ignore focus errors
          }
        }, 100);
      }
    };

    // Function to reset the expression
    const clearExpression = () => {
      if (!useFallback && mathQuillRef.current) {
        (
          (mathQuillRef.current as { [key: string]: unknown }).latex as (
            v: string,
          ) => void
        )("");
      }
      setCurrentExpression("");
      setTextInput("");
      onChange("");
    };

    // Handle OCR processing - keeping this method for external use
    const handleOcr = async (imageData: string) => {
      setIsOcrProcessing(true);
      setOcrResult(null);

      try {
        // First try to recognize the math expression
        const mathOcrResponse = await mathOcr(imageData);
        console.log("Math OCR response:", mathOcrResponse);

        if (mathOcrResponse.error) {
          setOcrResult({ error: mathOcrResponse.error });
          return;
        }

        if (!mathOcrResponse.latex) {
          setOcrResult({ error: "Failed to recognize handwriting" });
          return;
        }

        // Successfully recognized the math expression
        const recognizedLatex = mathOcrResponse.latex;

        // Update the math input with the recognized expression
        setCurrentExpression(recognizedLatex);
        onChange(recognizedLatex);

        setOcrResult({ latex: recognizedLatex });

        // If a correct answer is provided, check if the recognized expression is correct
        if (correctAnswer) {
          try {
            const checkResponse = await fetch("/api/check-answer", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_answer: recognizedLatex,
                correct_answer: correctAnswer,
                question_type: "short_answer",
                problem_type: "general",
              }),
            });

            if (checkResponse.ok) {
              const checkResult = await checkResponse.json();
              if (checkResult.is_correct) {
                toast.success("Your answer is correct!");
              } else {
                toast.warning("Your answer is not correct. Try again.");
              }
            }
          } catch (error) {
            console.error("Error checking answer:", error);
          }
        }
      } catch (error) {
        console.error("OCR error:", error);
        setOcrResult({ error: "An error occurred during OCR processing" });
      } finally {
        setIsOcrProcessing(false);
      }
    };

    // Helper: Check if cursor is inside an empty template
    const isCursorInEmptyTemplate = () => {
      if (!mathQuillRef.current) return false;
      // MathQuill exposes the internal cursor and selection
      const mq = mathQuillRef.current as { [key: string]: unknown };
      if (typeof mq.el === "function") {
        const el = mq.el();
        // Find any .mq-empty with .mq-cursor inside
        return !!el.querySelector(".mq-empty .mq-cursor");
      }
      return false;
    };

    // Helper: Remove all empty templates (fractions, roots, exponents)
    const removeEmptyTemplates = () => {
      if (!mathQuillRef.current) return;
      // This is a workaround: re-parse the latex and remove empty templates
      let latex = (
        (mathQuillRef.current as { [key: string]: unknown })
          .latex as () => string
      )();
      // Remove empty fractions: \frac{}{} or \frac{ }{ }
      latex = latex.replace(/\\frac\{\s*\}\{\s*\}/g, "");
      // Remove empty roots: \sqrt{} or \sqrt[3]{}
      latex = latex.replace(/\\sqrt(?:\[\d+\])?\{\s*\}/g, "");
      // Remove empty exponents: ^{} or ^{ }
      latex = latex.replace(/\^\{\s*\}/g, "");
      (
        (mathQuillRef.current as { [key: string]: unknown }).latex as (
          v: string,
        ) => void
      )(latex);
      setCurrentExpression(latex);
      onChange(latex);
    };

    // Insert content into the MathQuill field (with template checks)
    const insertContent = (content: string) => {
      if (useFallback) {
        setTextInput((prev) => prev + content);
        const latexVersion = convertToLatex(textInput + content);
        setCurrentExpression(latexVersion);
        onChange(latexVersion);
        return;
      }
      if (!mathQuillRef.current) return;
      // Prevent stacking empty templates
      if (
        ["\\frac", "\\sqrt", "^", "\\nthroot"].includes(content) &&
        isCursorInEmptyTemplate()
      ) {
        // Optionally, flash the current box to indicate it's not allowed
        const el = (
          (mathQuillRef.current as { [key: string]: unknown })
            .el as () => HTMLElement
        )();
        const empty = el.querySelector(".mq-empty");
        if (empty) {
          empty.classList.add("mq-flash");
          setTimeout(() => empty.classList.remove("mq-flash"), 300);
        }
        return;
      }
      try {
        if (content === "\\frac") {
          (
            (mathQuillRef.current as { [key: string]: unknown }).cmd as (
              v: string,
            ) => void
          )("\\frac");
        } else if (content === "\\sqrt") {
          (
            (mathQuillRef.current as { [key: string]: unknown }).cmd as (
              v: string,
            ) => void
          )("\\sqrt");
        } else if (content === "\\nthroot") {
          (
            (mathQuillRef.current as { [key: string]: unknown }).cmd as (
              v: string,
            ) => void
          )("\\nthroot");
        } else if (content.startsWith("\\")) {
          (
            (mathQuillRef.current as { [key: string]: unknown }).cmd as (
              v: string,
            ) => void
          )(content);
        } else {
          (
            (mathQuillRef.current as { [key: string]: unknown }).write as (
              v: string,
            ) => void
          )(content);
        }
        // Always focus the first input box of a new template
        setTimeout(() => {
          if (!useFallback && mathQuillRef.current) {
            try {
              (
                (mathQuillRef.current as { [key: string]: unknown })
                  .focus as () => void
              )();
            } catch {
              // Ignore focus errors
            }
          }
        }, 10);
      } catch (error) {
        console.error("Error inserting content:", error);
      }
    };

    // Common buttons for the math keyboard
    const basicButtons = [
      { label: "a", value: "a", action: () => insertContent("a") },
      { label: "b", value: "b", action: () => insertContent("b") },
      { label: "c", value: "c", action: () => insertContent("c") },
      { label: "x", value: "x", action: () => insertContent("x") },
      { label: "y", value: "y", action: () => insertContent("y") },
      { label: "z", value: "z", action: () => insertContent("z") },
      { label: "1", value: "1", action: () => insertContent("1") },
      { label: "2", value: "2", action: () => insertContent("2") },
      { label: "3", value: "3", action: () => insertContent("3") },
      { label: "4", value: "4", action: () => insertContent("4") },
      { label: "5", value: "5", action: () => insertContent("5") },
      { label: "6", value: "6", action: () => insertContent("6") },
      { label: "7", value: "7", action: () => insertContent("7") },
      { label: "8", value: "8", action: () => insertContent("8") },
      { label: "9", value: "9", action: () => insertContent("9") },
      { label: "0", value: "0", action: () => insertContent("0") },
      { label: ".", value: ".", action: () => insertContent(".") },
      { label: "+", value: "+", action: () => insertContent("+") },
      { label: "−", value: "-", action: () => insertContent("-") },
      { label: "×", value: "\\cdot", action: () => insertContent("\\cdot") },
      { label: "÷", value: "\\div", action: () => insertContent("\\div") },
      { label: "=", value: "=", action: () => insertContent("=") },
      { label: "(", value: "(", action: () => insertContent("(") },
      { label: ")", value: ")", action: () => insertContent(")") },
    ];

    const exponentButtons = [
      {
        label: "x²",
        value: "x^2",
        action: () => {
          insertContent("x^2");
        },
      },
      {
        label: "x³",
        value: "x^3",
        action: () => {
          insertContent("x^3");
        },
      },
      {
        label: "xⁿ",
        value: "x^n",
        action: () => {
          insertContent("x^n");
        },
      },
      {
        label: "eˣ",
        value: "e^x",
        action: () => {
          insertContent("e^x");
        },
      },
      {
        label: "10ˣ",
        value: "10^x",
        action: () => {
          insertContent("10^x");
        },
      },
      {
        label: "^",
        value: "^",
        action: () => {
          insertContent("^");
        },
      },
      {
        label: "n!",
        value: "n!",
        action: () => {
          insertContent("n!");
        },
      },
    ];

    const fractionButtons = [
      { label: "a/b", value: "\\frac", action: () => insertContent("\\frac") },
      {
        label: "1/2",
        value: "\\frac{1}{2}",
        action: () => {
          if (useFallback) {
            insertContent("\\frac{1}{2}");
          } else {
            insertContent("\\frac");
            insertContent("1");
            insertContent("⏎"); // Move to denominator
            insertContent("2");
          }
        },
      },
      {
        label: "1/3",
        value: "\\frac{1}{3}",
        action: () => {
          if (useFallback) {
            insertContent("\\frac{1}{3}");
          } else {
            insertContent("\\frac");
            insertContent("1");
            insertContent("⏎"); // Move to denominator
            insertContent("3");
          }
        },
      },
      {
        label: "1/4",
        value: "\\frac{1}{4}",
        action: () => {
          if (useFallback) {
            insertContent("\\frac{1}{4}");
          } else {
            insertContent("\\frac");
            insertContent("1");
            insertContent("⏎"); // Move to denominator
            insertContent("4");
          }
        },
      },
      {
        label: "dx/dy",
        value: "\\frac{dx}{dy}",
        action: () => {
          if (useFallback) {
            insertContent("\\frac{dx}{dy}");
          } else {
            insertContent("\\frac");
            insertContent("d");
            insertContent("x");
            insertContent("⏎"); // Move to denominator
            insertContent("d");
            insertContent("y");
          }
        },
      },
    ];

    const functionButtons = [
      { label: "sin", value: "\\sin", action: () => insertContent("\\sin") },
      { label: "cos", value: "\\cos", action: () => insertContent("\\cos") },
      { label: "tan", value: "\\tan", action: () => insertContent("\\tan") },
      { label: "ln", value: "\\ln", action: () => insertContent("\\ln") },
      { label: "log", value: "\\log", action: () => insertContent("\\log") },
      { label: "√", value: "\\sqrt", action: () => insertContent("\\sqrt") },
      {
        label: "∛",
        value: "\\sqrt[3]",
        action: () => {
          if (useFallback) {
            insertContent("\\sqrt[3]{}");
          } else {
            insertContent("\\nthroot");
            insertContent("3");
            insertContent("⏎"); // Move to radicand
          }
        },
      },
    ];

    const calculusButtons = [
      { label: "∫", value: "\\int", action: () => insertContent("\\int") },
      {
        label: "∫ₐᵇ",
        value: "\\int_{a}^{b}",
        action: () => insertContent("\\int_a^b"),
      },
      { label: "∑", value: "\\sum", action: () => insertContent("\\sum") },
      {
        label: "∑ᵢⁿ",
        value: "\\sum_{i=1}^{n}",
        action: () => insertContent("\\sum_{i=1}^n"),
      },
      { label: "lim", value: "\\lim", action: () => insertContent("\\lim") },
      {
        label: "∂",
        value: "\\partial",
        action: () => insertContent("\\partial"),
      },
    ];

    const symbolButtons = [
      { label: "π", value: "\\pi", action: () => insertContent("\\pi") },
      { label: "∞", value: "\\infty", action: () => insertContent("\\infty") },
      { label: "θ", value: "\\theta", action: () => insertContent("\\theta") },
      { label: "±", value: "\\pm", action: () => insertContent("\\pm") },
      { label: "≤", value: "\\le", action: () => insertContent("\\le") },
      { label: "≥", value: "\\ge", action: () => insertContent("\\ge") },
      { label: "≠", value: "\\ne", action: () => insertContent("\\ne") },
    ];

    return (
      <div className="w-full">
        <Head>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css"
          />
        </Head>

        <div className="relative w-full flex items-center">
          {/* Input field - either MathQuill or fallback */}
          <div
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${disabled ? "opacity-50" : ""} min-h-[46px] flex items-center`}
            onClick={() => !disabled && setShowKeyboard(true)}
            onBlur={removeEmptyTemplates}
          >
            {isClient && !useFallback ? (
              <div
                ref={mathFieldRef}
                className="mathquill-editor w-full"
                style={{ minHeight: "28px" }}
              >
                {!mathQuillLoaded && !value && (
                  <span className="text-gray-400">{placeholder}</span>
                )}
              </div>
            ) : useFallback ? (
              // Fallback to regular input with LaTeX preview
              <div className="w-full flex flex-col">
                <div className="mb-1">
                  <input
                    type="text"
                    value={textInput}
                    onChange={handleTextInputChange}
                    placeholder={placeholder}
                    className="w-full bg-transparent outline-none border-none p-0"
                    disabled={disabled}
                    onBlur={removeEmptyTemplates}
                  />
                </div>
                {currentExpression && (
                  <div className="text-gray-600 dark:text-gray-300">
                    <InlineMath math={currentExpression} />
                  </div>
                )}
              </div>
            ) : // Server-side rendering fallback
            currentExpression ? (
              <InlineMath math={currentExpression} />
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>

          {/* Toggle button */}
          <Button
            variant={showKeyboard ? "default" : "outline"}
            className="ml-2"
            disabled={disabled}
            type="button"
            onClick={toggleKeyboard}
          >
            Σ
          </Button>
        </div>

        {/* Math keyboard (only shown when toggled) */}
        {showKeyboard && (
          <div className="mt-1 border rounded-lg shadow-md bg-white dark:bg-gray-800 overflow-hidden">
            <div className="p-3 border-b">
              {/* Action buttons */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearExpression}
                  size="sm"
                >
                  Clear
                </Button>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowKeyboard(false)}
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>

            {/* Symbol tabs */}
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="w-full grid grid-cols-6 bg-gray-50 dark:bg-gray-900">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="exponents">Powers</TabsTrigger>
                <TabsTrigger value="fractions">Fractions</TabsTrigger>
                <TabsTrigger value="functions">Functions</TabsTrigger>
                <TabsTrigger value="calculus">Calculus</TabsTrigger>
                <TabsTrigger value="symbols">Symbols</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="p-2">
                <div className="grid grid-cols-6 gap-1">
                  {basicButtons.map((button) => (
                    <Button
                      key={button.value}
                      variant="ghost"
                      type="button"
                      onClick={button.action}
                      className="px-2 py-1 h-8 text-sm"
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="exponents" className="p-2">
                <div className="flex flex-wrap gap-1">
                  {exponentButtons.map((button) => (
                    <Button
                      key={button.value}
                      variant="ghost"
                      type="button"
                      onClick={button.action}
                      className="px-2 py-1 h-8 text-sm"
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="fractions" className="p-2">
                <div className="flex flex-wrap gap-1">
                  {fractionButtons.map((button, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      type="button"
                      onClick={button.action}
                      className="px-2 py-1 h-8 text-sm"
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="functions" className="p-2">
                <div className="flex flex-wrap gap-1">
                  {functionButtons.map((button, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      type="button"
                      onClick={button.action}
                      className="px-2 py-1 h-8 text-sm"
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="calculus" className="p-2">
                <div className="flex flex-wrap gap-1">
                  {calculusButtons.map((button, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      type="button"
                      onClick={button.action}
                      className="px-2 py-1 h-8 text-sm"
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="symbols" className="p-2">
                <div className="flex flex-wrap gap-1">
                  {symbolButtons.map((button) => (
                    <Button
                      key={button.value}
                      variant="ghost"
                      type="button"
                      onClick={button.action}
                      className="px-2 py-1 h-8 text-sm"
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-xs text-gray-500 dark:text-gray-400 p-2 border-t">
              Type directly or click buttons above to insert math symbols
            </div>
          </div>
        )}

        {/* OCR Integration */}
        {enableOcr && (
          <div className="mt-2">
            {/* Processing indicator (keep this) */}
            {isOcrProcessing && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </div>
            )}

            {/* Remove the whiteboard component */}

            {/* OCR Result Feedback */}
            {ocrResult && (
              <div
                className={`p-3 mt-2 rounded-lg text-sm ${
                  ocrResult.error
                    ? "bg-amber-50 border border-amber-200 text-amber-800"
                    : "bg-green-50 border border-green-200 text-green-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {ocrResult.error ? (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                  <p>
                    {ocrResult.error
                      ? ocrResult.error
                      : "Successfully recognized your handwriting!"}
                  </p>
                </div>
                {ocrResult.latex && (
                  <div className="mt-1 text-gray-700 bg-white p-2 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">
                      Recognized LaTeX:
                    </p>
                    <div className="font-mono text-xs mb-2 bg-gray-50 p-1 rounded border border-gray-200">
                      {ocrResult.latex}
                    </div>
                    <div className="mt-1">
                      <InlineMath math={ocrResult.latex} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);
