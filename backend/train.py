"""CLI entry point: ``python -m backend.train [--mode sms|email|all]``."""

from __future__ import annotations

import argparse
import logging
import sys

from .model import MODELS_DIR, MODES, DatasetError, ModelError, train_mode

LOGGER = logging.getLogger("backend.train")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Train the spam classifier models.")
    parser.add_argument(
        "--mode",
        choices=[*MODES, "all"],
        default="all",
        help="Which model to train (default: all).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Train the requested modes and print a short summary."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = parse_args(argv)
    modes = MODES if args.mode == "all" else (args.mode,)
    failures: list[str] = []

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for mode in modes:
        try:
            payload = train_mode(mode)
        except (DatasetError, ModelError, OSError) as exc:
            LOGGER.error("Training failed for %s mode: %s", mode, exc)
            failures.append(f"{mode}: {exc}")
            continue

        metrics = payload["metrics"]
        matrix = payload["confusion_matrix"]
        dataset = payload["dataset"]
        print(f"\n=== {mode.upper()} ({dataset['dataset_name']}) ===")
        print(
            f"rows: {dataset['rows_after_cleaning']} "
            f"(spam {dataset['spam_count']} / ham {dataset['ham_count']}, "
            f"duplicates removed {dataset['duplicates_removed']})"
        )
        print(f"train/test: {dataset['train_size']}/{dataset['test_size']}")
        print(
            f"accuracy {metrics['accuracy']:.4f} | precision {metrics['precision']:.4f} | "
            f"recall {metrics['recall']:.4f} | f1 {metrics['f1']:.4f} (weighted)"
        )
        spam = payload["spam_metrics"]
        print(
            f"spam class: precision {spam['precision']:.4f} | recall {spam['recall']:.4f} | "
            f"f1 {spam['f1']:.4f} | support {spam['support']}"
        )
        print(f"confusion: TN={matrix['tn']} FP={matrix['fp']} FN={matrix['fn']} TP={matrix['tp']}")
        print(f"top spam words: {', '.join(word['word'] for word in payload['top_spam_words'][:8])}")

    if failures:
        print("\nFailures:")
        for failure in failures:
            print(f" - {failure}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
