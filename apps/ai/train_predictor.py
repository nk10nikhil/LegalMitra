import pickle
from pathlib import Path

import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "models" / "case_outcome_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data" / "case_outcomes_sample.csv"


def build_features(frame: pd.DataFrame):
    return pd.DataFrame(
        {
            "year": frame["year"],
            "acts_cited_count": frame["acts_cited_count"],
            "prior_hearings": frame["prior_hearings"],
            "court_len": frame["court"].str.len(),
            "petitioner_len": frame["petitioner_type"].str.len(),
            "respondent_len": frame["respondent_type"].str.len(),
        }
    )


def main():
    frame = pd.read_csv(DATA_PATH)
    x = build_features(frame)
    y = frame["outcome"]

    model = None
    model_name = None

    try:
        from xgboost import XGBClassifier

        model = XGBClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            eval_metric="logloss",
        )
        model_name = "xgboost"
    except Exception:
        from sklearn.ensemble import RandomForestClassifier

        model = RandomForestClassifier(n_estimators=200, random_state=42)
        model_name = "random_forest"

    model.fit(x, y)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    with MODEL_PATH.open("wb") as target:
        pickle.dump(model, target)

    print(f"Saved {model_name} model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
