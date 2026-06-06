#!/usr/bin/env python3
"""Eval runner — runs all cases through the grading engine and reports pass/fail."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "grader"))
import grader as engine

SCORE_TOLERANCE = 1


def evaluate_case(case: dict) -> dict:
    cid = case["id"]
    try:
        result = engine.grade(
            question=case["question"],
            rubric=case["rubric"],
            student_answer=case["studentAnswer"],
            max_score=case["maxScore"],
        )
    except Exception as exc:
        return {
            "id": cid,
            "passed": False,
            "failures": [f"Exception during grading: {exc}"],
            "actual": {},
        }

    failures = []

    # Score within tolerance
    actual_score = result["score"]
    expected_score = case["expectedScore"]
    if abs(actual_score - expected_score) > SCORE_TOLERANCE:
        failures.append(
            f"score: expected {expected_score} (±{SCORE_TOLERANCE}), got {actual_score}"
        )

    # Status must match exactly
    if result["status"] != case["expectedStatus"]:
        failures.append(
            f"status: expected '{case['expectedStatus']}', got '{result['status']}'"
        )

    # needsHumanReview: only enforced when the case expects True
    if case["expectedNeedsHumanReview"] and not result["needsHumanReview"]:
        failures.append("needsHumanReview: expected True, got False")

    return {
        "id": cid,
        "passed": len(failures) == 0,
        "failures": failures,
        "actual": {
            "score": actual_score,
            "status": result["status"],
            "needsHumanReview": result["needsHumanReview"],
            "confidence": result["confidence"],
        },
    }


def main():
    cases_path = Path(__file__).parent / "cases.json"
    with open(cases_path) as f:
        cases = json.load(f)

    print(f"Running {len(cases)} eval cases...\n")

    results = []
    for case in cases:
        print(f"  [{case['id']}] ", end="", flush=True)
        r = evaluate_case(case)
        results.append(r)

        if r["passed"]:
            a = r["actual"]
            print(f"PASS  score={a['score']}/{case['maxScore']}  status={a['status']}")
        else:
            print("FAIL")
            for msg in r["failures"]:
                print(f"         -> {msg}")

    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    pass_rate = passed / total * 100 if total else 0

    print(f"\n{'=' * 48}")
    print(f"  Total cases : {total}")
    print(f"  Passed      : {passed}")
    print(f"  Failed      : {failed}")
    print(f"  Pass rate   : {pass_rate:.1f}%")
    print(f"{'=' * 48}")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
