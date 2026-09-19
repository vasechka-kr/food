import os
import base64
import json
import io
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
from dotenv import load_dotenv
from openai import OpenAI
from openai.types.chat import (
    ChatCompletionUserMessageParam,
    ChatCompletionContentPartTextParam,
    ChatCompletionContentPartImageParam
)

from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles



load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

proxy_address = os.getenv("WEBSHARE_PROXY_ADDRESS")
proxy_port = os.getenv("WEBSHARE_PROXY_PORT")
proxy_username = os.getenv("WEBSHARE_PROXY_USERNAME")
proxy_password = os.getenv("WEBSHARE_PROXY_PASSWORD")


if all([proxy_address, proxy_port, proxy_username, proxy_password]):

    proxy = (
        f"http://{proxy_username}:{proxy_password}"
        f"@{proxy_address}:{proxy_port}"
    )

    http_client = httpx.Client(
        proxy=proxy
    )
    client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        http_client=http_client
    )

else:
    client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1"
    )


app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent.parent

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:63342",
                   "https://freshfood-ai-red.vercel.app"
                   ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/scan")
@app.post("/api/scan")
async def scan_food(photo: UploadFile = File(...)):
    contents = await photo.read()

    image = Image.open(io.BytesIO(contents))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")


    text_part: ChatCompletionContentPartTextParam = {
        "type": "text",
        "text": """
    Here is a photo of a food package.

    Find the product name and expiration date.

    Rules:
    - Dates use DD.MM.YYYY unless written as YYYY-MM-DD.
    - Carefully inspect the ORIGINAL IMAGE before determining the expiration date.
    - Expiration dates may use different formats, including:
      - DD.MM.YYYY
      - DD/MM/YYYY
      - DD-MM-YYYY
      - DD MM YYYY
      - MM.DD.YYYY
      - MM/DD/YYYY
      - MM-DD-YYYY
      - YYYY.MM.DD
      - YYYY/MM/DD
      - YYYY-MM-DD
      
    - The date may also contain spaces instead of separators.
    - Determine the order of day, month, and year from the format and context on the package.
    - For example:
      - 13.10.2026 → 2026-10-13
      - 13/10/2026 → 2026-10-13
      - 13-10-2026 → 2026-10-13
      - 13 10 2026 → 2026-10-13
      - 10/13/2026 → 2026-10-13
      - 2026-10-13 → 2026-10-13
    - Do not invent or guess a date.
    
    - If a date could have more than one interpretation, use other information on the package to determine the format.
    - Prefer the date labeled EXP, EXPIRY, BEST BEFORE, or an equivalent expiration label.
    - Do not choose MFG, MANUFACTURED, or production dates.
    
    
    - Return the result as JSON in exactly this format:
        {{"name":"product name or NOT_FOUND","expirationDate":"YYYY-MM-DD or NOT_FOUND"}}
    - If you cannot identify the product name, use "NOT_FOUND" for the name.
    - If you cannot identify a clear expiration date, use "NOT_FOUND" for the expirationDate.
        
    """
    }

    image_part: ChatCompletionContentPartImageParam = {
        "type": "image_url",
        "image_url": {
            "url": f"data:image/jpeg;base64,{image_base64}"
        }
    }

    message: ChatCompletionUserMessageParam = {
        "role": "user",
        "content": [text_part, image_part]
    }

    try:
        response = client.chat.completions.create(
            model="nex-agi/nex-n2.5-pro:free", # Ling 3.0 Flash VL
            messages=[message]
        )
    except Exception as error:
        print("OpenRouter error:", error)
        raise HTTPException(
            status_code=502,
            detail="Could not connect to the AI service."
        )


    try:
        ai_result = response.choices[0].message.content.strip()
        ai_result = json.loads(ai_result)
    except (AttributeError, json.JSONDecodeError, TypeError) as error:
        print("AI response error:", error)
        raise HTTPException(
            status_code=502,
            detail="The AI returned an invalid response."
        )
    print(f"AI Result: {ai_result}")


    return {
        "message": "Photo scanned!",
        "name": ai_result["name"],
        "expirationDate": ai_result["expirationDate"]}


# Frontend files

app.mount(
    "/css",
    StaticFiles(directory=str(BASE_DIR / "css")),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(directory=str(BASE_DIR / "js")),
    name="js"
)


@app.get("/", include_in_schema=False)
async def home():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/scan.html", include_in_schema=False)
async def scan_page():
    return FileResponse(BASE_DIR / "scan.html")


@app.get("/result.html", include_in_schema=False)
async def result_page():
    return FileResponse(BASE_DIR / "result.html")


@app.get("/my-food.html", include_in_schema=False)
async def my_food_page():
    return FileResponse(BASE_DIR / "my-food.html")
