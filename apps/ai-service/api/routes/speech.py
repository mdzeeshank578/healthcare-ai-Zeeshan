import os
import tempfile
from fastapi import APIRouter, UploadFile
from speech.speech_to_text import speech_to_text

router = APIRouter()

@router.post("/speech")
async def transcribe_audio(file: UploadFile):
    suffix = os.path.splitext(file.filename or "")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        temp_path = tmp.name
        tmp.write(await file.read())

    try:
        text = speech_to_text(temp_path)
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

    return {
        "text": text,
        "transcript": text
    }