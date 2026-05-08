from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os

from recommender import get_recommendations

app = FastAPI(
    title="Smart Recommendation System",
    description="Get personalized recommendations for Movies, Books, and Travel destinations.",
    version="1.0.0",
)

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class MoviePreferences(BaseModel):
    genre: str           # sci-fi | drama | thriller | comedy | romance | action | animation
    mood: str            # mind-bending | inspiring | dark | whimsical | epic | intense | entertaining | humorous
    era: str             # classic | modern
    duration: str        # short | medium | long
    language: str        # english | foreign | any

class BookPreferences(BaseModel):
    genre: str           # sci-fi | fantasy | non-fiction | dystopian | self-help | literary-fiction | mystery | memoir
    mood: str            # epic | informative | humorous | dark | motivating | melancholic | hopeful | inspiring
    length: str          # short | medium | long
    pace: str            # slow | medium | fast
    era: str             # classic | modern

class TravelPreferences(BaseModel):
    type: str            # cultural | scenic | adventure | wellness | urban | beach
    climate: str         # temperate | mediterranean | cold | hot | tropical
    budget: str          # low | medium | high
    pace: str            # relaxed | active | fast
    duration: str        # weekend | week | two-weeks

class RecommendationRequest(BaseModel):
    category: str        # movies | books | travel
    preferences: dict
    top_n: Optional[int] = 5


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Serve the frontend HTML."""
    return FileResponse("static/index.html")


@app.post("/recommend")
async def recommend(request: RecommendationRequest):
    """
    Main recommendation endpoint.
    POST { category: "movies"|"books"|"travel", preferences: {...}, top_n: 5 }
    """
    category = request.category.lower()
    if category not in ["movies", "books", "travel"]:
        raise HTTPException(status_code=400, detail="category must be 'movies', 'books', or 'travel'")

    results = get_recommendations(category, request.preferences, request.top_n)

    if not results:
        raise HTTPException(status_code=404, detail="No recommendations found.")

    return {
        "category": category,
        "preferences": request.preferences,
        "count": len(results),
        "recommendations": results
    }


@app.get("/options/{category}")
async def get_options(category: str):
    """Returns all valid preference options for a given category."""
    options = {
        "movies": {
            "genre": ["sci-fi", "drama", "thriller", "comedy", "romance", "action", "animation"],
            "mood": ["mind-bending", "inspiring", "dark", "whimsical", "epic", "intense", "entertaining", "humorous"],
            "era": ["classic", "modern"],
            "duration": ["short", "medium", "long"],
            "language": ["english", "foreign", "any"]
        },
        "books": {
            "genre": ["sci-fi", "fantasy", "non-fiction", "dystopian", "self-help", "literary-fiction", "mystery", "memoir"],
            "mood": ["epic", "informative", "humorous", "dark", "motivating", "melancholic", "hopeful", "inspiring"],
            "length": ["short", "medium", "long"],
            "pace": ["slow", "medium", "fast"],
            "era": ["classic", "modern"]
        },
        "travel": {
            "type": ["cultural", "scenic", "adventure", "wellness", "urban", "beach"],
            "climate": ["temperate", "mediterranean", "cold", "hot", "tropical"],
            "budget": ["low", "medium", "high"],
            "pace": ["relaxed", "active", "fast"],
            "duration": ["weekend", "week", "two-weeks"]
        }
    }

    if category not in options:
        raise HTTPException(status_code=404, detail="Category not found")

    return options[category]


@app.get("/health")
async def health():
    return {"status": "ok", "message": "Recommendation system is running!"}


# ─── Mount static files ───────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")
