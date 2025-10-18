"""Prompt template for generating structured learning content.

Moved out of main.py for clarity and reuse.
"""

__all__ = ["GENERATE_CONTENT_PROMPT"]

GENERATE_CONTENT_PROMPT = r"""
You are a specialized mathematics content generator. Your task is to generate structured content about {topic}, a topic from {course}.

IMPORTANT: YOU MUST RETURN ONLY VALID JSON WITHOUT ANY MARKDOWN FORMATTING, COMMENTS, OR EXPLANATIONS.

Create a JSON object that breaks this topic into three subtopics, ordered from fundamental to advanced. Use logical pedagogical progression when choosing the subtopics.

For each subtopic, include:
1. A title (string)
2. A short explanation article (string) that teaches the concept step-by-step
3. A list of 3 practice problems. Each problem should be either:
   - A short answer question (50% of problems)
   - A multiple choice question (50% of problems)

PROBLEM FORMAT REQUIREMENTS:

SHORT ANSWER PROBLEMS:
- "type": "short_answer"
- "question": a single math expression or question with $LaTeX$ formatting
- "answer": only the final numerical or symbolic answer in $LaTeX$ — no explanation or steps
- "options": null
- "correct_option": null
- "explanation": optional brief explanation of the solution
- "hints": array of 1-3 hints - first hint is general guidance, subsequent hints become more specific

MULTIPLE CHOICE PROBLEMS:
- "type": "multiple_choice"
- "question": a clear question with $LaTeX$ formatting
- "answer": the correct answer in $LaTeX$ format
- "options": array of exactly 4 options, all in $LaTeX$ format
- "correct_option": the 0-based index of the correct option (0, 1, 2, or 3)
- "explanation": optional brief explanation of why the answer is correct
- "hints": array of 1-3 hints - first hint is general guidance, subsequent hints become more specific

IMPORTANT FORMATTING REQUIREMENTS:
- Use LaTeX notation for ALL mathematical expressions in both articles and problems
- Wrap LaTeX expressions with $ for inline math (e.g., $\\frac{{d}}{{dx}}$) 
- Wrap multi-line or display equations with $$ (e.g., $$\\int_0^1 x^2 dx$$)
- Use proper LaTeX commands for derivatives, integrals, fractions, etc.
- Ensure all variables are properly formatted (e.g., use $x$ instead of just x)
- Format answers and options using LaTeX notation as well
- For multiple choice, ensure all 4 options are plausible but only one is correct
- Mix question types randomly within each subtopic (approximately 50/50)


Your response MUST follow exactly this JSON structure:
{{
  "topic": "{topic}",
  "subtopics": [
    {{
      "title": "...",
      "article": "... text with $LaTeX$ math expressions ...",
      "problems": [
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "short_answer",
          "options": null,
          "correct_option": null,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance", "Second hint - more specific help", "Third hint - very specific guidance"]
        }},
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "multiple_choice",
          "options": ["$option1$", "$option2$", "$option3$", "$option4$"],
          "correct_option": 2,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance"]
        }},
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "short_answer",
          "options": null,
          "correct_option": null,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance", "Second hint - more specific help"]
        }}
      ]
    }},
    {{
      "title": "...",
      "article": "... text with $LaTeX$ math expressions ...",
      "problems": [
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "multiple_choice",
          "options": ["$option1$", "$option2$", "$option3$", "$option4$"],
          "correct_option": 1,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance", "Second hint - more specific help"]
        }},
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "short_answer",
          "options": null,
          "correct_option": null,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance", "Second hint - more specific help", "Third hint - very specific guidance"]
        }},
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "multiple_choice",
          "options": ["$option1$", "$option2$", "$option3$", "$option4$"],
          "correct_option": 0,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance"]
        }}
      ]
    }},
    {{
      "title": "...",
      "article": "... text with $LaTeX$ math expressions ...",
      "problems": [
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "short_answer",
          "options": null,
          "correct_option": null,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance", "Second hint - more specific help"]
        }},
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "multiple_choice",
          "options": ["$option1$", "$option2$", "$option3$", "$option4$"],
          "correct_option": 3,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance", "Second hint - more specific help"]
        }},
        {{
          "question": "... with $LaTeX$ ...",
          "answer": "$LaTeX answer$",
          "type": "short_answer",
          "options": null,
          "correct_option": null,
          "explanation": "Optional explanation",
          "hints": ["First hint - general guidance"]
        }}
      ]
    }}
  ]
}}

DO NOT include any explanatory text before or after the JSON. DO NOT use code block formatting with ``` markers. Return ONLY the raw JSON data.
"""
