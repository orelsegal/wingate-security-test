#!/usr/bin/env python3
"""Minimal grading engine POC — grades one student answer against a rubric using Claude."""

import json
import os
import sys

import anthropic

PROMPT_TEMPLATE = """You are a strict academic grader. Grade the student's answer against the rubric below.

QUESTION:
{question}

RUBRIC / OFFICIAL ANSWER:
{rubric}

STUDENT ANSWER:
{student_answer}

MAX SCORE: {max_score}

Grading rules:
- Base your grade solely on the rubric. Do not invent criteria not present in the rubric.
- score must be between 0 and {max_score}. Never exceed maxScore.
- status must be one of: "correct" (full marks), "partial" (some marks), "incorrect" (0 marks), "unclear" (cannot determine).
- Set needsHumanReview to true if the answer is ambiguous, off-topic, or your confidence is below 0.6.
- missingElements: list each rubric criterion the student failed to address. Empty array if none.
- improvedAnswer: a model answer that would earn full marks, based only on the rubric.
- confidence: your certainty in this grade, from 0.0 (no confidence) to 1.0 (certain).

Return ONLY a valid JSON object with exactly these fields and no other text:
{{
  "score": <number>,
  "maxScore": <number>,
  "status": <"correct" | "partial" | "incorrect" | "unclear">,
  "studentFeedback": <string, friendly and constructive feedback addressed to the student>,
  "teacherExplanation": <string, detailed grading rationale for the teacher>,
  "missingElements": <array of strings>,
  "improvedAnswer": <string>,
  "confidence": <float 0.0-1.0>,
  "needsHumanReview": <boolean>
}}"""

REQUIRED_FIELDS = [
    "score", "maxScore", "status", "studentFeedback", "teacherExplanation",
    "missingElements", "improvedAnswer", "confidence", "needsHumanReview",
]

VALID_STATUSES = {"correct", "partial", "incorrect", "unclear"}


def no_rubric_result(max_score: int) -> dict:
    return {
        "score": 0,
        "maxScore": max_score,
        "status": "unclear",
        "studentFeedback": "Your answer could not be graded because no rubric or official answer was provided.",
        "teacherExplanation": "No rubric was supplied. Grading requires a rubric.",
        "missingElements": [],
        "improvedAnswer": "",
        "confidence": 0.0,
        "needsHumanReview": True,
    }


def grade(question: str, rubric: str, student_answer: str, max_score: int) -> dict:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise EnvironmentError("ANTHROPIC_API_KEY environment variable is not set.")

    client = anthropic.Anthropic()

    prompt = PROMPT_TEMPLATE.format(
        question=question,
        rubric=rubric,
        student_answer=student_answer,
        max_score=max_score,
    )

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    # Strip markdown code fences if the model wraps the JSON
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    result = json.loads(raw)

    for field in REQUIRED_FIELDS:
        if field not in result:
            raise ValueError(f"Response is missing required field: {field}")

    if result["status"] not in VALID_STATUSES:
        raise ValueError(f"Invalid status value: {result['status']}")

    # Enforce hard cap — model must never exceed maxScore
    result["score"] = min(result["score"], max_score)
    result["maxScore"] = max_score

    # Auto-flag low-confidence results for human review
    if result["confidence"] < 0.6:
        result["needsHumanReview"] = True

    return result


def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else "inputs.json"

    with open(input_file) as f:
        inputs = json.load(f)

    rubric = inputs.get("rubric", "").strip()
    if not rubric:
        result = no_rubric_result(inputs.get("maxScore", 0))
        print(json.dumps(result, indent=2))
        return

    result = grade(
        question=inputs["question"],
        rubric=rubric,
        student_answer=inputs["studentAnswer"],
        max_score=inputs["maxScore"],
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
