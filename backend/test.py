import os
from dotenv import load_dotenv
from openai import OpenAI

# Load env variables
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not found")

client = OpenAI(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": "Say 'OpenAI key is working'."}
        ],
        max_tokens=10
    )
    print("✅ SUCCESS:")
    print(response.choices[0].message.content)

except Exception as e:
    print("❌ FAILED:")
    print(e)
