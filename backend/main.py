from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pytesseract
from PIL import Image
from dotenv import load_dotenv
import os
from openai import OpenAI

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

print("Key loaded:", api_key is not None)
print("Key length:", len(api_key))
print("ASCII:", api_key.isascii())
client = OpenAI(api_key=api_key)

response = client.responses.create(
    model="gpt-5.5",
    input="Say hello to FreshFood in one short sentence."
)

print(response.output_text)




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

    text = pytesseract.image_to_string(Image.open("uploaded_food.jpg"))

    print(photo.filename)
    print("Image saved successfully!")
    print("File size:", len(contents), "bytes")
    print(f"OCR result: {text}")
    return {"message": "Photo saved!",
            "text": text}