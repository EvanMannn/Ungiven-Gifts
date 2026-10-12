import pytest
from fastapi.testclient import TestClient

from ungiven_gifts_api.main import create_app
from ungiven_gifts_api.repository import InMemoryEventRepository, get_repository


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    repo = InMemoryEventRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    return TestClient(app)


@pytest.fixture
def event_payload() -> dict:
    return {
        "name": "Playgroup Secret Santa 2026",
        "format": "Commander",
        "budget": "$40",
        "admin_password": "admin-pw",
        "questions": ["Favorite colors?", "Pet cards?"],
        "restrictions": [
            {"title": "Mono-colored", "description": "One color only."},
            {"title": "No mythics"},
            {"title": "Tribal"},
            {"title": "Under $25"},
        ],
        "participants": [
            {
                "name": "Alice",
                "answers": {"Favorite colors?": "Golgari", "Pet cards?": "Mulldrifter"},
            },
            {"name": "Bob", "answers": {"Favorite colors?": "Izzet"}},
            {"name": "Cara"},
            {"name": "Dan"},
        ],
    }
