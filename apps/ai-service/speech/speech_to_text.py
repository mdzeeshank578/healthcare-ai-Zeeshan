import os
import tempfile
import speech_recognition as sr
from pydub import AudioSegment


def speech_to_text(audio_path: str) -> str:
    recognizer = sr.Recognizer()
    wav_path = audio_path
    cleanup_temp = False

    try:
        # If not already a wav file, convert using pydub
        if not audio_path.lower().endswith(".wav"):
            sound = AudioSegment.from_file(audio_path)
            # Normalize to 16kHz mono PCM for highest recognition accuracy
            sound = sound.set_frame_rate(16000).set_channels(1)
            temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            wav_path = temp_wav.name
            temp_wav.close()
            sound.export(wav_path, format="wav")
            cleanup_temp = True

        with sr.AudioFile(wav_path) as source:
            # Adjust for ambient noise and record
            recognizer.adjust_for_ambient_noise(source, duration=0.2)
            audio = recognizer.record(source)

        # First attempt with Indian English (en-IN)
        try:
            return recognizer.recognize_google(audio, language="en-IN")
        except (sr.UnknownValueError, sr.RequestError):
            pass

        # Second attempt with Standard English (en-US)
        try:
            return recognizer.recognize_google(audio, language="en-US")
        except (sr.UnknownValueError, sr.RequestError):
            pass

        # Third attempt with Hindi (hi-IN)
        try:
            return recognizer.recognize_google(audio, language="hi-IN")
        except (sr.UnknownValueError, sr.RequestError):
            pass

        return ""
    except Exception as e:
        print(f"Speech to text error: {e}")
        return ""
    finally:
        if cleanup_temp and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass