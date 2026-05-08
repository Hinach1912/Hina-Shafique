from data import MOVIES, BOOKS, TRAVEL
from typing import Any

# ─── Weights: how much each field contributes to the score ───────────────────
MOVIE_WEIGHTS = {
    "genre": 35,
    "mood": 30,
    "era": 15,
    "duration": 10,
    "language": 10,
}

BOOK_WEIGHTS = {
    "genre": 35,
    "mood": 25,
    "length": 15,
    "pace": 15,
    "era": 10,
}

TRAVEL_WEIGHTS = {
    "type": 30,
    "climate": 25,
    "budget": 20,
    "pace": 15,
    "duration": 10,
}


def score_movie(movie: dict, prefs: dict) -> float:
    score = 0.0

    # Genre match
    if movie["genre"] == prefs.get("genre"):
        score += MOVIE_WEIGHTS["genre"]
    elif prefs.get("genre") in movie.get("tags", []):
        score += MOVIE_WEIGHTS["genre"] * 0.5

    # Mood match
    if movie["mood"] == prefs.get("mood"):
        score += MOVIE_WEIGHTS["mood"]

    # Era match
    if movie["era"] == prefs.get("era"):
        score += MOVIE_WEIGHTS["era"]

    # Duration match
    if movie["duration"] == prefs.get("duration"):
        score += MOVIE_WEIGHTS["duration"]

    # Language match
    if prefs.get("language") == "any":
        score += MOVIE_WEIGHTS["language"]
    elif movie["language"] == prefs.get("language"):
        score += MOVIE_WEIGHTS["language"]

    # Rating bonus (0–5 extra points)
    score += (movie["rating"] - 7.0) * 2.5

    # Clamp to 0–105
    return max(0.0, min(score, 105.0))


def score_book(book: dict, prefs: dict) -> float:
    score = 0.0

    if book["genre"] == prefs.get("genre"):
        score += BOOK_WEIGHTS["genre"]
    elif prefs.get("genre") in book.get("tags", []):
        score += BOOK_WEIGHTS["genre"] * 0.5

    if book["mood"] == prefs.get("mood"):
        score += BOOK_WEIGHTS["mood"]

    if book["length"] == prefs.get("length"):
        score += BOOK_WEIGHTS["length"]

    if book["pace"] == prefs.get("pace"):
        score += BOOK_WEIGHTS["pace"]

    if book["era"] == prefs.get("era"):
        score += BOOK_WEIGHTS["era"]

    return max(0.0, min(score, 100.0))


def score_travel(dest: dict, prefs: dict) -> float:
    score = 0.0

    if dest["type"] == prefs.get("type"):
        score += TRAVEL_WEIGHTS["type"]

    if dest["climate"] == prefs.get("climate"):
        score += TRAVEL_WEIGHTS["climate"]

    if dest["budget"] == prefs.get("budget"):
        score += TRAVEL_WEIGHTS["budget"]

    if dest["pace"] == prefs.get("pace"):
        score += TRAVEL_WEIGHTS["pace"]

    if dest["duration"] == prefs.get("duration"):
        score += TRAVEL_WEIGHTS["duration"]

    # Visa ease bonus
    if dest["visa_ease"] == "easy":
        score += 5

    return max(0.0, min(score, 105.0))


def get_recommendations(category: str, preferences: dict, top_n: int = 5) -> list[dict[str, Any]]:
    """
    Main entry point. Returns top_n recommendations for the given category.
    Each result includes the item data + a 'score' and 'match_percent'.
    """
    if category == "movies":
        dataset = MOVIES
        score_fn = score_movie
    elif category == "books":
        dataset = BOOKS
        score_fn = score_book
    elif category == "travel":
        dataset = TRAVEL
        score_fn = score_travel
    else:
        return []

    scored = []
    for item in dataset:
        s = score_fn(item, preferences)
        entry = dict(item)
        entry["score"] = round(s, 1)
        entry["match_percent"] = round((s / 100) * 100, 1)
        scored.append(entry)

    # Sort descending by score
    scored.sort(key=lambda x: x["score"], reverse=True)

    return scored[:top_n]
