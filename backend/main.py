from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:63342"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Food(BaseModel):
    name: str


@app.get("/")
def home():
    return {
        "name": "Milk",
        "expirationDate": "2025-06-11"
    }


@app.post("/food")
def receive_food(food: Food):
    print(food)
    return {
        "message": "I received the food!",
        "name": food.name
    }

@app.post("/scan")
async def scan_food(photo: UploadFile = File(...)):
    contents = await photo.read()

    with open("uploaded_food.jpg", "wb") as file:
        file.write(contents)

    print(photo.filename)
    print("Image saved successfully!")
    print("File size:", len(contents), "bytes")
    return {"message": "Photo saved!"}