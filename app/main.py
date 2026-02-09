from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import dates, flights, airports

app = FastAPI(title="Flight Finder")

app.include_router(dates.router, prefix="/api/search")
app.include_router(flights.router, prefix="/api/search")
app.include_router(airports.router, prefix="/api")

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
def index():
    return FileResponse("app/static/index.html")
