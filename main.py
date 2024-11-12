from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles  # 추가된 부분

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# 정적 파일 제공 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    response = templates.TemplateResponse("index.html", {"request": request})
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# import pprint
# import json

# data = json.load(open('역도_0000_0009.json', encoding='utf-8'))
# print(data['elements'][0])
# pprint.pprint(data)
