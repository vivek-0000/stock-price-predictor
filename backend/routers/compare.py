from fastapi import APIRouter, HTTPException, Query
from core.model_manager import model_manager
from core.inference import tf_historical, pt_historical

router = APIRouter()


@router.get("/compare")
def compare(
    ticker: str = Query("GOOG", description="Stock ticker symbol")
):
    """
    Runs both TF and PyTorch models on the same test data and returns
    side-by-side metrics + predictions for chart overlay.
    """
    ticker = ticker.upper()

    if not model_manager.ready["tf"] and not model_manager.ready["pt"]:
        raise HTTPException(503, "No models loaded.")

    result = {"ticker": ticker, "models": {}}

    if model_manager.ready["tf"]:
        try:
            tf_result = tf_historical(model_manager.tf_model, ticker)
            result["models"]["tensorflow"] = {
                "metrics":   tf_result["metrics"],
                "predicted": tf_result["predicted"],
                "dates":     tf_result["dates"],
                "actual":    tf_result["actual"],
            }
        except Exception as e:
            result["models"]["tensorflow"] = {"error": str(e)}

    if model_manager.ready["pt"]:
        try:
            pt_result = pt_historical(
                model_manager.pt_model,
                model_manager.pt_scalers,
                ticker
            )
            result["models"]["pytorch"] = {
                "metrics":   pt_result["metrics"],
                "predicted": pt_result["predicted"],
                "dates":     pt_result["dates"],
                "actual":    pt_result["actual"],
            }
        except Exception as e:
            result["models"]["pytorch"] = {"error": str(e)}

    # ── Winner per metric ─────────────────────────────────────────────────────
    if "tensorflow" in result["models"] and "pytorch" in result["models"]:
        tf_m = result["models"]["tensorflow"].get("metrics", {})
        pt_m = result["models"]["pytorch"].get("metrics", {})

        winners = {}
        for metric in ["mae", "rmse", "mape"]:
            if metric in tf_m and metric in pt_m:
                winners[metric] = "tensorflow" if tf_m[metric] < pt_m[metric] else "pytorch"
        if "r2" in tf_m and "r2" in pt_m:
            winners["r2"] = "tensorflow" if tf_m["r2"] > pt_m["r2"] else "pytorch"

        result["winners"] = winners
        result["overall_winner"] = max(
            set(winners.values()), key=list(winners.values()).count
        )

    return result
