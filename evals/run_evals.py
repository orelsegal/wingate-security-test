#!/usr/bin/env python3
"""Eval runner — runs all cases through the grading engine and reports PASS/FAIL/ERROR/SKIPPED."""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "grader"))
import grader as engine

SCORE_TOLERANCE = 1


def evaluate_case(case: dict) -> dict:
    try:
        result = engine.grade(
            question=case["question"],
            rubric=case["rubric"],
            student_answer=case["studentAnswer"],
            max_score=case["maxScore"],
        )
    except Exception as exc:
        return {"outcome": "ERROR", "reason": str(exc)}

    failures = []

    actual_score = result["score"]
    expected_score = case["expectedScore"]
    if abs(actual_score - expected_score) > SCORE_TOLERANCE:
        failures.append(
            f"score expected={expected_score}(±{SCORE_TOLERANCE}) actual={actual_score}"
        )

    if result["status"] != case["expectedStatus"]:
        failures.append(
            f"status expected={case['expectedStatus']} actual={result['status']}"
        )

    if case["expectedNeedsHumanReview"] and not result["needsHumanReview"]:
        failures.append("needsHumanReview expected=True actual=False")

    if failures:
        return {
            "outcome": "FAIL",
            "reason": "; ".join(failures),
            "actual_score": actual_score,
            "expected_score": expected_score,
        }

    return {
        "outcome": "PASS",
        "actual_score": actual_score,
        "expected_score": expected_score,
        "actual_status": result["status"],
    }


def main():
    cases_path = Path(__file__).parent / "cases.json"
    with open(cases_path) as f:
        cases = json.load(f)

    # Fail fast if API key is missing — mark all cases ERROR and stop.
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY is not set. Cannot run evals.\n")
        for case in cases:
            print(f'  ERROR   {case["id"]}  reason="Missing ANTHROPIC_API_KEY"')
        total = len(cases)
        print(f"\n{'=' * 54}")
        print(f"  Total cases : {total}")
        print(f"  Passed      : 0")
        print(f"  Failed      : 0")
        print(f"  Errors      : {total}")
        print(f"  Skipped     : 0")
        print(f"  Pass rate   : n/a (all cases errored)")
        print(f"{'=' * 54}")
        sys.exit(2)

    print(f"Running {len(cases)} eval cases...\n")

    results = []
    for case in cases:
        r = evaluate_case(case)
        r["id"] = case["id"]
        results.append(r)

        cid = case["id"]
        outcome = r["outcome"]

        if outcome == "PASS":
            print(
                f"  PASS    {cid}"
                f"  expected={r['expected_score']}"
                f"  actual={r['actual_score']}"
                f"  status={r['actual_status']}"
            )
        elif outcome == "FAIL":
            print(
                f"  FAIL    {cid}"
                f"  expected={r['expected_score']}"
                f"  actual={r['actual_score']}"
                f'  reason="{r["reason"]}"'
            )
        elif outcome == "ERROR":
            print(f'  ERROR   {cid}  reason="{r["reason"]}"')
        elif outcome == "SKIPPED":
            print(f"  SKIPPED {cid}")

    total = len(results)
    passed  = sum(1 for r in results if r["outcome"] == "PASS")
    failed  = sum(1 for r in results if r["outcome"] == "FAIL")
    errors  = sum(1 for r in results if r["outcome"] == "ERROR")
    skipped = sum(1 for r in results if r["outcome"] == "SKIPPED")
    gradeable = total - errors - skipped
    pass_rate = (passed / gradeable * 100) if gradeable > 0 else 0.0

    print(f"\n{'=' * 54}")
    print(f"  Total cases : {total}")
    print(f"  Passed      : {passed}")
    print(f"  Failed      : {failed}")
    print(f"  Errors      : {errors}")
    print(f"  Skipped     : {skipped}")
    print(f"  Pass rate   : {pass_rate:.1f}%")
    print(f"{'=' * 54}")

    sys.exit(0 if (failed == 0 and errors == 0) else 1)


if __name__ == "__main__":
    main()
